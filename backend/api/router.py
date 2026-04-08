import random
import datetime
import collections
print("--- RELOADING ROUTER.PY ---")
import pandas as pd
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

import models
from database import get_db, UrbanSessionLocal, RuralSessionLocal
from api.auth import get_current_user
from ml_engine.segmentation import process_rfm_segments
from ml_engine.seasonal_advisor import SeasonalAdvisor

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

router = APIRouter()

# --- CACHE LAYER (5 Minute In-Memory) ---
DASHBOARD_CACHE = {} 

def get_cached_dashboard(user_id: int, mode: str):
    now = datetime.datetime.now()
    cache_key = (user_id, mode)
    if cache_key in DASHBOARD_CACHE:
        entry = DASHBOARD_CACHE[cache_key]
        if (now - entry['timestamp']).total_seconds() < 300: # 5 min
            return entry['data']
    return None

def set_cached_dashboard(user_id: int, data: dict, mode: str):
    DASHBOARD_CACHE[(user_id, mode)] = {
        'timestamp': datetime.datetime.now(),
        'data': data
    }

def clear_dashboard_cache(user_id: int):
    """
    Forcefully invalidates the dashboard cache for a specific user (all modes).
    """
    keys_to_del = [k for k in DASHBOARD_CACHE.keys() if k[0] == user_id]
    for k in keys_to_del:
        del DASHBOARD_CACHE[k]
    print(f"DEBUG: Dashboard Cache CLEARED for User ID: {user_id} (All Modes)")


