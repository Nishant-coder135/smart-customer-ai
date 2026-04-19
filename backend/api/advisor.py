import os
import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from pydantic import BaseModel
from backend.database import UrbanSessionLocal, RuralSessionLocal
from backend.api.auth import get_current_user
from backend import models
from backend.ml_engine.seasonal_advisor import SeasonalAdvisor, get_upcoming_festivals
from backend.ml_engine.decision_engine import DecisionEngine, generate_daily_actions, get_quick_business_snapshot
from backend.ml_engine.segmentation import process_rural_transactions
from backend.ml_engine.agent_orchestrator import get_agent_orchestrator

# Check for API Keys - quietly, no WARNING spam
# Moved to lazy loading inside functions


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


def _get_business_snapshot(user: models.User, db) -> str:
    """Generates a detailed business snapshot string for the multi-agent advisor."""
    if user.business_type == "rural":
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

        credit_total = db.query(func.sum(models.Transaction.total_price)).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural",
            models.Transaction.is_credit == 1
        ).scalar() or 0

        # Segment Summary
        txs_sample = db.query(models.Transaction).filter(
            models.Transaction.user_id == user.id,
            models.Transaction.business_mode == "rural"
        ).limit(100).all()

        seg_summary = "No segments yet."
        if txs_sample:
            rfm_df = process_rural_transactions(txs_sample)
            s_counts = rfm_df['segment_name'].value_counts()
            seg_list = [f"{name} ({count})" for name, count in s_counts.items()]
            seg_summary = "; ".join(seg_list)

        upcoming = get_upcoming_festivals(n=2)
        fest_context = ", ".join([f"{f['name']} ({f['date']})" for f in upcoming]) or "No immediate festivals."
        
        avg_tx = total_rev / tx_count if tx_count > 0 else 0
        credit_ratio = (credit_total / total_rev * 100) if total_rev > 0 else 0
        
        return f"RURAL MODE: {customers_count} customers, {tx_count} transactions, Total Revenue ₹{total_rev:,.0f}. Avg Ticket: ₹{avg_tx:,.0f}, Credit Ratio: {credit_ratio:.1f}%. Segments: {seg_summary}. Festivals: {fest_context}."
    else:
        customers_count = db.query(func.count(models.Customer.id)).filter(models.Customer.user_id == user.id).scalar() or 0
        total_rev = db.query(func.sum(models.Customer.monetary)).filter(models.Customer.user_id == user.id).scalar() or 0
        segments = db.query(models.Segment).filter(models.Segment.user_id == user.id).all()
        seg_summary = "; ".join([f"{s.segment_name} ({s.total_customers})" for s in segments]) or "No segments yet."

        upcoming = get_upcoming_festivals(n=2)
        fest_context = ", ".join([f"{f['name']} ({f['date']})" for f in upcoming]) or "No immediate festivals."

        avg_rev = total_rev / customers_count if customers_count > 0 else 0
        return f"URBAN MODE: {customers_count} customers, total revenue ₹{total_rev:,.0f}, ARPU: ₹{avg_rev:,.0f}. Segments: {seg_summary}. Festivals: {fest_context}."


def extract_and_save_actions(text: str, user_id: int, db):
    """Parses JSON actions from the advisor and persists them to the DB."""
    from backend.ml_engine.agent_orchestrator import AgentOrchestrator
    
    actions_data = AgentOrchestrator.extract_actions_json(text)
    if not actions_data:
        return 0
    
    count = 0
    for item in actions_data:
        try:
            new_action = models.Action(
                user_id=user_id,
                title=item.get("title", "Strategic Action"),
                action_text=item.get("action_text", ""),
                target_segment=item.get("target_segment", "General"),
                priority=item.get("priority", "medium"),
                expected_revenue=item.get("expected_revenue", 0.0),
                expected_retention=item.get("expected_retention", 0.0),
                confidence_score=item.get("confidence_score", 0.0),
                status="pending"
            )
            db.add(new_action)
            count += 1
        except Exception as e:
            print(f"DEBUG: Failed to save individual action: {e}")
            
    if count > 0:
        db.commit()
    return count


