import random
import pandas as pd

# Core Recommender Logic
def generate_recommendation(segment_label, rfm_data, churn_prob, clv):
    recency = rfm_data.get('Recency', 0)
    frequency = rfm_data.get('Frequency', 0)
    monetary = rfm_data.get('Monetary', 0)

    # Hybrid rule base
    if churn_prob > 0.75 and clv == 'High':
        action = "Immediate Retention Campaign (High Value VIP)"
        reason = f"Customer has high CLV but high churn probability ({(churn_prob*100):.1f}%). High monetary value (${monetary:.2f}) indicates past loyalty."
        expected_outcome = "Prevent loss of premium revenue stream."
        confidence = 0.95
    elif churn_prob > 0.75 and clv != 'High':
        action = "Win-back Email Sequence with 20% Discount"
        reason = "At risk of churning. Average value customer needing a push."
        expected_outcome = "Increase frequency and return to active status."
        confidence = 0.82
    elif segment_label == 'VIP' or (frequency > 20 and monetary > 300):
        action = "Early Access & Loyalty Rewards"
        reason = "Highly active customer. Focus on retention and upsell."
        expected_outcome = "Increase Average Order Value by 15%."
        confidence = 0.91
    elif recency > 90 and frequency == 1:
        action = "First-time Buyer Reactivation"
        reason = "Bought once and never returned. Needs a strong reason to buy again."
        expected_outcome = "Convert to multi-time buyer."
        confidence = 0.78
    else:
        action = "Nurture with Weekly Newsletter"
        reason = "Regular customer behaving nominally."
        expected_outcome = "Maintain top-of-mind awareness."
        confidence = 0.85

    return {
        "Action": action,
        "Reason": reason,
        "ExpectedOutcome": expected_outcome,
        "ConfidenceScore": confidence
    }

# AI Campaign Generator
def generate_campaign(segment_label, segment_stats):
    campaign_templates = {
        'VIP': {
            'email_subject': "✨ Exclusive Early Access Just for You!",
            'content': "Because you're one of our best customers, we want you to be the first to shop our new collection.",
            'offer': "Free expedited shipping + 10% off new arrivals",
            'channel': "Email & Direct SMS"
        },
        'Churn Risk': {
            'email_subject': "We Miss You! Here's 20% Off 🎁",
            'content': "It's been a while. Come back and enjoy a special discount on us.",
            'offer': "20% off entire cart",
            'channel': "Email & Retargeting Ads"
        },
        'Regular': {
            'email_subject': "Check out our latest bestsellers",
            'content': "See what everyone else is loving right now.",
            'offer': "Points multiplier on next purchase",
            'channel': "Email"
        },
        'Low Value / Sleeping': {
            'email_subject': "Still interested? Here's a massive deal.",
            'content': "We're clearing out last season's stock. Get it before it's gone.",
            'offer': "Up to 50% off clearance",
            'channel': "Push Notification"
        }
    }
    
    # Fallback to 'Regular' if label not mapped perfectly
    return campaign_templates.get(segment_label, campaign_templates['Regular'])

# Map cluster IDs to human labels based on aggregate stats
def assign_segment_labels(df):
    cluster_means = df.groupby('Cluster')[['Recency', 'Frequency', 'Monetary']].mean()
    
    # Logic to tag clusters
    labels = {}
    for cluster in cluster_means.index:
        r = cluster_means.loc[cluster, 'Recency']
        f = cluster_means.loc[cluster, 'Frequency']
        m = cluster_means.loc[cluster, 'Monetary']
        
        if m > cluster_means['Monetary'].median() and f > cluster_means['Frequency'].median():
            labels[cluster] = "VIP"
        elif r > cluster_means['Recency'].quantile(0.75):
            labels[cluster] = "Churn Risk"
        elif m < cluster_means['Monetary'].quantile(0.25):
            labels[cluster] = "Low Value / Sleeping"
        else:
            labels[cluster] = "Regular"
            
    return labels