# --- DATA INGESTION (URBAN) --- #

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), user: models.User = Depends(get_current_user)):
    if user.business_type != "urban":
        raise HTTPException(status_code=403, detail="CSV upload only supported for Urban mode.")
    
    import io
    db = UrbanSessionLocal()
    try:
        # V3 MEMORY-OPTIMIZED STREAMING PIPELINE
        # We sample the first 20KB to detect encoding without buffering the whole file
        sample = await file.read(20480) 
        await file.seek(0) # Reset pointer
        
        is_gz = file.filename and file.filename.endswith('.gz')
        
        # Detect encoding from sample
        try:
            from charset_normalizer import from_bytes
            detected = from_bytes(sample).best()
            encoding = (detected.encoding if detected else 'utf-8-sig') or 'utf-8-sig'
            print(f"DEBUG: Sample detected encoding: {encoding} (GZ: {is_gz})")
        except Exception:
            encoding = 'utf-8-sig'

        # Stream decompression + Pandas loading
        if is_gz:
            import gzip
            # We wrap the underlying file-like object directly
            stream = gzip.GzipFile(fileobj=file.file)
        else:
            stream = file.file

        try:
            # Low Memory parsing
            df = pd.read_csv(
                stream, 
                encoding=encoding, 
                low_memory=True,
                on_bad_lines='skip'
            )
        except Exception as e:
            print(f"DEBUG: Pandad stream read failed: {e}")
            raise HTTPException(status_code=400, detail=f"CSV Parsing Failed: {str(e)}")

        if df is None or df.empty:
            return {"message": "CSV is empty or could not be parsed"}
            
        print(f"DEBUG: RAW CSV Columns: {df.columns.tolist()}")

        # --- BULLETPROOF HEADER NORMALIZATION ---
        def aggressive_normalize(name):
            import re
            return re.sub(r'[^a-z0-9]', '', str(name).strip().lower())

        # Map current columns to aggressive versions
        norm_map = {aggressive_normalize(c): c for c in df.columns}
        
        # Define synonyms for the core four columns
        synonym_map = {
            'CustomerID': ['customerid', 'clientid', 'custid', 'user_id', 'contactid', 'customer_id', 'customerno', 'client_id'],
            'InvoiceDate': ['invoicedate', 'transdate', 'date', 'orderdate', 'invoice_date', 'transaction_date', 'trans_date'],
            'Quantity': ['quantity', 'qty', 'amount', 'count', 'itemcount'],
            'UnitPrice': ['unitprice', 'price', 'rate', 'unit_price', 'itemprice']
        }
        
        final_rename = {}
        for target, synonyms in synonym_map.items():
            agg_synonyms = [aggressive_normalize(s) for s in synonyms]
            for agg_col, original_col in norm_map.items():
                if agg_col in agg_synonyms:
                    final_rename[original_col] = target
                    break
        
        if final_rename:
            df = df.rename(columns=final_rename)
            print(f"DEBUG: RENAMED Columns: {df.columns.tolist()}")

        # Verify required columns exist after normalization
        required = ['CustomerID', 'InvoiceDate', 'Quantity', 'UnitPrice']
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f"Missing required columns in CSV: {', '.join(missing)}. Detected columns: {df.columns.tolist()}")
            
        # 2. Vectorized ML Engine V4
        rfm_df, best_model = process_rfm_segments(df)
        
        # Cleanup PREVIOUS data for the SAME User ID only
        db.query(models.Customer).filter(models.Customer.user_id == user.id).delete()
        db.query(models.Segment).filter(models.Segment.user_id == user.id).delete()
        db.query(models.Transaction).filter(models.Transaction.user_id == user.id, models.Transaction.business_mode == "urban").delete()
        db.commit()
        
        # --- PHASE 3: BATCH INSERT CUSTOMERS ---
        import gc
        gc.collect() # Deep clean before DB heavy lifting
        
        batch_size = 5000
        for i in range(0, len(rfm_df), batch_size):
            chunk = rfm_df.iloc[i:i + batch_size]
            cust_batch = []
            for cid, r in chunk.iterrows():
                cust_batch.append({
                    "user_id": user.id,
                    "customer_id": str(cid),
                    "recency": float(r['recency']),
                    "frequency": float(r['frequency']),
                    "monetary": float(r['monetary']),
                    "cluster_label": str(r['cluster']),
                    "segment_name": str(r['segment_name']),
                    "churn_probability": float(r['churn_probability']),
                    "clv": float(r['clv']),
                    "purchase_trend": str(r['purchase_trend']),
                    "explained_why": str(r['explained_why'])
                })
            db.bulk_insert_mappings(models.Customer, cust_batch)
            db.commit()
            del cust_batch
            gc.collect()

        # --- PHASE 4: INSERT SEGMENT AGGREGATES ---
        summary = rfm_df.groupby('segment_name').agg({
            'recency': 'mean', 'frequency': 'mean', 'monetary': 'mean'
        }).reset_index()
        
        seg_records = []
        for _, r in summary.iterrows():
            seg_records.append({
                "user_id": user.id,
                "segment_name": str(r['segment_name']),
                "total_customers": int(len(rfm_df[rfm_df['segment_name'] == r['segment_name']])),
                "avg_recency": float(r['recency']),
                "avg_frequency": float(r['frequency']),
                "avg_monetary": float(r['monetary'])
            })
        db.bulk_insert_mappings(models.Segment, seg_records)
        db.commit()
        
        # --- PHASE 5: TURBO CHUNKED TRANSACTION INSERTION ---
        # Normalize in-place to save memory
        df['user_id'] = user.id
        df['invoice_date'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
        df['quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(0).astype(int)
        df['unit_price'] = pd.to_numeric(df['UnitPrice'], errors='coerce').fillna(0).astype(float)
        df['total_price'] = df['quantity'] * df['unit_price']
        df['customer_id'] = df['CustomerID'].astype(str)
        df['is_credit'] = 0
        df['business_mode'] = "urban"

        # Direct Chunked Insertion (No monolithic records list)
        tx_batch_size = 10000
        cols_to_save = ['user_id', 'customer_id', 'invoice_date', 'quantity', 'unit_price', 'total_price', 'is_credit', 'business_mode']
        
        for i in range(0, len(df), tx_batch_size):
            chunk = df.iloc[i : i + tx_batch_size][cols_to_save]
            # Convert only this tiny chunk to dicts
            db.bulk_insert_mappings(models.Transaction, chunk.to_dict('records'))
            db.commit()
            del chunk
            if i % 50000 == 0:
                gc.collect()

        # FINAL CLEANUP
        clear_dashboard_cache(user.id)
        return {"message": f"Successfully Ingested {len(df)} records for {len(rfm_df)} customers. AI Engine Activated."}

        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ingestion Fail: {str(e)}")
    finally:
        db.close()

# --- DASHBOARD & ANALYTICS --- #

@router.get("/dashboard_data")
def get_dashboard_data(mode: Optional[str] = None, user: models.User = Depends(get_current_user)):
    # Normalize mode
    active_mode = mode or user.business_type or "urban"
    
    # 1. Check Cache (Mode-Aware)
    cached = get_cached_dashboard(user.id, active_mode)
    if cached:
        print(f"DEBUG: Returning CACHED dashboard for User:{user.id} Mode:{active_mode}")
        return cached

    print(f"DEBUG: Generating FRESH dashboard for User:{user.id} Mode:{active_mode}")
    db = RuralSessionLocal() if active_mode == "rural" else UrbanSessionLocal()
    
    try:
        if active_mode == "rural":
            q = db.query(models.Transaction).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            )
            # Use count on id to avoid distinct issues in SQLite for large sets
            total_customers_query = db.query(func.count(models.Transaction.customer_id.distinct())).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            )
            total_customers = total_customers_query.scalar() or 0
            total_revenue = db.query(func.sum(models.Transaction.total_price)).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            ).scalar() or 0
            
            health_score = 75 if total_customers > 10 else (total_customers * 7)
            transactions = q.order_by(models.Transaction.invoice_date.desc()).limit(20).all()
            
            # Credit Risk Analytics
            total_credit = db.query(func.sum(models.Transaction.total_price)).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.is_credit == 1,
                models.Transaction.business_mode == "rural"
            ).scalar() or 0
            
            high_risk = db.query(models.Transaction.customer_id).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.is_credit == 1,
                models.Transaction.business_mode == "rural"
            ).group_by(models.Transaction.customer_id).having(func.sum(models.Transaction.total_price) > 5000).count()

            credit_customers = db.query(func.count(models.Transaction.customer_id.distinct())).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.is_credit == 1,
                models.Transaction.business_mode == "rural"
            ).scalar() or 0

            result = {
                "mode": "rural",
                "has_data": total_customers > 0,
                "kpis": {
                    "total_customers": total_customers,
                    "total_revenue": total_revenue,
                    "active_customers": total_customers,
                    "health_score": health_score,
                    "total_credit": total_credit,
                    "high_risk_count": high_risk,
                    "credit_customers": credit_customers
                },
                "advisor": SeasonalAdvisor.generate_strategies(transactions, mode="rural")
            }
        else:
            # URBAN MODE: Optimized Count/Sum
            total_customers = db.query(func.count(models.Customer.id)).filter(models.Customer.user_id == user.id).scalar() or 0
            
            if total_customers == 0:
                result = {"mode": "urban", "has_data": False, "kpis": {"total_customers":0, "total_revenue":0, "health_score":0}, "advisor": []}
            else:
                total_revenue = db.query(func.sum(models.Customer.monetary)).filter(models.Customer.user_id == user.id).scalar() or 0
                active = db.query(func.count(models.Customer.id)).filter(models.Customer.user_id == user.id, models.Customer.churn_probability < 0.4).scalar() or 0
                credit_exposure = db.query(func.sum(models.Customer.credit_balance)).filter(models.Customer.user_id == user.id).scalar() or 0
                health_score = round((active / total_customers) * 100) if total_customers > 0 else 0
                
                # Fetch small sample for Advisor strategies
                tx_q = db.query(models.Transaction).filter(models.Transaction.user_id == user.id)
                transactions = tx_q.order_by(models.Transaction.invoice_date.desc()).limit(30).all()
                
                # Subset of customers for logic
                cust_subset = db.query(models.Customer).filter(models.Customer.user_id == user.id).limit(50).all()
                
                try:
                    advisor_data = SeasonalAdvisor.generate_strategies(transactions, customers=cust_subset, mode="urban")
                except Exception as e:
                    print(f"[RECOVERABLE] SeasonalAdvisor failed: {e}")
                    advisor_data = []

                result = {
                    "mode": "urban",
                    "has_data": True,
                    "kpis": {
                        "total_customers": total_customers,
                        "total_revenue": total_revenue,
                        "active_customers": active,
                        "health_score": health_score,
                        "credit_exposure": credit_exposure
                    },
                    "advisor": advisor_data
                }
        
        set_cached_dashboard(user.id, result, active_mode)
        return result
    finally:
        db.close()

