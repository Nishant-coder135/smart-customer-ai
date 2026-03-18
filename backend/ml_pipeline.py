import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from faker import Faker
import os
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import PowerTransformer, StandardScaler

fake = Faker()
Faker.seed(42)
np.random.seed(42)

# --- Data Generation ---
def generate_synthetic_data(num_customers=5000, num_transactions=25000):
    customer_ids = [f"C{str(i).zfill(5)}" for i in range(1, num_customers + 1)]
    customer_profiles = {}
    for cid in customer_ids:
        profile_type = np.random.choice(['Budget', 'Average', 'Premium', 'VIP'], p=[0.4, 0.4, 0.15, 0.05])
        if profile_type == 'Budget':
            freq_lam, spend_mean, spend_std = 2, 25, 10
        elif profile_type == 'Average':
            freq_lam, spend_mean, spend_std = 5, 75, 25
        elif profile_type == 'Premium':
            freq_lam, spend_mean, spend_std = 12, 200, 50
        else: # VIP
            freq_lam, spend_mean, spend_std = 25, 500, 150
            
        customer_profiles[cid] = {
            'type': profile_type,
            'freq_weight': freq_lam,
            'spend_mean': spend_mean,
            'spend_std': spend_std,
            'country': fake.country() if np.random.random() > 0.8 else 'United States'
        }

    product_ids = [f"P{str(i).zfill(4)}" for i in range(1, 501)]
    product_categories = ['Electronics', 'Clothing', 'Home', 'Sports', 'Beauty']
    products = { pid: {'category': np.random.choice(product_categories), 'base_price': round(np.random.lognormal(mean=3, sigma=1), 2) + 5} for pid in product_ids }

    transactions = []
    end_date = datetime.now()
    weights = [customer_profiles[cid]['freq_weight'] for cid in customer_ids]
    prob_dist = np.array(weights) / sum(weights)
    sampled_customers = np.random.choice(customer_ids, size=num_transactions, p=prob_dist)
    
    for i, cid in enumerate(sampled_customers):
        prof = customer_profiles[cid]
        num_items = max(1, int(np.random.poisson(lam=3)))
        days_ago = np.random.randint(0, 365)
        t_date = end_date - timedelta(days=days_ago)
        
        for _ in range(num_items):
            pid = np.random.choice(product_ids)
            prod = products[pid]
            qty = max(1, int(np.random.poisson(lam=2)))
            price_multiplier = max(0.5, np.random.normal(1.0, 0.1)) 
            if prof['type'] == 'Budget': price_multiplier *= 0.8
            elif prof['type'] == 'VIP': price_multiplier *= 1.2
            unit_price = round(prod['base_price'] * price_multiplier, 2)
            
            transactions.append({
                'CustomerID': cid,
                'InvoiceDate': t_date.strftime('%Y-%m-%d %H:%M:%S'),
                'TotalAmount': round(qty * unit_price, 2)
            })

    df = pd.DataFrame(transactions)
    df = df.dropna(subset=['CustomerID'])
    df = df[df['TotalAmount'] > 0]
    return df

# --- Data Processing (RFM) ---
def process_rfm(df):
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    snapshot_date = df['InvoiceDate'].max() + timedelta(days=1)
    
    rfm = df.groupby('CustomerID').agg({
        'InvoiceDate': lambda x: (snapshot_date - x.max()).days,
        'CustomerID': 'count',
        'TotalAmount': 'sum'
    })
    
    rfm.rename(columns={'InvoiceDate': 'Recency', 'CustomerID': 'Frequency', 'TotalAmount': 'Monetary'}, inplace=True)
    rfm = rfm[rfm['Monetary'] > 0]
    
    rfm_log = np.log1p(rfm)
    pt = PowerTransformer(method='yeo-johnson')
    rfm_yj = pd.DataFrame(pt.fit_transform(rfm_log), columns=rfm.columns, index=rfm.index)
    
    scaler = StandardScaler()
    rfm_scaled = pd.DataFrame(scaler.fit_transform(rfm_yj), columns=rfm.columns, index=rfm.index)
    
    return rfm, rfm_scaled, scaler, pt

