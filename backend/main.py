import os
import sys

# CRITICAL: Fix imports when running as module (docker) or directly
# This must happen BEFORE any local module imports
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import numpy as np
import uvicorn
from contextlib import asynccontextmanager
from auth import create_user, authenticate_user, get_user_count
from ml_pipeline import init_pipeline, calculate_clv, calculate_churn_probability, get_pca_data
from recommender import generate_recommendation, generate_campaign, assign_segment_labels, calculate_budget_allocation, get_business_insights, get_detailed_strategies

# Global State for the ML Pipeline
pipeline_data = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load and process data on startup
    global pipeline_data
    pipeline_data.update(init_pipeline())
    yield
    # Cleanup on shutdown (if needed)
    pipeline_data.clear()

app = FastAPI(title="SmartCustomer AI API", version="2.1.0-final", lifespan=lifespan)

# Enable CORS for all origins (production + local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



# --- Auth Models ---
class UserAuth(BaseModel):
    username: str
    password: str
    email: str = None

# --- Pydantic Models ---
class PredictionInput(BaseModel):
    recency: float
    frequency: float
    monetary: float

# --- Routes ---

@app.get("/api/dashboard/kpis")
def get_dashboard_kpis():
    if not pipeline_data:
        raise HTTPException(status_code=503, detail="Pipeline data not initialized.")
        
    df = pipeline_data['rfm']
    total_customers = len(df)
    total_revenue = float(df['Monetary'].sum())
    high_churn_risk = float((len(df[df['Churn_Probability'] > 0.7]) / total_customers) * 100)
    avg_clv = float(df['CLV'].mean())
    active_customers = len(df[df['Churn_Probability'] <= 0.7])

    return {
        "TotalCustomers": total_customers,
        "TotalRevenue": total_revenue,
        "HighChurnRiskPct": high_churn_risk,
        "AvgLifetimeValue": avg_clv,
        "ActiveCustomers": active_customers
    }

@app.get("/api/dashboard/clusters")
def get_clusters_data():
    if not pipeline_data:
        raise HTTPException(status_code=503, detail="Pipeline data not initialized.")
        
    df = pipeline_data['rfm']
    labels = assign_segment_labels(df)
    
    # PCA data for scatter plot
    pca_data = []
    for idx, row in df.iterrows():
        cluster_id = int(row['Cluster'])
        pca_data.append({
            "id": idx,
            "x": float(row['PCA_X']),
            "y": float(row['PCA_Y']),
            "cluster": cluster_id,
            "segmentLabel": labels.get(cluster_id, "Unknown"),
            "rfm": {
                "r": float(row['Recency']),
                "f": float(row['Frequency']),
                "m": float(row['Monetary'])
            }
        })
        
    # Pie chart distribution data
    distribution = df['Cluster'].value_counts().to_dict()
    pie_data = [{"name": labels.get(k, f"Cluster {k}"), "value": int(v)} for k, v in distribution.items()]
    
    return {
        "pcaData": pca_data,
        "pieData": pie_data
    }

@app.get("/api/advisor/insights")
def get_advisor_insights():
    if not pipeline_data:
         raise HTTPException(status_code=503, detail="Pipeline data not initialized.")
         
    df = pipeline_data['rfm']
    insights = get_business_insights(df)
    budget = calculate_budget_allocation(df)
    
    return {
        "insights": insights,
        "budgetAllocation": budget
    }

@app.post("/api/predict")
def predict_segment(input_data: PredictionInput):
    if not pipeline_data:
        raise HTTPException(status_code=503, detail="Pipeline not initialized.")
        
    pt = pipeline_data['pt']
    scaler = pipeline_data['scaler']
    model = pipeline_data['best_model']
    model_name = pipeline_data['model_name']
    df = pipeline_data['rfm']
    
    # Prepare input
    # Notice we expect recency, frequency, monetary
    input_df = pd.DataFrame({
        'Recency': [input_data.recency],
        'Frequency': [input_data.frequency],
        'Monetary': [input_data.monetary]
    })
    
    # 1. Pipeline Transformations (Log -> Yeo-Johnson -> StandardScale)
    log_transformed = np.log1p(input_df)
    yj_transformed = pd.DataFrame(pt.transform(log_transformed), columns=input_df.columns, index=input_df.index)
    scaled_input = pd.DataFrame(scaler.transform(yj_transformed), columns=input_df.columns, index=input_df.index)
    
    # 2. Model Prediction
    if model_name in ['KMeans', 'Agglomerative']: # For this demo, we assume we can run .predict or it's KMeans
        if hasattr(model, 'predict'):
            cluster_pred = int(model.predict(scaled_input)[0])
        else:
             # Fallback if agglomerative doesn't support predict out of box easily
            from sklearn.metrics import pairwise_distances
            # Find nearest cluster center from training data
            centroids = pipeline_data['rfm_scaled'].groupby('Cluster').mean()
            dists = pairwise_distances(scaled_input, centroids)
            cluster_pred = int(dists.argmin())
    else:
        # Simplification for DBSCAN nearest neighbor fallback
         from sklearn.metrics import pairwise_distances
         centroids = pipeline_data['rfm_scaled'].groupby('Cluster').mean()
         dists = pairwise_distances(scaled_input, centroids)
         cluster_pred = int(dists.argmin())
         
    # 3. Analytics
    rfm_dict = input_df.iloc[0].to_dict()
    df = pipeline_data['rfm']
    # Dummy calculation for single instance to keep it fast
    max_recency = df['Recency'].max()
    max_freq = df['Frequency'].max()
    r_score = min(1.0, rfm_dict['Recency'] / max_recency)
    f_score = max(0.0, 1 - (rfm_dict['Frequency'] / max_freq))
    churn_prob = float((r_score * 0.7) + (f_score * 0.3))
    
    aov = rfm_dict['Monetary'] / max(1, rfm_dict['Frequency'])
    cv = aov * (rfm_dict['Frequency'] / 12)
    clv_val = cv * 0.2 * 36
    
    clv_category = "Medium"
    if clv_val > df['CLV'].quantile(0.75): clv_category = "High"
    elif clv_val <= df['CLV'].quantile(0.25): clv_category = "Low"
    
    # 4. Generate Recommendations
    labels = assign_segment_labels(df)
    segment_label = labels.get(cluster_pred, "Unknown")
    
    recommendation = generate_recommendation(segment_label, rfm_dict, churn_prob, clv_category)
    campaign = generate_campaign(segment_label, {})
    
    return {
        "PredictedCluster": cluster_pred,
        "SegmentLabel": segment_label,
        "ChurnProbability": churn_prob,
        "EstimatedCLV": clv_val,
        "CLVCategory": clv_category,
        "Recommendation": recommendation,
        "CampaignSuggest": campaign
    }

@app.get("/api/advisor/strategies")
async def get_strategies():
    if not pipeline_data:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")
    return get_detailed_strategies(pipeline_data['rfm'])

@app.get("/api/admin/stats")
async def get_admin_stats():
    return {
        "total_users": get_user_count(),
        "backend_version": "2.1.0-ai-enhanced",
        "active_models": ["KMeans", "RFM", "CLV-Predictor"]
    }

# --- Authentication Endpoints ---
@app.post("/api/auth/signup")
async def signup(user: UserAuth):
    success, message = create_user(user.username, user.email, user.password)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"message": message}

@app.post("/api/auth/login")
async def login(user: UserAuth):
    if not authenticate_user(user.username, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "username": user.username}

# Serve the frontend as a static site
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
frontend_dir = os.path.abspath(frontend_dir)
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