@router.get("/customers")
def get_customers(search: str = "", mode: Optional[str] = None, user: models.User = Depends(get_current_user)):
    mode = mode or user.business_type
    db = RuralSessionLocal() if mode == "rural" else UrbanSessionLocal()
    try:
        if mode == "rural":
            # For Rural, aggregate stats directly from Transactions
            customers_query = db.query(
                models.Transaction.customer_id,
                func.sum(models.Transaction.total_price).label("monetary"),
                func.count(models.Transaction.id).label("frequency"),
                func.max(models.Transaction.date).label("last_seen"),
                func.sum(models.Transaction.is_credit).label("udhaar")
            ).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            )

            if search:
                customers_query = customers_query.filter(models.Transaction.customer_id.ilike(f"%{search}%"))
            
            results = customers_query.group_by(models.Transaction.customer_id).all()
            
            customer_list = []
            for r in results:
                # Recency calculation
                recency = (datetime.datetime.utcnow() - r.last_seen).days if r.last_seen else 0
                
                customer_list.append({
                    "customer_id": r.customer_id,
                    "name": r.customer_id, # Default to ID
                    "monetary": float(r.monetary or 0),
                    "frequency": int(r.frequency or 0),
                    "recency": int(recency),
                    "udhaar": int(r.udhaar or 0),
                    "segment_name": "Rural Client",
                    "churn_probability": 0.1 if int(recency) < 30 else 0.8
                })
            
            return {"customers": customer_list}
        else:
            # For Urban, use the Customer table
            query = db.query(models.Customer).filter(models.Customer.user_id == user.id)
            if search:
                query = query.filter(models.Customer.customer_id.ilike(f"%{search}%"))
            customers = query.all()
            return {"customers": customers}
    finally:
        db.close()