def _build_system_prompt(user: models.User, db) -> str:
    """Build an elite, detailed system prompt that forces professional business advisory."""
    snapshot = _get_business_snapshot(user, db)
    mode = user.business_type.upper()
    nav = (
        "Use [[TAB:ACTIONS]] for tasks/actions, [[TAB:DATA]] for records, [[TAB:DASH]] for dashboard, "
        "[[TAB:CLIENTS]] for customers, [[TAB:ANALYTICS]] for deep analytics."
    )

    return f"""You are **SmartCustomer AI** — a World-Class Business Strategist and Virtual COO. You are the digital double of a top-tier retail consultant.

## OPERATIONAL BRAIN
Business Mode: **{mode}**
Current Intelligence Snapshot: {snapshot}

## YOUR COMMANDMENTS
1. **NO GENERIC ADVICE.** Every word must be specific to the user's {mode} business.
2. **THE 6-PARAGRAPH RULE.** Every answer must be a multi-paragraph, deep-dive report. Minimum 500 words per major query.
3. **DATA-FIRST REASONING.** Reference their customer count, revenue total, and segments manually in every strategic suggestion.
4. **PROFESSIONAL TONE.** Speak like an executive. Be warm but authoritative.
5. **ACTIONABLE TACTICS.** Do not just say "improve marketing." Say "Launch a WhatsApp broadcast to your 50 VIPs today with a 15% discount code valid for 48 hours."

## REPORT STRUCTURE
Always use this structure for major questions:
- **Executive Summary**: 1 paragraph overview.
- **Data Analysis**: How their current numbers inform this strategy.
- **Immediate Action Plan**: 3-5 specific, numbered steps.
- **Expected ROI**: Professional projection of results.
- **Navigation Guidance**: {nav}

## FESTIVAL SPECIALIZATION
For festivals, you are the master of inventory and timing. Provide a day-by-day countdown (D-14 to D-Day) for stock preparations and marketing.

You are NOT an assistant. You are a STRATEGIST. Give them the blueprint to double their revenue."""


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
async def advisor_chat(req: AdvisorRequest, user: models.User = Depends(get_current_user)):
    """
    AI Advisor: Groq llama-3.3-70b (primary, confirmed working) -> Gemini (if quota available) -> Internal Fallback.
    NOTE: Gemini free-tier quota is exhausted, so Groq is the reliable primary.
    """
    session_factory = RuralSessionLocal if user.business_type == "rural" else UrbanSessionLocal
    db = session_factory()

    last_user_message = req.messages[-1].content if req.messages else ""
    if not last_user_message:
        return {"reply": "I'm listening! What's on your mind today?"}

    system_prompt = _build_system_prompt(user, db)

    # Build conversation history for context (last 10 messages)
    history_messages = []
    for msg in req.messages[:-1][-10:]:
        history_messages.append({
            "role": "user" if msg.role == "user" else "assistant",
            "content": msg.content
        })

    # Render Environment Check
    groq_key = os.environ.get("GROQ_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if not groq_key and not gemini_key:
        print("[Advisor] FATAL: No AI API keys configured.")
        return {"reply": "⚠️ **Configuration Missing**\n\nThe AI Advisor cannot function because the `GROQ_API_KEY` is not set in your Render environment variables. \n\nPlease go to your Render Dashboard -> Environment, and add `GROQ_API_KEY` to enable AI intelligence."}

    # --- PRIMARY: Native Groq SDK (confirmed working, free, fast) ---
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)

            messages_payload = [{"role": "system", "content": system_prompt}]
            messages_payload.extend(history_messages)
            messages_payload.append({"role": "user", "content": last_user_message})

            print(f"[Advisor] Calling Groq for user {user.id}: '{last_user_message[:60]}...'")
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages_payload,
                temperature=0.75,
                max_tokens=4096,
            )
            reply_text = response.choices[0].message.content.strip()
            print(f"[Advisor] Groq responded ({len(reply_text)} chars). SUCCESS.")

            if reply_text:
                # Persist chat to DB
                try:
                    db2 = session_factory()
                    db2.add(models.ChatMessage(user_id=user.id, role="user", content=last_user_message))
                    db2.add(models.ChatMessage(user_id=user.id, role="assistant", content=reply_text))
                    db2.commit()
                    db2.close()
                except Exception as save_err:
                    print(f"[Advisor] History save warning (non-fatal): {save_err}")

                db.close()
                return {"reply": reply_text}
        except Exception as e:
            print(f"[Groq PRIMARY Failure] {type(e).__name__}: {e}")

    # --- SECONDARY: Native Gemini SDK (may hit 429 quota) ---
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            from google import genai
            from google.genai import types as genai_types

            client = genai.Client(api_key=gemini_key)
            genai_history = []
            for msg in history_messages:
                role = "user" if msg["role"] == "user" else "model"
                genai_history.append(genai_types.Content(role=role, parts=[genai_types.Part(text=msg["content"])]))

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=genai_history + [
                    genai_types.Content(role="user", parts=[genai_types.Part(text=last_user_message)])
                ],
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.75,
                    max_output_tokens=4096,
                )
            )
            reply_text = response.text.strip() if response.text else ""
            if reply_text:
                try:
                    db2 = session_factory()
                    db2.add(models.ChatMessage(user_id=user.id, role="user", content=last_user_message))
                    db2.add(models.ChatMessage(user_id=user.id, role="assistant", content=reply_text))
                    db2.commit()
                    db2.close()
                except Exception:
                    pass
                db.close()
                return {"reply": reply_text}
        except Exception as e:
            print(f"[Gemini SECONDARY Failure] {type(e).__name__}: {e}")

    # --- FINAL: Keyword-based deterministic fallback ---
    print(f"[Advisor] ALL AI providers failed for user {user.id}. Using internal fallback.")
    
    fallback_response = run_internal_fallback(user, db, last_user_message)
    
    # If we fell back and the Groq key is explicitly missing from Render, tell the user!
    if not groq_key:
        warning_msg = "⚠️ **ACTION REQUIRED:** Your full AI intelligence is paused because `GROQ_API_KEY` is missing from your **Render Dashboard Environment**. Please add it to unlock advanced reasoning, otherwise I am operating in basic template mode.\n\n---\n\n"
        fallback_response["reply"] = warning_msg + fallback_response["reply"]
        
    return fallback_response



