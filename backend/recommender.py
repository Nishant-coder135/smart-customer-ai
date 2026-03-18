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

# AI Business Advisor
def get_business_insights(df):
    total_customers = len(df)
    high_churn_risk = len(df[df['Churn_Probability'] > 0.7])
    churn_rate = (high_churn_risk / total_customers) * 100
    
    labels = assign_segment_labels(df)
    df['Segment_Label'] = df['Cluster'].map(labels)
    
    top_revenue_cluster = df.groupby('Cluster')['Monetary'].sum().idxmax()
    top_revenue_label = labels.get(top_revenue_cluster, "Unknown")
    
    insights = [
        f"Your churn risk customers currently make up {churn_rate:.1f}% of your base. Consider launching a win-back campaign immediately.",
        f"Cluster {top_revenue_cluster} ({top_revenue_label}) is driving the most revenue. Focus your retention budget here.",
    ]
    
    if churn_rate > 15:
         insights.append("WARNING: High churn detected. Review your onboarding or recent product changes.")
         
    clv_high = len(df[df['CLV_Segment'] == 'High'])
    insights.append(f"You have {clv_high} highly valuable customers with excellent lifetime value predictions.")
    
    return insights