# --- Analytics (CLV, Churn, Outliers) ---
def calculate_clv(rfm, profit_margin=0.2, discount_rate=0.1, lifespan_months=36):
    rfm['Average_Order_Value'] = rfm['Monetary'] / rfm['Frequency']
    rfm['Purchase_Frequency'] = rfm['Frequency'] / 12  # Assuming 1 year data
    rfm['Customer_Value'] = rfm['Average_Order_Value'] * rfm['Purchase_Frequency']
    rfm['CLV'] = rfm['Customer_Value'] * profit_margin * lifespan_months
    
    conditions = [
        (rfm['CLV'] > rfm['CLV'].quantile(0.75)),
        (rfm['CLV'] > rfm['CLV'].quantile(0.25)) & (rfm['CLV'] <= rfm['CLV'].quantile(0.75)),
        (rfm['CLV'] <= rfm['CLV'].quantile(0.25))
    ]
    choices = ['High', 'Medium', 'Low']
    rfm['CLV_Segment'] = np.select(conditions, choices, default='Medium')
    return rfm

def calculate_churn_probability(rfm):
    max_recency = rfm['Recency'].max()
    rfm['Recency_Score'] = rfm['Recency'] / max_recency
    
    max_freq = rfm['Frequency'].max()
    rfm['Freq_Score'] = 1 - (rfm['Frequency'] / max_freq)
    
    rfm['Churn_Probability'] = (rfm['Recency_Score'] * 0.7) + (rfm['Freq_Score'] * 0.3)
    rfm.drop(columns=['Recency_Score', 'Freq_Score'], inplace=True)
    return rfm

# --- ML Clustering ---
def compare_and_select_best_model(data, max_k=8):
    results = {}
    
    # KMeans
    best_k = 2
    best_sil = -1
    for k in range(2, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10).fit(data)
        sil = silhouette_score(data, kmeans.labels_)
        if sil > best_sil:
            best_sil = sil
            best_k = k
    kmeans_best = KMeans(n_clusters=best_k, random_state=42, n_init=10).fit(data)
    results['KMeans'] = {'model': kmeans_best, 'labels': kmeans_best.labels_, 'score': best_sil, 'k': best_k}
    
    # Agglomerative
    agg = AgglomerativeClustering(n_clusters=best_k).fit(data)
    agg_sil = silhouette_score(data, agg.labels_)
    results['Agglomerative'] = {'model': agg, 'labels': agg.labels_, 'score': agg_sil, 'k': best_k}

    # DBSCAN (Simplified)
    dbscan = DBSCAN(eps=0.8, min_samples=5).fit(data)
    n_cl = len(set(dbscan.labels_)) - (1 if -1 in dbscan.labels_ else 0)
    db_sil = silhouette_score(data, dbscan.labels_) if n_cl > 1 else -1
    results['DBSCAN'] = {'model': dbscan, 'labels': dbscan.labels_, 'score': db_sil, 'k': n_cl}

    best_model_name = max(results, key=lambda k: results[k]['score'])
    best_results = results[best_model_name]
    
    return best_model_name, best_results, results

# PCA for visualization
def get_pca_data(scaled_data):
    from sklearn.decomposition import PCA
    pca = PCA(n_components=2)
    pca_result = pca.fit_transform(scaled_data)
    return pca_result.tolist()

# Global initialization
pipeline_data = {}

def init_pipeline():
    print("Initializing ML Pipeline...")
    df = generate_synthetic_data(num_customers=5000, num_transactions=30000)
    rfm_original, rfm_scaled, scaler, pt = process_rfm(df)
    
    best_model_name, best_results, all_results = compare_and_select_best_model(rfm_scaled)
    labels = best_results['labels'].astype(int)
    
    rfm_original['Cluster'] = labels
    rfm_scaled['Cluster'] = labels
    
    rfm_original = calculate_clv(rfm_original)
    rfm_original = calculate_churn_probability(rfm_original)
    
    pca_data = get_pca_data(rfm_scaled.drop(columns=['Cluster']))
    rfm_original['PCA_X'] = [p[0] for p in pca_data]
    rfm_original['PCA_Y'] = [p[1] for p in pca_data]

    pipeline_data['rfm'] = rfm_original
    pipeline_data['rfm_scaled'] = rfm_scaled
    pipeline_data['scaler'] = scaler
    pipeline_data['pt'] = pt
    pipeline_data['model_name'] = best_model_name
    pipeline_data['best_model'] = best_results['model']
    pipeline_data['clusters'] = len(set(labels)) - (1 if -1 in labels else 0)
    print(f"Pipeline initialized. Best Model: {best_model_name} with {pipeline_data['clusters']} clusters.")
    return pipeline_data
