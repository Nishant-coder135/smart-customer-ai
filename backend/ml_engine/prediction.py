
def predict_behavior(rfm_df):
    import pandas as pd
    import numpy as np
    """
    Predict churn and next purchase likelihood.
    In a real app, this would use labeled historical data.
    For this 'Growing AI' engine, we simulate the logic using RFM thresholds 
    until enough 'Action Tracking' data is collected.
    """
    
    # Simulate Churn Prob based on Recency and Frequency
    # (Goal: 1.0 = Highly likely to leave)
    rfm_df['churn_prob'] = (rfm_df['recency'] / (rfm_df['recency'].max() + 1)).clip(0, 1)
    
    # Simulate Purchase Prob based on Frequency and Current Activity
    # (Goal: 1.0 = Highly likely to buy again soon)
    rfm_df['purchase_prob'] = (rfm_df['frequency'] / (rfm_df['frequency'].max() + 1)) * (1 - rfm_df['churn_prob'])
    rfm_df['purchase_prob'] = rfm_df['purchase_prob'].clip(0, 1)
    
    return rfm_df

def get_risk_label(prob):
    if prob > 0.7: return "High"
    if prob > 0.4: return "Medium"
    return "Low"