# --- RURAL DATA PERSISTENCE & SYNC --- #

class RuralRecord(BaseModel):
    customer: str
    amount: float
    notes: Optional[str] = None
    isCredit: bool = False
    date: str
    global_key: Optional[str] = None

class RuralSyncRequest(BaseModel):
    records: List[RuralRecord]

@router.post("/manual_entry")
def sync_rural_data(req: RuralSyncRequest, user: models.User = Depends(get_current_user)):
    """
    Saves rural transactions to the cloud.
    Allows persistence across logout/login for the same user.
    """
    if user.business_type != "rural":
        raise HTTPException(status_code=403, detail="Manual entry only for Rural mode.")
    
    db = RuralSessionLocal()
    try:
        count = 0
        for r in req.records:
            # Use global_key if provided, else customer name
            cid = r.global_key if (r.global_key and r.global_key.strip()) else r.customer
            
            # Convert ISO string to datetime
            try:
                dt = datetime.datetime.fromisoformat(r.date.replace('Z', '+00:00'))
            except:
                dt = datetime.datetime.now()

            new_tx = models.Transaction(
                user_id=user.id,
                customer_id=cid,
                amount=r.amount,
                date=dt,
                notes=r.notes,
                invoice_date=dt,
                total_price=r.amount,
                is_credit=1 if r.isCredit else 0,
                business_mode="rural"
            )
            db.add(new_tx)
            count += 1
        
        db.commit()
        
        # CLEAR CACHE to ensure immediate dashboard update
        clear_dashboard_cache(user.id)
        
        return {"message": f"Successfully synced {count} rural records."}

    except Exception as e:
        db.rollback()
        print(f"[Rural Sync Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/rural/transactions")
def get_rural_transactions(search: str = "", user: models.User = Depends(get_current_user)):
    """
    Fetches synced rural transactions for the current user.
    Enforces strict ownership: User A only sees User A's data.
    """
    if user.business_type != "rural":
        return {"transactions": []}
    
    db = RuralSessionLocal()
    try:
        query = db.query(models.Transaction).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural"
        )
        if search:
            # Search by customer name or global key (stored in customer_id)
            query = query.filter(models.Transaction.customer_id.ilike(f"%{search}%"))
        
        txs = query.order_by(models.Transaction.date.desc()).limit(100).all()
        
        return {
            "transactions": [
                {
                    "id": t.id,
                    "customer": t.customer_id,
                    "amount": t.amount,
                    "date": t.date.isoformat() if t.date else None,
                    "notes": t.notes,
                    "isCredit": bool(t.is_credit)
                } for t in txs
            ]
        }
    finally:
        db.close()