# Smart Budget Allocation
def calculate_budget_allocation(df, total_budget=10000):
    labels = assign_segment_labels(df)
    
    # Simple heuristic: Focus on Retention (VIP) and Recovery (Churn Risk)
    weights = {
        "VIP": 0.40,           # 40% to keep best customers happy
        "Churn Risk": 0.35,    # 35% to save at-risk customers
        "Regular": 0.20,       # 20% to grow average
        "Low Value / Sleeping": 0.05 # 5% minimum effort
    }
    
    allocations = []
    for cluster, label in labels.items():
        count = len(df[df['Cluster'] == cluster])
        weight = weights.get(label, 0.2)
        budget = total_budget * weight
        allocations.append({
            "Cluster": int(cluster),
            "Label": label,
            "CustomerCount": count,
            "SuggestedBudget": budget,
            "Strategy": "Retention" if label == "VIP" else ("Recovery" if label == "Churn Risk" else "Growth")
        })
        
    return allocations

# AI Business Advisor - Detailed Strategic Insights
def get_detailed_strategies(df):
    labels = assign_segment_labels(df)
    df['Segment_Label'] = df['Cluster'].map(labels)
    
    strategies = {}
    for label in ["VIP", "Churn Risk", "Regular", "Low Value / Sleeping"]:
        # Filter data for this segment
        segment_df = df[df['Segment_Label'] == label]
        if segment_df.empty:
            continue
            
        avg_monetary = segment_df['Monetary'].mean()
        count = len(segment_df)
        
        # Generation of detailed strategy based on segment behavior
        if label == "VIP":
            pillar = "Retention & Advocacy"
            tactics = [
                "Launch a 1-to-1 concierge service for top 1% of this group.",
                "Implement a tiered rewards system where benefits increase with 'Loyalty Years'.",
                "Request product referrals and feedback for 'Beta' features."
            ]
            short_term = "Increase purchase frequency by 10% through exclusive flash sales."
        elif label == "Churn Risk":
            pillar = "Recovery & Feedback"
            tactics = [
                "Automated 'We Miss You' email series with escalating discounts (10% -> 20%).",
                "Direct outbound feedback calls for the top 10 most valuable at-risk customers.",
                "Simplify the re-ordering process with one-click purchase links."
            ]
            short_term = "Recover 25% of at-risk revenue within the next 45 days."
        elif label == "Regular":
            pillar = "Growth & Upsell"
            tactics = [
                "Personalized product recommendations based on 'Often Bought Together' logic.",
                "Cross-sell campaigns for complementary categories.",
                "Introduce a 'Gold' membership status for customers who reach 10 lifetime purchases."
            ]
            short_term = "Shift 5% of this segment into the VIP category by Q3."
        else: # Low Value
            pillar = "Efficiency & Clearance"
            tactics = [
                "Automated clearance alerts for slow-moving inventory.",
                "Low-cost re-engagement via push notifications only.",
                "Identify and prune inactive accounts to save on marketing platform costs."
            ]
            short_term = "Convert one-time buyers to repeat buyers with low-margin offers."

        strategies[label] = {
            "StrategicPillar": pillar,
            "CustomerCount": count,
            "AverageSpend": round(avg_monetary, 2),
            "Tactics": tactics,
            "ShortTermGoal": short_term,
            "BusinessImpact": f"Est. ${round(avg_monetary * count * 0.15, 2)} revenue growth potential."
        }
    
    return strategies

def get_business_insights(df):
    total_customers = len(df)
    high_churn_risk = len(df[df['Churn_Probability'] > 0.7])
    churn_rate = (high_churn_risk / total_customers) * 100
    
    labels = assign_segment_labels(df)
    df['Segment_Label'] = df['Cluster'].map(labels)
    
    top_revenue_cluster = df.groupby('Cluster')['Monetary'].sum().idxmax()
    top_revenue_label = labels.get(top_revenue_cluster, "Unknown")
    
    avg_clv = df['CLV'].mean()
    
    insights = [
        f"DATA ALERT: Your churn risk is at {churn_rate:.1f}%. A recovery campaign for {high_churn_risk} customers is recommended.",
        f"REVENUE FOCUS: Segment '{top_revenue_label}' is your primary growth engine. Maintain a 95% satisfaction rate here.",
        f"LIFETIME VALUE: Average predicted CLV across your base is ${avg_clv:.2f}. Each new customer adds significant long-term capital."
    ]
    
    if churn_rate > 15:
        insights.append("CRITICAL: Segment destabilization detected. Check recent competitor pricing.")
    
    return insights
