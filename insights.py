import pandas as pd
import numpy as np

def generate_cluster_summaries(df_rfm, cluster_col='Cluster'):
    """Generates natural language summaries for each cluster based on RFM attributes."""
    summaries = {}
    
    overall_r = df_rfm['Recency'].median()
    overall_f = df_rfm['Frequency'].median()
    overall_m = df_rfm['Monetary'].median()
    
    cluster_stats = df_rfm.groupby(cluster_col).agg({
        'Recency': 'median',
        'Frequency': 'median',
        'Monetary': 'median',
        'CustomerID': 'count'
    }).rename(columns={'CustomerID': 'Count'})
    
    for cluster, stats in cluster_stats.iterrows():
        r = stats['Recency']
        f = stats['Frequency']
        m = stats['Monetary']
        
        # Simple logical rules
        desc = []
        if r < overall_r * 0.7:
            desc.append("highly recent")
        elif r > overall_r * 1.3:
            desc.append("dormant/at-risk")
        else:
            desc.append("average recency")
            
        if f > overall_f * 1.5:
            desc.append("very frequent buyers")
        elif f < overall_f * 0.5:
            desc.append("infrequent buyers")
        else:
            desc.append("regular buyers")
            
        if m > overall_m * 1.5:
            desc.append("high spenders")
        elif m < overall_m * 0.5:
            desc.append("low spenders")
        else:
            desc.append("average spenders")
            
        summary = f"Cluster {cluster} represents {int(stats['Count'])} customers who are {desc[0]}, {desc[1]}, and {desc[2]}."
        summaries[cluster] = summary
        
    return summaries, cluster_stats

def generate_marketing_strategies(cluster_stats):
    """Provides automated marketing campaigns based on cluster traits."""
    strategies = {}
    
    for cluster, row in cluster_stats.iterrows():
        # High spend, Low r => Champions
        if row['Monetary'] > cluster_stats['Monetary'].median() and row['Recency'] < cluster_stats['Recency'].median():
            strat = "Reward them! Exclusive early access to new products, VIP loyalty programs to maintain engagement."
        # High r => At Risk / Dormant
        elif row['Recency'] > cluster_stats['Recency'].median() * 1.5:
            strat = "Win-back campaigns. Send aggressive discounts ('We miss you!') to reactivate them."
        # High spend, Low f => Promising / Needs Nurturing
        elif row['Monetary'] > cluster_stats['Monetary'].median() and row['Frequency'] <= cluster_stats['Frequency'].median():
            strat = "Upsell/Cross-sell. They spend a lot when they buy, but don't buy often. Recommend complementary products."
        else:
            strat = "General targeted newsletters. Provide personalized recommendations based on past purchases."
            
        strategies[cluster] = strat
        
    return strategies