@router.put("/transactions/{tx_id}")
def update_transaction(tx_id: int, req: RuralRecord, user: models.User = Depends(get_current_user)):
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.user_id == user.id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found or unauthorized.")
        
        tx.amount = req.amount
        tx.total_price = req.amount
        tx.notes = req.notes
        tx.is_credit = 1 if req.isCredit else 0
        tx.customer_id = req.customer
        
        db.commit()
        
        # CLEAR CACHE to ensure immediate dashboard update
        clear_dashboard_cache(user.id)
        
        return {"message": "Transaction updated successfully."}

    finally:
        db.close()

@router.delete("/transactions/{tx_id}")
def delete_transaction(tx_id: int, user: models.User = Depends(get_current_user)):
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.user_id == user.id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found or unauthorized.")
        
        db.delete(tx)
        db.commit()
        
        # CLEAR CACHE to ensure immediate dashboard update
        clear_dashboard_cache(user.id)
        
        return {"message": "Transaction deleted successfully."}

    finally:
        db.close()

# --- ANALYTICS SUITE ENDPOINTS --- #

class SimulationRequest(BaseModel):
    price_change: float
    volume_change: float
    mode: str

class PredictionRequest(BaseModel):
    recency: float
    frequency: float
    monetary: float

@router.get("/analytics")
def get_analytics(user: models.User = Depends(get_current_user)):
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        if user.business_type == "rural":
            # Rural expects a flat distribution/revenue object
            txs = db.query(models.Transaction).filter(models.Transaction.user_id == user.id).all()
            return {
                "distribution": {"Sales": len(txs)},
                "revenue": {"Sales": sum(t.total_price for t in txs) if txs else 0},
                "scatter": []
            }
        else:
            # Urban ML stats
            customers = db.query(models.Customer).filter(models.Customer.user_id == user.id).all()
            if not customers:
                return {"distribution": {}, "revenue": {}, "scatter": []}
            
            distribution = {}
            revenue = {}
            scatter = []
            
            for c in customers:
                seg = c.segment_name or "Uncategorized"
                distribution[seg] = distribution.get(seg, 0) + 1
                revenue[seg] = revenue.get(seg, 0) + (c.monetary or 0)
                
                # Mock PCA for Scatter Plot using RFM logs (Standard cluster visualization)
                # Adding some jitter for better visual separation
                import random
                scatter.append({
                    "x": float(np.log1p(c.frequency or 0)) + (random.random() * 0.1),
                    "y": float(np.log1p(c.monetary or 0)) + (random.random() * 0.1),
                    "segment": seg
                })
            
            return {
                "distribution": distribution,
                "revenue": revenue,
                "scatter": scatter
            }
    finally:
        db.close()

@router.post("/simulate")
def run_simulation(req: SimulationRequest, user: models.User = Depends(get_current_user)):
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        if user.business_type == "rural":
            total_rev = db.query(func.sum(models.Transaction.total_price)).filter(models.Transaction.user_id == user.id).scalar() or 0
        else:
            total_rev = db.query(func.sum(models.Customer.monetary)).filter(models.Customer.user_id == user.id).scalar() or 0
        
        p_factor = 1 + (req.price_change / 100)
        v_factor = 1 + (req.volume_change / 100)
        new_rev = total_rev * p_factor * v_factor
        roi_pct = ((new_rev - total_rev) / total_rev * 100) if total_rev > 0 else 0
        
        # LangChain Powered Verdict
        verdict = "Steady growth model."
        if GEMINI_API_KEY:
            try:
                llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY, temperature=0.7)
                prompt = ChatPromptTemplate.from_template(
                    "You are a professional business strategist for a {mode} business. "
                    "Current Revenue: ₹{rev:,.2f}. Projected Revenue: ₹{new:,.2f}. ROI: {roi:.1f}%. "
                    "Scenario: Price change {p}%, Volume change {v}%. "
                    "Provide a one-sentence high-impact 'Strategic Verdict' for this strategy."
                )
                chain = prompt | llm
                res = chain.invoke({"mode": user.business_type, "rev": total_rev, "new": new_rev, "roi": roi_pct, "p": req.price_change, "v": req.volume_change})
                verdict = str(res.content)
            except Exception as e:
                print(f"[Simulator LLM Error] {e}")
                # Deterministic Intelligence Catch-all
                if roi_pct > 10:
                    verdict = f"High-impact growth strategy aiming for a {roi_pct:.1f}% expansion in top-line revenue."
                elif roi_pct > 0:
                    verdict = f"Sustainable enhancement plan providing a steady {roi_pct:.1f}% ROI through volume-price optimization."
                else:
                    verdict = "Conservative scenario focusing on stability and maintaining current market share."

        return {
            "roi": roi_pct,
            "recommendation": verdict,
            "current_revenue": total_rev,
            "projected_revenue": new_rev
        }
    finally:
        db.close()

