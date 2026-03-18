import streamlit as st
import pandas as pd
import numpy as np
import os

from data_generator import generate_synthetic_data
from data_processor import process_pipeline
from ml_models import compare_and_select_best_model
from analytics import calculate_clv, calculate_churn_probability, detect_outliers
from visualizer import plot_pca_clusters, plot_rfm_distribution, plot_feature_importance, plot_clv_vs_churn
from insights import generate_cluster_summaries, generate_marketing_strategies

st.set_page_config(page_title="Advanced Customer Analytics", layout="wide", page_icon="📊")

# --- Constants & Data Loading ---
DATA_PATH = 'data/retail_data.csv'

@st.cache_data
def load_and_prepare_data():
    if not os.path.exists(DATA_PATH):
        generate_synthetic_data(output_file=DATA_PATH)
    
    df_raw, rfm_original, rfm_scaled, scaler, pt = process_pipeline(DATA_PATH)
    
    # Run ML Pipeline
    data_for_clustering = rfm_scaled.drop(columns=['CustomerID'])
    best_model_name, best_results, all_results = compare_and_select_best_model(data_for_clustering)
    
    # Append labels
    rfm_original['Cluster'] = best_results['labels']
    rfm_scaled['Cluster'] = best_results['labels']
    
    # Advanced Analytics
    rfm_original = calculate_clv(rfm_original)
    rfm_original = calculate_churn_probability(rfm_original)
    outliers, outlier_scores = detect_outliers(data_for_clustering)
    rfm_original['Is_Outlier'] = outliers
    
    return df_raw, rfm_original, rfm_scaled, scaler, pt, best_model_name, best_results

# Load cached data
with st.spinner("Initializing Data & Machine Learning Pipeline..."):
    df_raw, df_rfm, df_scaled, scaler, pt, model_name, model_results = load_and_prepare_data()

# --- Sidebar Filters ---
st.sidebar.title("Controls")
st.sidebar.markdown("Filter dataset by Date Range (if desired) or view Global Parameters.")
st.sidebar.info(f"Using Best Model: **{model_name}** with **{model_results.get('optimal_k', len(set(model_results['labels']))) }** clusters.")

# KPI Calculation
total_customers = len(df_rfm)
total_revenue = df_rfm['Monetary'].sum()
avg_clv = df_rfm['CLV'].mean()
high_risk = len(df_rfm[df_rfm['Churn_Probability'] > 0.7]) / total_customers * 100

st.sidebar.divider()
st.sidebar.markdown(f"**Total Customers:** {total_customers:,}")
st.sidebar.markdown(f"**Total Revenue:** ${total_revenue:,.2f}")

# --- Main Layout ---
st.title("📊 Dynamic Customer Intelligence Dashboard")
st.markdown("An advanced pipeline showcasing end-to-end Machine Learning for Customer Segmentation & Analytics.")

# Top KPIs
c1, c2, c3, c4 = st.columns(4)
c1.metric("Active Customers", f"{total_customers:,}")
c2.metric("Avg Lifetime Value", f"${avg_clv:,.2f}")
c3.metric("High Churn Risk (%)", f"{high_risk:.1f}%")
c4.metric("Anomalies Detected", f"{df_rfm['Is_Outlier'].sum()}")

tab1, tab2, tab3, tab4 = st.tabs(["📋 Overview", "🎯 ML Segmentation", "💡 Marketing Insights", "🔮 Real-time Prediction"])

# --- TAB 1: Overview ---
with tab1:
    st.subheader("Raw Data Sample")
    st.dataframe(df_raw.head(10))
    
    st.subheader("RFM + Predictive Metrics Summary")
    st.dataframe(df_rfm.head(10))
    
    st.markdown("### Export Full Processed Data")
    csv = df_rfm.to_csv(index=False).encode('utf-8')
    st.download_button(
        "Download Augmented Data (CSV)",
        csv,
        "customer_segments.csv",
        "text/csv"
    )

# --- TAB 2: ML Segmentation ---
with tab2:
    st.markdown("### Advanced Unsupervised Clustering")
    st.markdown(f"The system evaluated algorithms and automatically selected **{model_name}** as the strongest fit based on Silhouette Scoring.")
    
    colA, colB = st.columns(2)
    with colA:
        fig_pca = plot_pca_clusters(df_scaled.drop(columns=['CustomerID', 'Cluster']), df_rfm['Cluster'])
        st.plotly_chart(fig_pca, use_container_width=True)
    with colB:
        fig_rfm = plot_rfm_distribution(df_rfm)
        st.plotly_chart(fig_rfm, use_container_width=True)
        
    st.markdown("### Model Explanability: Feature Significance")
    if model_name == 'KMeans':
        fig_importance = plot_feature_importance(model_results['model'])
        if fig_importance:
             st.plotly_chart(fig_importance, use_container_width=True)
    else:
        st.info("Feature importance via centroids is primarily available for KMeans in this demo.")

# --- TAB 3: Marketing Insights ---
with tab3:
    st.markdown("### AI-Generated Cluster Intelligence")
    summaries, stats = generate_cluster_summaries(df_rfm)
    strategies = generate_marketing_strategies(stats)
    
    c1, c2 = st.columns([2, 1])
    with c1:
        st.markdown("#### Automated Strategies")
        for cluster, summary in summaries.items():
            st.success(summary)
            st.info(f"**Recommended Strategy:** {strategies[cluster]}")
    
    with c2:
        st.markdown("#### CLV vs Churn Matrix")
        fig_clv = plot_clv_vs_churn(df_rfm)
        st.plotly_chart(fig_clv, use_container_width=True)

# --- TAB 4: Real-time Prediction ---
with tab4:
    st.subheader("Predict Segment for New Customer")
    st.markdown("Enter RFM values to simulate which tier a new customer belongs to.")
    
    with st.form("prediction_form"):
        p_r = st.number_input("Recency (Days since last interaction)", min_value=1, value=15)
        p_f = st.number_input("Frequency (Total Transactions)", min_value=1, value=5)
        p_m = st.number_input("Monetary (Total Spend $)", min_value=1.0, value=150.0)
        
        submit = st.form_submit_button("Predict Segment")
        
    if submit:
        # 1. Transform input same way as training data
        input_data = pd.DataFrame({'Recency': [p_r], 'Frequency': [p_f], 'Monetary': [p_m]})
        
        # We need the log transformer and power transformer fitted previously
        log_transformed = np.log1p(input_data)
        yj_transformed = pt.transform(log_transformed)
        scaled_input = scaler.transform(yj_transformed)
        
        # 2. Predict using best model
        if model_name == 'KMeans':
            model = model_results['model']
            pred = model.predict(scaled_input)[0]
            st.success(f"**Prediction:** Customer belongs to **Cluster {pred}**.")
            st.write(strategies.get(pred, "No strategy found."))
        else:
            st.warning("Real-time prediction in this sandbox is optimized for KMeans. DBSCAN/Agglomerative require recalculating distances against the full dataset.")
