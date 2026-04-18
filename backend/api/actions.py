from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db, UrbanSessionLocal, RuralSessionLocal
from backend import models
from backend.ml_engine.decision_engine import generate_daily_actions
from backend.ml_engine.segmentation import process_rural_transactions
from backend.api.auth import get_current_user
from pydantic import BaseModel
import urllib.parse
import os
import datetime
from sqlalchemy import func

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# In-memory cache for actions
ACTIONS_CACHE = {} 
CACHE_EXPIRY = 600 # 10 minutes

router = APIRouter()

class ExecuteActionRequest(BaseModel):
    action_id: int
    channel: str # 'whatsapp' or 'sms'

class LogOutcomeRequest(BaseModel):
    action_id: int
    actual_revenue: float
    actual_retention: float
    response_rate: float

def _generate_pitch_and_template(action_text: str, segment: str, business_type: str):
    """Uses LangChain to generate a professional explanation and a message template."""
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        return "Strategic business move.", f"Special offer on {action_text} for you!"

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.prompts import ChatPromptTemplate
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY, temperature=0.7)
        prompt = ChatPromptTemplate.from_template(
            "You are a professional business consultant for a {mode} Indian business. "
            "The system suggests this action: '{action}' for the '{segment}' customer segment. "
            "1. Generate a brief (1 sentence) 'Pitch' explaining why this move is strategically sound. "
            "2. Generate a friendly, professional 'Template' message for WhatsApp/SMS to the customer. "
            "Format: PITCH: [pitch] | TEMPLATE: [template]"
        )
        chain = prompt | llm
        res = chain.invoke({"mode": business_type, "action": action_text, "segment": segment})
        text = str(res.content)
        
        pitch = "Strategic move based on behavior."
        template = f"Hi! We have a special offer on {action_text} just for you."
        
        if "PITCH:" in text and "TEMPLATE:" in text:
            parts = text.split("|")
            pitch = parts[0].replace("PITCH:", "").strip()
            template = parts[1].replace("TEMPLATE:", "").strip()
            
        return pitch, template
    except Exception as e:
        print(f"[LangChain Action Error] {e}")
        return "Strategic business move.", f"Hello! Check out our new {action_text}."