@router.post("/anomaly/scan")
def scan_anomalies(user: models.User = Depends(get_current_user)):
    """
    Anomaly Radar V2: Scans for statistical and consistency anomalies.
    Powered by LangChain for 'Professional Diagnosis'.
    """
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        anomalies = []
        
        # 1. Statistical Behavioral Analysis (Urban Only)
        if user.business_type == "urban":
            # Optimized outlier search using aggregates
            stats = db.query(
                func.avg(models.Transaction.total_price),
                func.stddev(models.Transaction.total_price)
            ).filter(models.Transaction.user_id == user.id).first()
            
            if stats and stats[0] is not None and stats[1] is not None:
                mean, std = stats
                threshold = mean + (3 * std)
                outliers = db.query(models.Transaction).filter(
                    models.Transaction.user_id == user.id,
                    models.Transaction.total_price > threshold
                ).limit(5).all()
                
                if outliers:
                    anomalies.append({
                        "type": "Behavioral",
                        "title": "High-Value Outliers Detected",
                        "description": f"Found {len(outliers)} transactions significantly exceeding your average ticket size.",
                        "severity": "medium",
                        "raw_data": [f"ID {o.id}: ₹{o.total_price}" for o in outliers[:3]]
                    })

            # Check for "VIP Churn Risk"
            vips = db.query(models.Customer).filter(models.Customer.user_id == user.id, models.Customer.segment_name == "VIP", models.Customer.churn_probability > 0.6).limit(5).all()
            if vips:
                anomalies.append({
                    "type": "Behavioral",
                    "title": "VIP Fatigue Spike",
                    "description": f"{len(vips)} top-tier customers are showing sharp drops in frequency.",
                    "severity": "high",
                    "raw_data": [v.customer_id for v in vips[:3]]
                })

        # 2. Data Consistency Analysis (Both Modes)
        neg_txs = db.query(models.Transaction).filter(models.Transaction.user_id == user.id, models.Transaction.total_price < 0).count()
        if neg_txs > 0:
            anomalies.append({
                "type": "Consistency",
                "title": "Negative Revenue Records",
                "description": f"Detected {neg_txs} transactions with negative values. This may skew churn models.",
                "severity": "low",
                "raw_data": f"{neg_txs} records"
            })

        # 3. Intelligence Diagnosis (AI with Deterministic Fallback)
        for anomaly in anomalies:
            # Set initial default values
            anomaly["diagnosis"] = "Behavioral deviation detected from baseline data patterns."
            anomaly["roadmap"] = "Manual verification recommended via detailed logs."
            
            if GEMINI_API_KEY:
                try:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY, temperature=0.7)
                    prompt = ChatPromptTemplate.from_template(
                        "You are an AI Auditor for a {mode} business. Anomaly detected: {title}. "
                        "Description: {desc}. Findings: {raw}. "
                        "Provide a brief (max 20 words) 'Professional Diagnosis' and one 'Action Roadmap' step. "
                        "Format: DIAGNOSIS: [text] | ACTION: [text]"
                    )
                    chain = prompt | llm
                    res = chain.invoke({
                        "mode": user.business_type, 
                        "title": anomaly["title"], 
                        "desc": anomaly["description"], 
                        "raw": anomaly.get("raw_data", "N/A")
                    })
                    text = str(res.content)
                    
                    if "DIAGNOSIS:" in text and "ACTION:" in text:
                        parts = text.split("|")
                        anomaly["diagnosis"] = parts[0].replace("DIAGNOSIS:", "").strip()
                        anomaly["roadmap"] = parts[1].replace("ACTION:", "").strip()
                except Exception as e:
                    print(f"[Anomaly LLM Error] {e}")
                    # Fallback to smart strings if LLM fails
                    if "VIP" in anomaly["title"]:
                        anomaly["diagnosis"] = "Top-tier customer retention risk flagged based on 30-day interaction decay."
                        anomaly["roadmap"] = "Distribute exclusive discount code or loyalty incentive via Actions tab."
                    elif "Negative" in anomaly["title"]:
                        anomaly["diagnosis"] = "Accounting inconsistency - credit/return entries may be miscategorized."
                        anomaly["roadmap"] = "Validate if these are returns or data entry errors in the local ledger."
                    elif "Outlier" in anomaly["title"]:
                        anomaly["diagnosis"] = "Mathematical outlier detected in transaction volume relative to historical mean."
                        anomaly["roadmap"] = "Examine latest records for typos; verify with customer receipts."
            else:
                # No API Key - use smart strings directly
                if "VIP" in anomaly["title"]:
                    anomaly["diagnosis"] = "Top-tier customer retention risk flagged based on 30-day interaction decay."
                    anomaly["roadmap"] = "Distribute exclusive discount code or loyalty incentive via Actions tab."
                elif "Negative" in anomaly["title"]:
                    anomaly["diagnosis"] = "Accounting inconsistency - credit/return entries may be miscategorized."
                    anomaly["roadmap"] = "Validate if these are returns or data entry errors in the local ledger."

        return {"anomalies": anomalies, "status": "nominal" if not anomalies else "warning"}
    finally:
        db.close()