def run_ai_chain(llm, user, db, user_input, session_factory):
    """LangChain execution logic — builds a rich, data-aware system prompt and invokes the LLM with chat history."""
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.runnables.history import RunnableWithMessageHistory

    system_prompt = _build_system_prompt(user, db)

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

    reply_text = str(response.content).strip()
    # Strip any residual thinking tags from models that emit them
    import re
    reply_text = re.sub(r'<think>[\s\S]*?</think>', '', reply_text, flags=re.IGNORECASE).strip()

    return {"reply": reply_text}

def run_internal_fallback(user, db, user_question: str = ""):
    """
    Rich keyword-aware fallback when AI APIs are unavailable.
    """
    q = user_question.lower()
    try:
        if user.business_type == "rural":
            txs = db.query(models.Transaction).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            ).all()
            
            total_rev = sum(t.total_price or 0 for t in txs) if txs else 0
            cust_count = len(set(t.customer_id for t in txs)) if txs else 0
            credit_total = sum(t.total_price or 0 for t in txs if t.is_credit) if txs else 0
            avg_ticket = total_rev / len(txs) if txs else 0

            # Keyword routing for specific questions
            if any(k in q for k in ["churn", "win back", "losing", "inactive", "lost", "risk"]):
                return {"reply": (
                    f"## 🏆 Strategic Churn Mitigation Plan\n\n"
                    f"**Internal Business Audit:** You currently support **{cust_count} customers** with a total revenue of **₹{total_rev:,.0f}**. Based on recent rural activity, re-engaging inactive customers is your fastest path to profit.\n\n"
                    f"### 1. Executive Opportunity Analysis\n"
                    f"In rural markets, churn is rarely accidental — it is usually due to a lack of personal touch or a competitor offering better credit. At your average ticket price of **₹{avg_ticket:,.0f}**, losing just 5 VIPs costs you **₹{int(avg_ticket*15):,}** annually.\n\n"
                    f"### 2. Immediate Tactical Roadmap\n"
                    f"- **The Personal Call Initiative**: Select the top 10 customers who haven't visited in 30 days. Call them personally. In rural India, a voice call from the owner has a 75% higher success rate than any automated message.\n"
                    f"- **Credit Limit Re-activation**: Offer a one-time 'Welcome Back' credit window of ₹{int(avg_ticket*2):,} specifically for high-value dormant customers.\n"
                    f"- **Festival Early-Bird**: With upcoming festivals on the horizon, notify them *now* that you are stocking their favorite items specifically for them.\n\n"
                    f"### 3. Expected Revenue Impact\n"
                    f"Successfully recovering 20% of your dormant base would inject an estimated **₹{int(total_rev*0.08):,}** back into your monthly cash flow.\n\n"
                    f"**Next Step**: View your prioritized customer risk list here → **[[TAB:CLIENTS]]**"
                )}

            elif any(k in q for k in ["revenue", "sales", "income", "grow", "profit"]):
                return {"reply": (
                    f"## 🚀 Exponential Revenue Playbook\n\n"
                    f"**Performance Benchmark:** Your business is currently generating **₹{total_rev:,.0f}** with a credit exposure of **₹{credit_total:,.0f}**. To scale, we must optimize your transaction quality.\n\n"
                    f"### Phase 1: Ticket Size Optimization\n"
                    f"Your average transaction is **₹{avg_ticket:,.0f}**. By implementing a 'Bundle of 3' strategy for fast-moving items, we can realistically push this to **₹{int(avg_ticket*1.25):,}**. \n\n"
                    f"### Phase 2: Credit Recovery as Capital\n"
                    f"You have **₹{credit_total:,.0f}** tied up in Udhaar. We will recover 40% of this (₹{int(credit_total*0.4):,}) within 14 days by offering deep-clearing discounts for full settlement. This recovered capital will be used to buy higher-margin inventory for the next season.\n\n"
                    f"### Phase 3: High-Value Customer Retention\n"
                    f"Your VIPs drive your growth. Personalize your service for the top 10% to ensure they never migrate to city-based retailers.\n\n"
                    f"**Next Step**: Review your top growth actions → **[[TAB:ACTIONS]]**"
                )}

            elif any(k in q for k in ["credit", "udhaar", "payment", "recover", "debt", "money", "pending"]):
                return {"reply": (
                    f"## 💰 Professional Credit Recovery Audit\n\n"
                    f"**Current Exposure:** You have **₹{credit_total:,.0f}** in outstanding Udhaar. This represents capital that is currently earning zero interest and preventing you from buying new stock.\n\n"
                    f"### 1. The Recovery Protocol\n"
                    f"- **Priority Settlement**: Focus on debts over ₹5,000 first. These accounts are your highest risk. \n"
                    f"- **The Ethical Discount**: Offer a 'Full Settlement Bonus' — if they pay the full amount this week, offer 2% off their *next* purchase. This maintains the relationship while securing the cash.\n"
                    f"- **Visual Proof**: Show them their transaction history using our platform to remove any arguments about the amount owed.\n\n"
                    f"### 2. Risk Mitigation for the Future\n"
                    f"- Cap new credit at **₹{int(avg_ticket*1.5):,}** for any customer who has not settled their current balance within 30 days.\n\n"
                    f"**Action**: See who owes you the most right now → **[[TAB:CLIENTS]]** (Filter by Credit)"
                )}

            else:
                # Default comprehensive snapshot
                return {"reply": (
                    f"## 👔 SmartCustomer Executive Briefing\n\n"
                    f"**Business Status Report**:\n"
                    f"- Total Active Customers: **{cust_count}**\n"
                    f"- Aggregate Revenue: **₹{total_rev:,.0f}**\n"
                    f"- Capital Tied in Credit: **₹{credit_total:,.0f}**\n\n"
                    f"### Quarterly Strategic Priorities\n"
                    f"1. **Liquidity Focus**: High priority on recovering the ₹{credit_total:,.0f} Udhaar to prepare for seasonal stocking.\n"
                    f"2. **Retention Focus**: Re-engage churn-risk customers before the next major festival cycle.\n"
                    f"3. **Expansion Focus**: Identify your top 20 VIPs and offer them a 'Gold' membership status for early access to new items.\n\n"
                    f"**How can I assist you further?** I can provide deep strategy on churn, revenue growth, festival planning, or credit recovery. Or go to **[[TAB:ACTIONS]]** for your daily priorities."
                )}

        else:
            # URBAN MODE
            customers = db.query(models.Customer).filter(models.Customer.user_id == user.id).all()
            if not customers:
                return {"reply": (
                    "# 🚀 Setup Assistance Required\n\n"
                    "Welcome! Your Urban AI Advisor is ready to scale your business, but I need your historical sales data to generate a strategy.\n\n"
                    "### Getting Started\n"
                    "1. Go to **[[TAB:DATA]]**\n"
                    "2. Upload your standard Retail CSV (Format: CustomerID, InvoiceDate, Quantity, Price)\n"
                    "3. I will then perform a full **RFM Analysis** and generate your growth roadmap immediately."
                )}

            total_rev = sum(c.monetary or 0 for c in customers)
            cust_count = len(customers)
            vip_count = sum(1 for c in customers if c.segment_name == "VIP")
            avg_rev = total_rev / cust_count if cust_count > 0 else 0

            return {"reply": (
                f"## 🏙️ Urban Business Intelligence Report\n\n"
                f"**Executive Summary**: Your business has established a base of **{cust_count} customers** with a total lifetime value of **₹{total_rev:,.1f}**. Your VIP segment holds **{vip_count} individuals** who are the core of your growth.\n\n"
                f"### Strategic Recommendations\n"
                f"1. **Maximize VIP Loyalty**: Each VIP brings an average of ₹{avg_rev*2:,.0f}. Protect this by launching a concierge service or exclusive WhatsApp channel.\n"
                f"2. **Conversion of Regulars**: Target the middle 40% of your base for a 'Tier-Up' promotion to move them into the VIP category.\n"
                f"3. **Churn Defense**: Use the **[[TAB:ANALYTICS]]** tab to identify high-probability leavers and deploy automated Win-Back emails.\n\n"
                f"Ask me about Churn, Growth, or specific Customer Segments!"
            )}
    except Exception as e:
        print(f"[Internal Fallback Error] {e}")
        return {"reply": "I'm currently processing your business data. Your records are safe! Please check the **[[TAB:ACTIONS]]** tab for your daily priorities, or try asking me a specific question like 'How do I reduce churn?' or 'How can I grow revenue?'"}
    finally:
        db.close()
