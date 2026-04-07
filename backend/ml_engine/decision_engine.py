import pandas as pd
import math

class DecisionEngine:
    @staticmethod
    def calculate_score(revenue_impact: float, retention_impact: float, risk_reduction: float) -> float:
        """
        Scoring Formula (project_overview):
        Score = (Revenue Impact * 0.5) + (Retention Impact * 0.3) + (Risk Reduction * 0.2)
        """
        score = (revenue_impact * 0.5) + (retention_impact * 0.3) + (risk_reduction * 0.2)
        return min(max(score, 0), 1) # Normalize 0 to 1
        
    @staticmethod
    def get_best_actions_for_today(customer_row, historical_multipliers=None):
        """
        Determine what the user should do TODAY for this specific customer/segment.
        Generates actions and scores them.
        """
        recency = customer_row.get('recency', 0.0)
        clv = customer_row.get('clv', 0.0)
        monetary = customer_row.get('monetary', 0.0)
        churn_prob = customer_row.get('churn_probability', 0.0)
        segment = customer_row.get('segment_name', 'Regular')
        credit_bal = customer_row.get('credit_balance', 0.0)
        is_high_credit = customer_row.get('is_high_credit', False)
        
        actions = []
        if historical_multipliers is None:
            historical_multipliers = {}
            
        def get_multiplier(action_name):
            return historical_multipliers.get(action_name, 1.0)
        
        # Action 0: High Credit Risk Recovery (TOP PRIORITY)
        if is_high_credit or credit_bal > 1000:
            actions.append({
                "action_text": f"Send Payment Reminder: Pending Balance ${credit_bal:.2f}",
                "target_segment": "Credit-at-Risk",
                "reason": f"Customer has a high outstanding balance (${credit_bal:.2f}). Prompt reminders prevent bad debts and improve immediate cash flow.",
                "explanation": "Outstanding credit is reaching a critical threshold. Reducing days-sales-outstanding (DSO) is vital for your small business health.",
                "expected_revenue": credit_bal * 0.4, # 40% recovery likelihood per prompt
                "expected_retention": 0.3,
                "confidence_score": DecisionEngine.calculate_score(revenue_impact=0.9, retention_impact=0.3, risk_reduction=0.95) * get_multiplier("Payment Reminder")
            })

        # Action 1: VIP Loyalty Upsell
        if segment == 'VIP' or (clv > 1000 and churn_prob < 0.3):
            boost = clv * 0.05 # 5% upsell target
            actions.append({
                "action_text": "Send VIP Exclusive Early Access Offer",
                "target_segment": "VIP High Value",
                "reason": "This customer has high lifetime value and low churn probability. Cultivating loyalty with exclusive access boosts margin without discounting.",
                "explanation": f"Based on their spending habits (CLV: {clv:.2f}), offering early access increases long-term loyalty and usually guarantees an immediate upsell.",
                "expected_revenue": max(boost, 50.0),
                "expected_retention": 0.8,
                "confidence_score": DecisionEngine.calculate_score(revenue_impact=0.8, retention_impact=0.7, risk_reduction=0.1) * get_multiplier("Send VIP Exclusive Early Access Offer")
            })
            
        # Action 2: Churn Win-back
        if churn_prob > 0.6 or (segment == 'Churn Risk'):
            recovery = monetary * 0.3 # Target 30% of their historical spend
            actions.append({
                "action_text": f"Send {int(churn_prob*100)}% Win-back Discount via SMS",
                "target_segment": "Churn Risk",
                "reason": f"Customer hasn't purchased in {recency} days (High Churn Risk). Immediate discount incentive needed to break their lapse pattern.",
                "explanation": "High churn risk detected because their visit frequency has dropped significantly. A targeted discount breaks this pattern before they are lost entirely.",
                "expected_revenue": max(recovery, 25.0),
                "expected_retention": 0.9,
                "confidence_score": DecisionEngine.calculate_score(revenue_impact=0.4, retention_impact=0.9, risk_reduction=0.9) * get_multiplier("Send Win-back Discount")
            })
            
        # Action 3: Regular Upsell
        if segment == 'Regular' and recency < 30:
            upsell = (monetary / 10) if monetary > 0 else 25.0
            actions.append({
                "action_text": "Cross-sell related high-margin product",
                "target_segment": "Active Regulars",
                "reason": "Customer is actively engaged and recently purchased. Perfect timing to introduce related high-margin accessories.",
                "explanation": "Active engagement window is currently open. They trust your brand right now, making them highly receptive to complimentary product suggestions.",
                "expected_revenue": max(upsell, 25.0),
                "expected_retention": 0.5,
                "confidence_score": DecisionEngine.calculate_score(revenue_impact=0.7, retention_impact=0.5, risk_reduction=0.2) * get_multiplier("Cross-sell related high-margin product")
            })
            
        # Action 4: Welcome action
        if recency == 0 and clv == 0:
            actions.append({
                "action_text": "Send Welcome/Onboarding Guide",
                "target_segment": "New Customers",
                "reason": "New signups need immediate engagement to form a habit.",
                "explanation": "First impressions determine lifetime value. An immediate automated welcome message increases second-purchase likelihood by 40%.",
                "expected_revenue": 50.0,
                "expected_retention": 0.8,
                "confidence_score": DecisionEngine.calculate_score(revenue_impact=0.2, retention_impact=0.8, risk_reduction=0.4) * get_multiplier("Send Welcome/Onboarding Guide")
            })
            
        if not actions:
            actions.append({
                "action_text": "Send Standard Engagement Newsletter",
                "target_segment": "General Audience",
                "reason": "Maintain top-of-mind brand awareness without aggressive selling.",
                "explanation": "When specific behavioral triggers aren't met, maintaining a baseline communication cadence prevents the customer from forgetting your brand.",
                "expected_revenue": 20.0,
                "expected_retention": 0.4,
                "confidence_score": DecisionEngine.calculate_score(revenue_impact=0.1, retention_impact=0.4, risk_reduction=0.1) * get_multiplier("Send Standard Engagement Newsletter")
            })
            
        # Sort by score and pick best
        best = sorted(actions, key=lambda x: x['confidence_score'], reverse=True)[0]
        return best

