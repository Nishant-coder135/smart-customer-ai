from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from pydantic import BaseModel
from database import UrbanSessionLocal, RuralSessionLocal
from api.auth import get_current_user
import models
import os
import datetime
from ml_engine.seasonal_advisor import SeasonalAdvisor, get_upcoming_festivals
from ml_engine.decision_engine import DecisionEngine, generate_daily_actions, get_quick_business_snapshot
from ml_engine.segmentation import process_rural_transactions

# Check for API Keys - quietly, no WARNING spam
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")


class DBChatMessageHistory:
    """Custom LangChain-compatible history that persists to our SQLAlchemy ChatMessage model."""
    def __init__(self, user_id: int, session_factory):
        self.user_id = user_id
        self.session_factory = session_factory

    @property
    def messages(self) -> List:
        db = self.session_factory()
        try:
            db_msgs = db.query(models.ChatMessage).filter(
                models.ChatMessage.user_id == self.user_id
            ).order_by(models.ChatMessage.created_at.desc()).limit(20).all()

            from langchain_core.messages import HumanMessage, AIMessage
            lc_msgs = []
            for m in reversed(db_msgs):
                if m.role == "assistant":
                    lc_msgs.append(AIMessage(content=m.content))
                else:
                    lc_msgs.append(HumanMessage(content=m.content))
            return lc_msgs
        except ImportError:
            return []
        finally:
            db.close()

    def add_message(self, message) -> None:
        db = self.session_factory()
        try:
            role = "assistant" if message.__class__.__name__ == "AIMessage" else "user"
            new_msg = models.ChatMessage(
                user_id=self.user_id,
                role=role,
                content=str(message.content)
            )
            db.add(new_msg)
            db.commit()
        finally:
            db.close()

    def clear(self) -> None:
        db = self.session_factory()
        try:
            db.query(models.ChatMessage).filter(models.ChatMessage.user_id == self.user_id).delete()
            db.commit()
        finally:
            db.close()


router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class AdvisorRequest(BaseModel):
    messages: List[ChatMessage]

# --- ADVISOR CACHE ---
SYSTEM_PROMPT_CACHE = {}

def get_cached_prompt(user_id: int):
    now = datetime.datetime.now()
    if user_id in SYSTEM_PROMPT_CACHE:
        entry = SYSTEM_PROMPT_CACHE[user_id]
        if (now - entry['timestamp']).total_seconds() < 600: # 10 min
            return entry['prompt']
    return None

def set_cached_prompt(user_id: int, prompt: str):
    SYSTEM_PROMPT_CACHE[user_id] = {
        'timestamp': datetime.datetime.now(),
        'prompt': prompt
    }


def _build_system_prompt(user: models.User, db) -> str:
    """Build a premium, data-aware system prompt using optimized DB queries."""
    if user.business_type == "rural":
        # Fast counts and sums
        customers_count = db.query(models.Transaction.customer_id).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural"
        ).distinct().count()

        tx_count = db.query(models.Transaction).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural"
        ).count()

        total_rev = db.query(func.sum(models.Transaction.total_price)).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural"
        ).scalar() or 0

        # Segment Synthesis (Small sample for prompt)
        txs_sample = db.query(models.Transaction).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural"
        ).limit(100).all()

        seg_summary = "No segments yet."
        top_action = "General engagement"

        if txs_sample:
            rfm_df = process_rural_transactions(txs_sample)
            s_counts = rfm_df['segment_name'].value_counts()
            seg_list = [f"{name} ({count})" for name, count in s_counts.items()]
            seg_summary = "; ".join(seg_list)

            cust_dicts = []
            for cid, r in rfm_df.head(10).iterrows(): # Only top 10 for action logic
                cust_dicts.append({
                    "customer_id": str(cid), "recency": float(r['recency']),
                    "monetary": float(r['monetary']), "frequency": float(r['frequency']),
                    "churn_probability": float(r['churn_probability']), "clv": float(r['clv']),
                    "segment_name": str(r['segment_name'])
                })
            actions = generate_daily_actions(cust_dicts)
            if actions:
                top_action = f"{actions[0]['action_text']} for {actions[0]['target_segment']}"

        upcoming = get_upcoming_festivals(n=2)
        fest_context = ", ".join([f"{f['name']} ({f['date']})" for f in upcoming]) or "No immediate festivals."

        return (
            f"Role: You are SmartCustomer AI, a professional yet friendly business partner for a RURAL Indian enterprise. "
            f"Business: {customers_count} customers, {tx_count} txs, Total ₹{total_rev:,.0f}. "
            f"Segments: {seg_summary}. "
            f"Festivals: {fest_context}. "
            f"Suggested Action: {top_action}. "
            f"Guidelines: Detailed, polite, use **bold** and ₹. Goal: Deep interactive consulting. "
            f"Navigation: If you recommend a specific feature, use [[TAB:ACTIONS]], [[TAB:DATA]], or [[TAB:DASH]] to link them."
        )
    else:
        # URBAN MODE: Optimized
        customers_count = db.query(func.count(models.Customer.id)).filter(models.Customer.user_id == user.id).scalar() or 0
        total_rev = db.query(func.sum(models.Customer.monetary)).filter(models.Customer.user_id == user.id).scalar() or 0

        segments = db.query(models.Segment).filter(models.Segment.user_id == user.id).all()
        seg_summary = "; ".join([f"{s.segment_name} ({s.total_customers})" for s in segments]) or "No segments yet."

        # High-Risk VIPS for prompt context
        vips_count = db.query(models.Customer).filter(models.Customer.user_id == user.id, models.Customer.segment_name == "VIP", models.Customer.churn_probability > 0.5).count()

        upcoming = get_upcoming_festivals(n=2)
        fest_context = ", ".join([f"{f['name']} ({f['date']})" for f in upcoming]) or "No immediate festivals."

        return (
            f"Role: You are SmartCustomer AI, a high-end business consultant for an URBAN enterprise. "
            f"Context: {customers_count} customers, revenue ₹{total_rev:,.0f}. "
            f"Segments: {seg_summary}. "
            f"Alert: {vips_count} VIPs at churn risk. "
            f"Festive: {fest_context}. "
            f"Guidelines: Professional, data-driven, thorough. Use **bold** for metrics. Use ₹. "
            f"Navigation: If you recommend a specific feature, use [[TAB:ACTIONS]] or [[TAB:DASH]] to link them."
        )