@router.get("/comparison")
def get_comparison(user: models.User = Depends(get_current_user)):
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        if user.business_type == "rural":
            return {"comparison": {}}
        
        segments = db.query(models.Segment).filter(models.Segment.user_id == user.id).all()
        customers = db.query(models.Customer).filter(models.Customer.user_id == user.id).all()
        
        # Group stats by segment as expected by frontend
        seg_groups = collections.defaultdict(list)
        for c in customers:
            seg_groups[c.segment_name or "Regular"].append(c)
            
        comparison = {}
        for seg, members in seg_groups.items():
            if not members: continue
            comparison[seg] = {
                "avg_value": sum(m.monetary for m in members) / len(members),
                "avg_freq": sum(m.frequency for m in members) / len(members),
                "avg_recency": sum(m.recency for m in members) / len(members)
            }
            
        return {"comparison": comparison}
    finally:
        db.close()

@router.post("/predict")
def predict_segment(req: PredictionRequest, user: models.User = Depends(get_current_user)):
    # Pure logic engine for fast UI interaction
    # (Simplified RFM heuristic based on general averages)
    score = (req.frequency * 2) + (req.monetary / 100) - (req.recency / 10)
    
    if score > 50: 
        seg = "VIP"
        action = "High-priority engagement"
        reason = "Consistent high-value behavior"
    elif score > 20: 
        seg = "Regular"
        action = "Standard loyalty program"
        reason = "Steady purchasing patterns"
    elif score > 5: 
        seg = "At Risk"
        action = "Win-back campaign"
        reason = "Declining frequency detected"
    else: 
        seg = "Low Value"
        action = "Budget monitoring"
        reason = "Minimal interaction history"
    
    return {
        "segment": seg,
        "predicted_segment": seg, # Keep for backward compatibility
        "clv_estimate": req.monetary * 1.5,
        "confidence": 0.85,
        "recommendation": {
            "action": action,
            "reason": reason
        }
    }

# Other simpler routes...
@router.post("/reset")
def reset_workspace(user: models.User = Depends(get_current_user)):
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        # Wipe EVERYTHING for this user
        db.query(models.Transaction).filter(models.Transaction.user_id == user.id).delete(synchronize_session=False)
        db.query(models.Customer).filter(models.Customer.user_id == user.id).delete(synchronize_session=False)
        db.query(models.Segment).filter(models.Segment.user_id == user.id).delete(synchronize_session=False)
        db.query(models.Action).filter(models.Action.user_id == user.id).delete(synchronize_session=False)
        db.query(models.ActionExecution).filter(models.ActionExecution.user_id == user.id).delete(synchronize_session=False)
        db.query(models.Outcome).filter(models.Outcome.user_id == user.id).delete(synchronize_session=False)
        db.query(models.ActionHistory).filter(models.ActionHistory.user_id == user.id).delete(synchronize_session=False)
        
        db.commit()
        
        # CLEAR CACHE to ensure immediate dashboard update
        clear_dashboard_cache(user.id)
        
        return {"message": "User workspace fully purged."}

    finally:
        db.close()
