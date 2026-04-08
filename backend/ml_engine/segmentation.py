import datetime

def process_rfm_segments(df_input):
    import pandas as pd
    """
    V5 Optimized Engine: Streamlined memory usage to prevent OOM on Render.
    """
    # Use direct reference to save RAM (Input df is already a short-lived temp object from router.py)
    df = df_input
    
    # --- AGGRESSIVE NORMALIZATION (Matches router.py) ---
    import re
    def agg_norm(name):
        return re.sub(r'[^a-z0-9]', '', str(name).strip().lower())

    norm_map = {agg_norm(c): c for c in df.columns}
    synonym_map = {
        'CustomerID': ['customerid', 'clientid', 'custid', 'user_id', 'contactid', 'customer_id', 'customerno', 'client_id'],
        'InvoiceDate': ['invoicedate', 'transdate', 'date', 'orderdate', 'invoice_date', 'transaction_date', 'trans_date'],
        'Quantity': ['quantity', 'qty', 'amount', 'count', 'itemcount'],
        'UnitPrice': ['unitprice', 'price', 'rate', 'unit_price', 'itemprice']
    }
    
    final_rename = {}
    for target, synonyms in synonym_map.items():
        agg_syns = [agg_norm(s) for s in synonyms]
        for agg_col, orig_col in norm_map.items():
            if agg_col in agg_syns:
                final_rename[orig_col] = target
                break
    
    if final_rename:
        df = df.rename(columns=final_rename)

    required = ['CustomerID', 'InvoiceDate', 'Quantity', 'UnitPrice']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in CSV: {', '.join(missing)}")

    df = df.dropna(subset=required).copy()
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
    df = df.dropna(subset=['InvoiceDate']) # Drop rows with invalid dates
    df['TotalPrice'] = df['Quantity'].astype(float) * df['UnitPrice'].astype(float)
    df = df[(df['Quantity'] > 0) & (df['UnitPrice'] > 0)]
    
    if df.empty:
        return pd.DataFrame(), "None"

    # 2. Vectorized RFM Aggregation
    max_date = df['InvoiceDate'].max()
    rfm = df.groupby('CustomerID').agg(
        recency=('InvoiceDate', lambda x: (max_date - x.max()).days),
        frequency=('InvoiceDate', 'count'),
        monetary=('TotalPrice', 'sum')
    )
    
    return _apply_rfm_labels(rfm), "KMeans-Fast"

def process_rural_transactions(transactions):
    """
    Bridge for Rural mode: Converts list of Transaction models/dicts into RFM DataFrame.
    """
    import pandas as pd
    if not transactions:
        return pd.DataFrame()
        
    data = []
    for t in transactions:
        # Support both object and dict
        if hasattr(t, 'customer_id'):
            data.append({
                'CustomerID': t.customer_id,
                'InvoiceDate': t.invoice_date or t.date,
                'TotalPrice': t.total_price or t.amount
            })
        else:
            data.append({
                'CustomerID': t.get('customer_id'),
                'InvoiceDate': t.get('invoice_date') or t.get('date'),
                'TotalPrice': t.get('total_price') or t.get('amount')
            })
            
    df = pd.DataFrame(data)
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    
    max_date = df['InvoiceDate'].max()
    rfm = df.groupby('CustomerID').agg(
        recency=('InvoiceDate', lambda x: (max_date - x.max()).days),
        frequency=('InvoiceDate', 'count'),
        monetary=('TotalPrice', 'sum')
    )
    
    return _apply_rfm_labels(rfm)

def _apply_rfm_labels(rfm):
    if rfm.empty:
        return rfm

    import numpy as np
    from sklearn.cluster import KMeans
    # 3. Fast Vectorized Metrics
    rfm['clv'] = rfm['monetary'] * 0.2
    rfm['purchase_trend'] = np.where(rfm['recency'] < 14, 'Up', 'Stable')

    # 4. Optimized K-Means (Standard 4 segments)
    features = rfm[['recency', 'frequency', 'monetary']].copy()
    scaled_features = np.log1p(features) 
    
    model = KMeans(n_clusters=min(len(rfm), 4), random_state=42, n_init=1)
    rfm['cluster'] = model.fit_predict(scaled_features)
    
    # 5. Vectorized Segmentation Branding
    mean_r, mean_f, mean_m = rfm['recency'].mean(), rfm['frequency'].mean(), rfm['monetary'].mean()
    
    conditions = [
        (rfm['recency'] > mean_r * 1.5),
        (rfm['monetary'] > mean_m * 1.5) & (rfm['frequency'] > mean_f),
        (rfm['frequency'] > mean_f)
    ]
    choices = ['Churn Risk', 'VIP', 'Regular']
    rfm['segment_name'] = np.select(conditions, choices, default='Low Value')
    
    # 6. Vectorized Explanation Generation
    r_desc = np.where(rfm['recency'] < 30, "recent active shopping", "longer inactivity")
    f_desc = np.where(rfm['frequency'] > mean_f, "high visit frequency", "low frequency")
    m_desc = np.where(rfm['monetary'] > mean_m, "above-average spending", "standard budget")
    
    rfm['explained_why'] = (
        "Classified as " + rfm['segment_name'] + 
        " due to " + r_desc + ", " + f_desc + " and " + m_desc + "."
    )
    
    max_r = max(rfm['recency'].max(), 1)
    rfm['churn_probability'] = (rfm['recency'] / max_r).clip(0, 1)

    return rfm

# Backward compatibility aliases
process_raw_transactions = process_rfm_segments
segment_customers = process_rfm_segments
