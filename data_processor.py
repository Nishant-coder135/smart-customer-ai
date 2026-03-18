import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, PowerTransformer, FunctionTransformer
import datetime as dt

def load_and_clean_data(file_path):
    """Loads dataset and performs initial cleaning."""
    df = pd.read_csv(file_path)
    
    # Drop rows without CustomerID
    df = df.dropna(subset=['CustomerID'])
    
    # Remove cancelled orders (Quantity < 0)
    df = df[df['Quantity'] > 0]
    
    # Convert InvoiceDate to datetime
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    
    return df

def calculate_rfm(df):
    """Calculates Recency, Frequency, and Monetary value for each customer."""
    # Assume snapshot date is 1 day after the latest invoice
    snapshot_date = df['InvoiceDate'].max() + dt.timedelta(days=1)
    
    rfm = df.groupby('CustomerID').agg({
        'InvoiceDate': lambda x: (snapshot_date - x.max()).days, # Recency
        'InvoiceNo': 'nunique', # Frequency
        'TotalAmount': 'sum' # Monetary
    }).reset_index()
    
    rfm.rename(columns={
        'InvoiceDate': 'Recency',
        'InvoiceNo': 'Frequency',
        'TotalAmount': 'Monetary'
    }, inplace=True)
    
    # Filter out non-positive monetary or frequency to be safe
    rfm = rfm[(rfm['Monetary'] > 0) & (rfm['Frequency'] > 0)]
    
    return rfm

def transform_and_scale_features(rfm_df):
    """Applies log/Yeo-Johnson transformations and standard scaling to RFM."""
    rfm_processed = rfm_df.copy()
    features = ['Recency', 'Frequency', 'Monetary']
    
    # Feature Engineering: 
    # Use Log Transformation for heavily skewed variables if needed, 
    # but Yeo-Johnson is robust. We will follow instructions: Log + Yeo-Johnson.
    # Applying Log(1+x) then Yeo-Johnson might be redundant, but let's apply log(x) to Monetary
    # and Yeo-Johnson to the rest, or Yeo-Johnson sequentially as requested.
    
    # Example: Apply Log1p to all strictly positive, then Yeo-Johnson
    log_transformer = FunctionTransformer(np.log1p)
    log_transformed = log_transformer.fit_transform(rfm_processed[features])
    
    # Yeo-Johnson Transformer (turn off standard scaling to do it separately)
    pt = PowerTransformer(method='yeo-johnson', standardize=False)
    yj_transformed = pt.fit_transform(log_transformed)
    
    # StandardScaler
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(yj_transformed)
    
    scaled_df = pd.DataFrame(scaled_data, columns=features, index=rfm_processed.index)
    
    # Add CustomerID back
    scaled_df.insert(0, 'CustomerID', rfm_processed['CustomerID'].values)
    
    return scaled_df, rfm_processed, scaler, pt, log_transformer

def process_pipeline(file_path):
    """Main pipeline function to take raw path and return ready-to-use RFM df."""
    df_clean = load_and_clean_data(file_path)
    rfm_raw = calculate_rfm(df_clean)
    rfm_scaled, rfm_original, scaler, pt, log_trans = transform_and_scale_features(rfm_raw)
    
    return df_clean, rfm_original, rfm_scaled, scaler, pt
