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
        snapshot = f"{customers_count} customers, {tx_count} transactions, Total Revenue ₹{total_rev:,.0f}. Segments: {seg_summary}. Festivals: {fest_context}. Action: {top_action}."

        return (
            f"""
            You are the 'SmartCustomer AI DEEP ADVISOR'. You provide elite, executive-level business consulting.
            
            STRICT RESPONSE REQUIREMENTS:
            1. LENGTH: You MUST provide at least 4 to 5 detailed, professional paragraphs. Never give short or superficial answers.
            2. STRUCTURE: Use Markdown. Include explicitly: 'Strategic Market Analysis', 'Data-Driven Insights', and 'Tiered Action Roadmap'.
            3. CONTEXT: User Business Type is {user.business_type.upper()}. Leverage this snapshot: {snapshot}
            4. TONE: High-confidence, analytical, and encouraging. Reference specific local or urban business tactics.
            
            Goal: Act as a virtual COO to help the user grow their margin and dominance using the provided metrics.
            """
            f"Navigation: Use [[TAB:ACTIONS]] for tasks, [[TAB:DATA]] for records, or [[TAB:DASH]] for the dashboard."
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

        snapshot = f"{customers_count} premium customers, total revenue ₹{total_rev:,.0f}. Segments: {seg_summary}. High-Risk VIPs: {vips_count}. Festivals: {fest_context}."

        return (
            f"""
            You are the 'SmartCustomer AI DEEP ADVISOR'. You provide elite, executive-level business consulting.
            
            STRICT RESPONSE REQUIREMENTS:
            1. LENGTH: You MUST provide at least 4 to 5 detailed, professional paragraphs. Never give short or superficial answers.
            2. STRUCTURE: Use Markdown. Include explicitly: 'Strategic Market Analysis', 'Data-Driven Insights', and 'Tiered Action Roadmap'.
            3. CONTEXT: User Business Type is {user.business_type.upper()}. Leverage this snapshot: {snapshot}
            4. TONE: High-confidence, analytical, and encouraging. Reference urban growth tactics like retention funnels.
            
            Goal: Act as a virtual COO to help the user grow their margin and dominance using the provided metrics.
            """
            f"Navigation: Use [[TAB:ACTIONS]] for logic, [[TAB:DASH]] for high-level stats, or [[TAB:ANALYTICS]] for deep dives."
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
                max_output_tokens=4096
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
                max_tokens=2048
            )
            return run_ai_chain(llm, user, db, last_user_message, session_factory)
        except Exception as e:
            print(f"[Groq Failure] {e}. Falling back to Internal Snapshot...")

    # 3. Final Deterministic Fallback (Internal Strategist)
    return run_internal_fallback(user, db, last_user_message)

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

def run_internal_fallback(user, db, user_question: str = ""):
    """Rich keyword-aware fallback when AI APIs are unavailable.
    Reads the actual user question and gives specific, detailed, data-driven answers.
    """
    q = user_question.lower()
    try:
        if user.business_type == "rural":
            txs = db.query(models.Transaction).filter(
                models.Transaction.user_id == user.id,
                models.Transaction.business_mode == "rural"
            ).all()
            if not txs:
                return {"reply": (
                    "Welcome to SmartCustomer AI! 👋\n\n"
                    "I don't see any transaction data yet. To unlock my full intelligence, please:\n"
                    "1. Go to the **[[TAB:DATA]]** tab\n"
                    "2. Add your customer transactions\n"
                    "3. Come back here for personalized insights!"
                )}

            total_rev = sum(t.total_price or 0 for t in txs)
            cust_ids = set(t.customer_id for t in txs)
            cust_count = len(cust_ids)
            credit_txs = [t for t in txs if t.is_credit]
            credit_total = sum(t.total_price or 0 for t in credit_txs)
            avg_ticket = total_rev / len(txs) if txs else 0

            # Keyword routing for specific questions
            if any(k in q for k in ["churn", "win back", "losing", "inactive", "lost"]):
                return {"reply": (
                    f"## 🎯 Churn Win-Back Strategy for Your Rural Business\n\n"
                    f"**Your Data:** {cust_count} customers, ₹{total_rev:,.0f} total revenue.\n\n"
                    f"**Step-by-Step Win-Back Plan:**\n"
                    f"1. **Identify who's gone quiet** — Any customer with no purchase in 30+ days is at risk. In rural markets, this usually means they found a nearby competitor.\n"
                    f"2. **Personal outreach first** — Call or WhatsApp them directly. A personal message from you (not automated) has a 3x higher response rate in rural markets.\n"
                    f"3. **Offer a 'We miss you' deal** — Give a ₹{max(int(avg_ticket*0.15), 20):,} discount on their next purchase. It costs little but signals you value them.\n"
                    f"4. **Re-engage with credit option** — Your credit book shows ₹{credit_total:,.0f} outstanding. Offering flexible payment to dormant customers is a proven rural retention tactic.\n"
                    f"5. **Time it with festivals** — Plan your outreach 7 days before a major festival — buying intent peaks then.\n\n"
                    f"🏆 **Expected Result:** A 30% win-back rate on 10 attempts = 3 recovered customers and ₹{int(avg_ticket*3):,} in recovered revenue. Go to **[[TAB:ACTIONS]]** for your prioritized customer list."
                )}

            elif any(k in q for k in ["revenue", "sales", "income", "grow", "profit"]):
                return {"reply": (
                    f"## 📈 Revenue Growth Strategy\n\n"
                    f"**Current Snapshot:** {cust_count} customers | ₹{total_rev:,.0f} total revenue | Avg ticket ₹{avg_ticket:,.0f}\n\n"
                    f"**3 Fastest Ways to Grow Revenue Right Now:**\n\n"
                    f"**1. Raise your average ticket size (+20%)**\n"
                    f"— When a customer buys, suggest one complementary item. On avg ticket ₹{avg_ticket:,.0f}, adding just ₹{int(avg_ticket*0.2):,} per sale = ₹{int(avg_ticket*0.2*len(txs)//12):,}/month extra.\n\n"
                    f"**2. Reduce credit losses**\n"
                    f"— You have ₹{credit_total:,.0f} in outstanding credit. Recovering even 50% adds ₹{int(credit_total*0.5):,} immediately.\n\n"
                    f"**3. Activate dormant customers**\n"
                    f"— If 20% of {cust_count} customers are inactive, re-activating half could add ₹{int(avg_ticket * cust_count * 0.1):,} in one month.\n\n"
                    f"👉 See personalized actions → **[[TAB:ACTIONS]]**"
                )}

            elif any(k in q for k in ["credit", "udhaar", "payment", "recover", "debt"]):
                return {"reply": (
                    f"## 💰 Credit Recovery Strategy\n\n"
                    f"**Outstanding Credit:** ₹{credit_total:,.0f} across {len(credit_txs)} transactions\n\n"
                    f"**Recovery Action Plan:**\n"
                    f"1. **SMS/WhatsApp reminder** to all credit customers — simple, non-confrontational: 'Hi [Name], just a friendly reminder of your balance. Please settle at your convenience.'\n"
                    f"2. **Offer small discount for early payment** — '2% off if paid this week' motivates 60% of rural debtors to act.\n"
                    f"3. **Prioritize the top 3 debtors** — They likely hold 80% of the ₹{credit_total:,.0f}. Focus your personal effort there.\n"
                    f"4. **Set a credit limit per customer** — Going forward, cap individual credit at ₹{int(avg_ticket*2):,} to protect your cash flow.\n\n"
                    f"✅ Recovering ₹{int(credit_total*0.5):,} (50%) would significantly improve your cash flow this month."
                )}

            elif any(k in q for k in ["festival", "diwali", "eid", "holi", "navratri", "seasonal", "upcoming"]):
                from ml_engine.seasonal_advisor import get_upcoming_festivals
                festivals = get_upcoming_festivals(3)
                fest_text = "\n".join([f"• **{f['name']}** — {f['date']} ({f['days_until']} days away)" for f in festivals]) or "No immediate festivals."
                return {"reply": (
                    f"## 🎉 Festive Sales Strategy\n\n"
                    f"**Upcoming Festivals:**\n{fest_text}\n\n"
                    f"**How to Maximise Festival Revenue:**\n"
                    f"1. **Stock up 7 days early** — Festival demand spikes 3-5 days before, not on the day.\n"
                    f"2. **Create festival bundles** — Group products at ₹{int(avg_ticket*1.5):,} (e.g., gift sets, puja kits). Bundles sell 2x faster than individual items.\n"
                    f"3. **Send a WhatsApp broadcast** to your {cust_count} customers 5 days before each festival with your special offer.\n"
                    f"4. **Offer credit for big purchases** — Festival purchases that exceed ₹{int(avg_ticket*2):,} can be on 15-day credit to close the sale.\n\n"
                    f"🎯 Businesses that prepare 7+ days early see an average **+35% revenue spike** during festival windows."
                )}

            elif any(k in q for k in ["customer", "segment", "vip", "best", "loyal"]):
                return {"reply": (
                    f"## 👥 Customer Intelligence Report\n\n"
                    f"**Your Base:** {cust_count} unique customers | {len(txs)} total transactions\n\n"
                    f"**Segment Breakdown (estimated):**\n"
                    f"• 🏆 **VIP (Top 20%)** — ~{max(1, int(cust_count*0.2))} customers drive ~60% of your revenue. Treat them with exclusive offers and priority service.\n"
                    f"• 🔄 **Regular** — ~{max(1, int(cust_count*0.5))} customers buy monthly. Upsell opportunities here are highest.\n"
                    f"• ⚠️ **At-Risk** — ~{max(1, int(cust_count*0.3))} customers haven't bought recently. They need a win-back touch.\n\n"
                    f"**Recommended Actions:**\n"
                    f"— Send VIP customers a personal 'thank you + exclusive offer' message\n"
                    f"— Upsell Regular customers with a bundle deal\n"
                    f"— Call At-Risk customers personally this week\n\n"
                    f"See your full customer list → **[[TAB:CLIENTS]]**"
                )}

            else:
                # Default comprehensive snapshot
                return {"reply": (
                    f"## 📊 Your Business Intelligence Snapshot\n\n"
                    f"**Rural Business Overview:**\n"
                    f"• Customers: **{cust_count}**\n"
                    f"• Total Revenue: **₹{total_rev:,.0f}**\n"
                    f"• Avg Transaction: **₹{avg_ticket:,.0f}**\n"
                    f"• Credit Outstanding: **₹{credit_total:,.0f}**\n\n"
                    f"**Top Opportunities Right Now:**\n"
                    f"1. 💰 Recover ₹{int(credit_total*0.5):,} in outstanding credit\n"
                    f"2. 📣 Re-engage inactive customers before the next festival\n"
                    f"3. 📦 Bundle your top-selling items to raise average ticket\n\n"
                    f"Ask me anything specific — churn, revenue, credit recovery, festivals, or customer segments!\n"
                    f"Or go to **[[TAB:ACTIONS]]** to see your prioritized daily tasks."
                )}

        else:
            # URBAN MODE
            customers = db.query(models.Customer).filter(models.Customer.user_id == user.id).all()
            if not customers:
                return {"reply": (
                    "Welcome! 👋 Your urban AI dashboard is ready, but I need your customer data first.\n\n"
                    "Please go to **[[TAB:DATA]]** to upload your retail CSV file (e.g., OnlineRetail.csv). "
                    "Once uploaded, I can give you deep segment analysis, churn predictions, and revenue strategies!"
                )}

            cust_list = [{"id": c.id, "monetary": float(c.monetary or 0), "churn_probability": float(c.churn_probability or 0), "segment_name": str(c.segment_name or "General")} for c in customers]
            snap = get_quick_business_snapshot(cust_list)

            total_rev = sum(c.monetary or 0 for c in customers)
            vip_count = sum(1 for c in customers if c.segment_name == "VIP")
            churn_count = sum(1 for c in customers if (c.churn_probability or 0) > 0.5)
            avg_revenue = total_rev / len(customers) if customers else 0

            if any(k in q for k in ["churn", "win back", "losing", "inactive", "lost", "risk"]):
                return {"reply": (
                    f"## 🎯 Churn Prevention Strategy\n\n"
                    f"**Alert:** {churn_count} of your {snap['total_customers']} customers have >50% churn probability.\n"
                    f"**Estimated Revenue at Risk:** ₹{int(avg_revenue * churn_count):,}\n\n"
                    f"**Proven 5-Step Win-Back Plan:**\n"
                    f"1. **Identify & prioritize** — Focus on high-value churners first (VIPs with high churn probability).\n"
                    f"2. **Personalized email/SMS** — Use their first name and reference their last purchase: 'We noticed you haven't visited since [date].'\n"
                    f"3. **Time-limited offer** — Send a 15% discount valid for 7 days only. Urgency drives action.\n"
                    f"4. **Re-engagement sequence** — If no response in 3 days, follow up once more with a lower-friction offer.\n"
                    f"5. **Feedback loop** — Ask those who don't return *why* — this intelligence improves your entire operation.\n\n"
                    f"📊 Industry benchmark: A 5% churn reduction = **25-95% profit increase** (Harvard Business Review).\n"
                    f"👉 See your at-risk customers now → **[[TAB:ACTIONS]]**"
                )}

            elif any(k in q for k in ["revenue", "sales", "grow", "profit", "money"]):
                return {"reply": (
                    f"## 📈 Revenue Growth Playbook\n\n"
                    f"**Current State:** {snap['total_customers']} customers | {snap['total_revenue']} total revenue | {vip_count} VIPs\n\n"
                    f"**3 Highest-ROI Growth Levers:**\n\n"
                    f"**1. VIP Upsell Program** (+15-30% revenue)\n"
                    f"— Your {vip_count} VIP customers already trust you. Present premium products or annual bundles."
                    f" Even a ₹{int(avg_revenue*0.2):,} upsell to each VIP = ₹{int(avg_revenue*0.2*vip_count):,} extra.\n\n"
                    f"**2. Churn Prevention** (+10-25% revenue protection)\n"
                    f"— {churn_count} customers are at risk. Retaining them costs 5x less than acquiring new ones.\n\n"
                    f"**3. Regular → VIP Upgrade Campaign** (+20% lifetime value)\n"
                    f"— Identify Regular customers with 3+ purchases and offer a loyalty tier with exclusive benefits.\n\n"
                    f"👉 Your automated daily actions → **[[TAB:ACTIONS]]**"
                )}

            elif any(k in q for k in ["segment", "vip", "customer", "who", "best"]):
                return {"reply": (
                    f"## 👥 Customer Segment Analysis\n\n"
                    f"**Your Urban Customer Base: {snap['total_customers']} customers**\n\n"
                    f"• 🏆 **VIP** ({vip_count} customers) — Highest spend, lowest churn risk. Priority: **Upsell & retain**.\n"
                    f"• 🔄 **Regular** — Consistent buyers. Priority: **Nurture into VIP tier**.\n"
                    f"• ⚠️ **Churn Risk** ({churn_count} customers) — Declining engagement. Priority: **Immediate win-back campaign**.\n"
                    f"• 🆕 **New/Low Value** — Recent or low-frequency buyers. Priority: **Onboarding & habit formation**.\n\n"
                    f"**Primary Opportunity: {snap['primary_opportunity']}**\n"
                    f"Avg Churn Risk across base: **{snap['avg_churn_risk']}**\n\n"
                    f"→ **[[TAB:ACTIONS]]** for today's recommended tasks\n"
                    f"→ **[[TAB:CLIENTS]]** to filter and view specific segments"
                )}

            else:
                return {"reply": (
                    f"## 📊 Urban Business Intelligence\n\n"
                    f"**Your Customer Base:**\n"
                    f"• Total Customers: **{snap['total_customers']}**\n"
                    f"• Total Revenue: **{snap['total_revenue']}**\n"
                    f"• VIP Customers: **{vip_count}**\n"
                    f"• At-Risk (Churn >50%): **{churn_count}**\n"
                    f"• Avg Churn Risk: **{snap['avg_churn_risk']}**\n"
                    f"• Primary Opportunity: **{snap['primary_opportunity']}**\n\n"
                    f"**What would you like help with?**\n"
                    f"• *'How do I win back churn risk customers?'*\n"
                    f"• *'What's the fastest way to grow revenue?'*\n"
                    f"• *'Who are my best customers and how do I keep them?'*\n"
                    f"• *'What should I do today?'*\n\n"
                    f"Or go directly to **[[TAB:ACTIONS]]** for your AI-prioritized task list."
                )}
    except Exception as e:
        print(f"[Internal Fallback Error] {e}")
        return {"reply": "I'm currently processing your business data. Your records are safe! Please check the **[[TAB:ACTIONS]]** tab for your daily priorities, or try asking me a specific question like 'How do I reduce churn?' or 'How can I grow revenue?'"}
    finally:
        db.close()