@router.get("/history", response_model=List[ChatMessage])
def get_chat_history(user: models.User = Depends(get_current_user)):
    """Retrieves the last 20 chat messages for the authenticated user from the database."""
    db = RuralSessionLocal() if user.business_type == "rural" else UrbanSessionLocal()
    try:
        messages = db.query(models.ChatMessage).filter(
            models.ChatMessage.user_id == user.id
        ).order_by(models.ChatMessage.created_at.desc()).limit(20).all()
        # Return in chronological order
        return [{"role": m.role, "content": m.content} for m in reversed(messages)]
    finally:
        db.close()

@router.post("/chat")
def advisor_chat(req: AdvisorRequest, user: models.User = Depends(get_current_user)):
    """
    Multi-Provider AI Advisor: Gemini 2.0 -> Groq (Llama 3) -> Internal Snapshot.
    """
    session_factory = RuralSessionLocal if user.business_type == "rural" else UrbanSessionLocal
    db = session_factory()

    last_user_message = req.messages[-1].content if req.messages else ""
    if not last_user_message:
        return {"reply": "I'm listening! What's on your mind today?"}

    # 1. Try Gemini 2.0 (High Reasoning) - lazy import only when needed
    if GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=GEMINI_API_KEY,
                temperature=0.7,
                max_output_tokens=1024
            )
            return run_ai_chain(llm, user, db, last_user_message, session_factory)
        except Exception as e:
            print(f"[Gemini Failure] {e}. Falling back to Groq...")

    # 2. Try Groq (High Speed Fallback) - lazy import only when needed
    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                groq_api_key=GROQ_API_KEY,
                temperature=0.6,
                max_tokens=1024
            )
            return run_ai_chain(llm, user, db, last_user_message, session_factory)
        except Exception as e:
            print(f"[Groq Failure] {e}. Falling back to Internal Snapshot...")

    # 3. Final Deterministic Fallback (Internal Strategist)
    return run_internal_fallback(user, db)

def run_ai_chain(llm, user, db, user_input, session_factory):
    """LangChain execution logic wrapped for reuse across providers."""
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.runnables.history import RunnableWithMessageHistory

    system_prompt = get_cached_prompt(user.id)
    if not system_prompt:
        system_prompt = _build_system_prompt(user, db)
        set_cached_prompt(user.id, system_prompt)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    chain = prompt | llm
    chain_with_history = RunnableWithMessageHistory(
        chain,
        lambda session_id: DBChatMessageHistory(user.id, session_factory),
        input_messages_key="input",
        history_messages_key="history",
    )

    response = chain_with_history.invoke(
        {"input": user_input},
        config={"configurable": {"session_id": str(user.id)}}
    )
    return {"reply": str(response.content)}

def run_internal_fallback(user, db):
    """Bulletproof data-driven fallback when AI APIs are unavailable."""
    try:
        if user.business_type == "rural":
            # Rural uses Transaction table
            txs = db.query(models.Transaction).filter(models.Transaction.user_id == user.id, models.Transaction.business_mode == "rural").all()
            if not txs:
                return {"reply": "Internal Strategist: Welcome! I don't see any rural transactions yet. Please go to the [[TAB:DATA]] tab to record your first sale."}

            total_rev = sum(t.total_price for t in txs if t.total_price)
            cust_count = len(set(t.customer_id for t in txs))
            return {"reply": f"Partner, I'm currently running on internal data. **Rural Snapshot**: {cust_count} Customers served, total revenue ₹{total_rev:,.0f}. I recommend syncing your records in the [[TAB:DATA]] tab for deeper insights."}
        else:
            # Urban uses Customer table (segmentation already run)
            customers = db.query(models.Customer).filter(models.Customer.user_id == user.id).all()
            cust_list = [{"id": c.id, "monetary": float(c.monetary or 0), "churn_probability": float(c.churn_probability or 0), "segment_name": str(c.segment_name or "General")} for c in customers]

            snap = get_quick_business_snapshot(cust_list)
            return {"reply": f"Internal Advisor active. Your **Urban Base** of {snap['total_customers']} customers shows a **{snap['primary_opportunity']}** opportunity. Avg Churn Risk: {snap['avg_churn_risk']}. I recommend checking the [[TAB:ACTIONS]] for prioritized tasks."}
    except Exception as e:
        print(f"[Internal Fallback Error] {e}")
        return {"reply": "I'm currently maintaining your customer data models. Your business data is safe! Please check the **Actions tab** for your daily priorities."}
    finally:
        db.close()