def generate_personalized_recommendation(row):
    """Backwards compatibility for existing ML ingestion pipeline"""
    engine = DecisionEngine()
    best_action = engine.get_best_actions_for_today(row)
    # Map back to old expected schema
    return {
        "type": best_action["action_text"],
        "score": best_action["confidence_score"],
        "reason": best_action["reason"],
        "impact": "Retention & Revenue"
    }

def generate_daily_actions(customers, historical_multipliers=None):
    """
    Takes a list of customer dictionaries and computes the best 3-5 global actions to take TODAY.
    Applies learning loop via historical_multipliers.
    """
    engine = DecisionEngine()
    all_actions = []
    
    for c in customers:
        best = engine.get_best_actions_for_today(c, historical_multipliers)
        all_actions.append(best)
        
    # Deduplicate by action target_segment and action_text, accumulating expected values
    aggregated = {}
    for act in all_actions:
        key = (act["action_text"], act["target_segment"])
        if key not in aggregated:
            aggregated[key] = act.copy()
            aggregated[key]["count"] = 1
        else:
            aggregated[key]["count"] += 1
            aggregated[key]["expected_revenue"] += act["expected_revenue"]
            
    # Convert back to list and sort by total confidence / impact
    final_actions = list(aggregated.values())
    final_actions.sort(key=lambda x: (x["confidence_score"] * x["count"]), reverse=True)
    
    return final_actions[:4] # Return TOP 3-5 actions only

def get_quick_business_snapshot(customers: list) -> dict:
    """
    Computes a high-speed summary of business health for use in AI Advisor fallbacks.
    Provides counts, risks, and high-value opportunities.
    """
    if not customers:
        return {
            "total_customers": 0, "avg_churn": 0, "vip_count": 0,
            "revenue": 0, "growth_opp": "None", "primary_segment": "N/A"
        }
        
    df = pd.DataFrame(customers)
    
    # Basic Aggregates
    total_customers = len(df)
    avg_churn = df['churn_probability'].mean() if 'churn_probability' in df else 0
    total_rev = df['monetary'].sum() if 'monetary' in df else 0
    
    # Segment Logic
    vips = len(df[df['segment_name'] == 'VIP']) if 'segment_name' in df else 0
    risks = len(df[df['churn_probability'] > 0.5]) if 'churn_probability' in df else 0
    
    # Growth Opportunity
    opp = "Retention"
    if avg_churn < 0.2: opp = "Upsell"
    if vips < total_customers * 0.1: opp = "Customer Cultivation"
    
    return {
        "total_customers": total_customers,
        "avg_churn_risk": f"{avg_churn*100:.1f}%",
        "high_risk_count": risks,
        "vip_count": vips,
        "total_revenue": f"₹{total_rev:,.0f}",
        "primary_opportunity": opp,
        "top_segment": df['segment_name'].mode()[0] if 'segment_name' in df and not df['segment_name'].mode().empty else "General"
    }