@router.get("/today")
def get_todays_actions(user: models.User = Depends(get_current_user)):
    """
    Returns the top 3-4 daily actions the user should take today.
    Saves them to the database to track execution.
    """
    # 1. Global Cache Check
    cache_key = f"actions_{user.id}_{user.business_type}"
    now = datetime.datetime.now()
    if cache_key in ACTIONS_CACHE:
        timestamp, data = ACTIONS_CACHE[cache_key]
        if (now - timestamp).total_seconds() < CACHE_EXPIRY:
            print(f"[CACHE HIT] Returning cached actions for user {user.id}")
            return data

    # Select DB based on user's mode
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    
    try:
        cust_dicts = []
        if user.business_type == "rural":
            # RURAL MODE: Optimize by taking only recent transactions
            txs = db.query(models.Transaction).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            ).order_by(models.Transaction.date.desc()).limit(1000).all()
            
            if not txs:
                return {"actions": [], "message": "Add transactions to see smart actions."}
                
            rfm_df = process_rural_transactions(txs)
            
            # Map high credit customers from txs
            credit_map = {}
            for t in txs:
                if t.is_credit:
                    credit_map[t.customer_id] = credit_map.get(t.customer_id, 0) + (t.total_price or t.amount)

            for cid, r in rfm_df.iterrows():
                bal = credit_map.get(str(cid), 0.0)
                cust_dicts.append({
                    "customer_id": str(cid),
                    "recency": float(r['recency']),
                    "frequency": float(r['frequency']),
                    "monetary": float(r['monetary']),
                    "churn_probability": float(r['churn_probability']),
                    "clv": float(r['clv']),
                    "segment_name": str(r['segment_name']),
                    "credit_balance": bal,
                    "is_high_credit": bal > 2000 # Configurable threshold for Rural
                })
        else:
            # URBAN MODE: Sampling 500 customers instead of full table scan for faster processing
            customers = db.query(models.Customer).filter(models.Customer.user_id == user.id).limit(500).all()
            for c in customers:
                cust_dicts.append({
                    "customer_id": c.customer_id,
                    "recency": c.recency,
                    "frequency": c.frequency,
                    "monetary": c.monetary,
                    "churn_probability": c.churn_probability,
                    "clv": c.clv,
                    "segment_name": c.segment_name,
                    "credit_balance": c.credit_balance or 0.0,
                    "is_high_credit": (c.credit_balance or 0.0) > 5000 # Higher threshold for Urban
                })
            
        # Calculate historical multipliers from past outcomes
        historical_multipliers = {}
        completed_actions = db.query(models.Action, models.Outcome).join(
            models.Outcome, models.Action.id == models.Outcome.action_id
        ).filter(models.Action.user_id == user.id).all()
        
        stats = {}
        for act, out in completed_actions:
            if act.action_text not in stats:
                stats[act.action_text] = []
            # Calculate simple success ratio, capped heavily so it doesn't break scores
            ratio = (out.actual_revenue / act.expected_revenue) if act.expected_revenue > 0 else 1.0
            stats[act.action_text].append(ratio)
            
        for text, ratios in stats.items():
            avg_ratio = sum(ratios) / len(ratios)
            multiplier = max(0.5, min(1.5, avg_ratio)) # Cap multiplier between 0.5x and 1.5x
            historical_multipliers[text] = multiplier

        # FETCH RECENT ACTIONS FROM DB (including those saved by Multi-Agent Advisor)
        db_actions = db.query(models.Action).filter(
            models.Action.user_id == user.id,
            models.Action.status == "pending"
        ).order_by(models.Action.created_at.desc()).limit(15).all()
        
        final_actions = []
        for action in db_actions:
            final_actions.append({
                "id": action.id,
                "title": action.title or action.action_text[:30],
                "action_text": action.action_text,
                "target_segment": action.target_segment,
                "reason": action.reason or "Strategic recommendation",
                "explanation": action.pitch or "AI generated business tactic.",
                "priority": action.priority or "medium",
                "status": action.status or "pending",
                "expected_revenue": action.expected_revenue,
                "expected_retention": action.expected_retention,
                "confidence_score": action.confidence_score
            })
            
        # If we have no recent actions, trigger the decision engine fallback
        if not final_actions:
            # Call Decision Engine
            daily_actions = generate_daily_actions(cust_dicts, historical_multipliers)
            
            for act in daily_actions:
                new_action = models.Action(
                    user_id=user.id,
                    title=act.get("title", f"Plan for {act['target_segment']}"),
                    action_text=act["action_text"],
                    target_segment=act["target_segment"],
                    reason=act["reason"],
                    expected_revenue=act["expected_revenue"],
                    expected_retention=act["expected_retention"],
                    confidence_score=act["confidence_score"],
                    priority="medium",
                    status="pending"
                )
                db.add(new_action)
                db.commit()
                db.refresh(new_action)
                
                # Fetch pitch/template
                pitch, template = _generate_pitch_and_template(new_action.action_text, new_action.target_segment, user.business_type)
                new_action.pitch = pitch
                new_action.template = template
                db.add(new_action)
                db.commit()
                
                final_actions.append({
                    "id": new_action.id,
                    "title": new_action.title,
                    "action_text": new_action.action_text,
                    "target_segment": new_action.target_segment,
                    "reason": new_action.reason,
                    "explanation": new_action.pitch,
                    "priority": new_action.priority,
                    "status": new_action.status,
                    "expected_revenue": new_action.expected_revenue,
                    "expected_retention": new_action.expected_retention,
                    "confidence_score": new_action.confidence_score
                })
            
        final_response = {"actions": final_actions}
        # Update in-memory cache
        ACTIONS_CACHE[cache_key] = (now, final_response)
        return final_response
    finally:
        db.close()


@router.post("/execute")
def execute_action(req: ExecuteActionRequest, user: models.User = Depends(get_current_user)):
    """
    Executes a specific action via the requested channel and logs it.
    Generates practical deep links (wa.me / sms) for the frontend to actually execute on mobile.
    """
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    
    try:
        action = db.query(models.Action).filter(
            models.Action.id == req.action_id,
            models.Action.user_id == user.id
        ).first()
        if not action:
            raise HTTPException(status_code=404, detail="Action not found")
            
        # Log Execution
        execution = models.ActionExecution(
            user_id=user.id,
            action_id=action.id,
            channel=req.channel
        )
        db.add(execution)
        db.commit()
        
        # Use DB-cached template if available, otherwise generate
        if action.template:
            template = action.template
        else:
            _, template = _generate_pitch_and_template(action.action_text, action.target_segment, user.business_type)
            action.template = template
            db.add(action)
            db.commit()

        msg_encoded = urllib.parse.quote(template)
        
        if req.channel == "whatsapp":
            link = f"https://wa.me/?text={msg_encoded}"
        else:
            link = f"sms:?body={msg_encoded}"
            
        return {
            "message": "Action execution logged successfully.",
            "launch_url": link
        }
    finally:
        db.close()


@router.post("/outcome")
def log_action_outcome(req: LogOutcomeRequest, user: models.User = Depends(get_current_user)):
    """
    Step 4 of ML Pipeline (Learning loop).
    Takes actual outcome from an executed action to adjust future confidence rating.
    """
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        action = db.query(models.Action).filter(
            models.Action.id == req.action_id,
            models.Action.user_id == user.id
        ).first()
        
        if not action:
            raise HTTPException(status_code=404, detail="Action not found")
            
        new_outcome = models.Outcome(
            user_id=user.id,
            action_id=action.id,
            actual_revenue=req.actual_revenue,
            actual_retention=req.actual_retention,
            response_rate=req.response_rate
        )
        db.add(new_outcome)
        db.commit()
        
        return {"message": "Outcome logged and system recalibrated"}
    finally:
        db.close()
