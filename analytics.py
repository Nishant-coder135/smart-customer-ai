import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

def calculate_clv(rfm_df):
    """Calculates Customer Lifetime Value."""
    df = rfm_df.copy()
    
    # Avoid zero division
    df['Recency'] = df['Recency'].replace(0, 1)
    
    # Lifespan multiplier: More recent customers have a longer remaining lifespan multiplier.
    df['Lifespan_Multiplier'] = np.maximum(1, (365 - df['Recency']) / 365 + 1)
    
    # Simplified CLV
    df['CLV'] = df['Monetary'] * df['Lifespan_Multiplier']
    
    return df

def calculate_churn_probability(rfm_df):
    """Calculates churn risk based on Recency and Frequency."""
    df = rfm_df.copy()
    
    max_recency = df['Recency'].max()
    norm_recency = df['Recency'] / max_recency if max_recency > 0 else 0
    
    freq_cap = 10
    norm_freq = np.minimum(df['Frequency'], freq_cap) / freq_cap
    
    base_risk = norm_recency
    churn_prob = base_risk * (1 - norm_freq * 0.5) 
    
    df['Churn_Probability'] = np.clip(churn_prob, 0, 1)
    
    return df

def detect_outliers(scaled_data):
    """Detects outlier customers using Isolation Forest."""
    clf = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    preds = clf.fit_predict(scaled_data)
    is_outlier = preds == -1
    scores = clf.decision_function(scaled_data)
    
    return is_outlier, scores
