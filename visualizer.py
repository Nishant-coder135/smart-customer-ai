import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from sklearn.decomposition import PCA

def plot_pca_clusters(scaled_data, labels, title="2D PCA Customer Segmentation"):
    """Reduces data to 2D using PCA and plots clusters."""
    pca = PCA(n_components=2)
    pca_result = pca.fit_transform(scaled_data)
    
    df_pca = pd.DataFrame(pca_result, columns=['PCA1', 'PCA2'])
    df_pca['Cluster'] = [str(lbl) for lbl in labels]
    
    fig = px.scatter(
        df_pca, x='PCA1', y='PCA2', color='Cluster',
        title=title,
        template='plotly_dark',
        hover_data=['Cluster']
    )
    fig.update_traces(marker=dict(size=8, opacity=0.8, line=dict(width=1, color='DarkSlateGrey')))
    return fig

def plot_rfm_distribution(df, cluster_col='Cluster'):
    """Plots boxplots for Recency, Frequency, and Monetary by Cluster."""
    df_melted = df.melt(id_vars=[cluster_col], value_vars=['Recency', 'Frequency', 'Monetary'], 
                        var_name='Feature', value_name='Value')
                        
    fig = px.box(
        df_melted, x='Feature', y='Value', color=cluster_col,
        title='RFM Distribution by Cluster',
        template='plotly_dark'
    )
    return fig

def plot_feature_importance(best_model, features=['Recency', 'Frequency', 'Monetary']):
    """Simulates feature importance by looking at cluster centers (for KMeans)."""
    if hasattr(best_model, 'cluster_centers_'):
        centers = best_model.cluster_centers_
        df_centers = pd.DataFrame(centers, columns=features)
        df_centers['Cluster'] = [f"Cluster {i}" for i in range(len(centers))]
        
        # Melt for clustered bar chart
        df_melted = df_centers.melt(id_vars='Cluster', var_name='Feature', value_name='Centroid Value')
        
        fig = px.bar(
            df_melted, x='Feature', y='Centroid Value', color='Cluster', barmode='group',
            title='Feature Impact on Clusters (Standardized Centroids)',
            template='plotly_dark'
        )
        return fig
    else:
        return None

def plot_clv_vs_churn(df, cluster_col='Cluster'):
    """Plots CLV vs Churn Probability."""
    # Ensure no negative values for size
    df = df.copy()
    min_monetary = df['Monetary'].min()
    if min_monetary < 0:
        df['Size_Monetary'] = df['Monetary'] + abs(min_monetary) + 1
    else:
        df['Size_Monetary'] = df['Monetary'].clip(lower=1) # Cap lower bound so size doesn't break
        
    fig = px.scatter(
        df, x='Churn_Probability', y='CLV', color=cluster_col, size='Size_Monetary',
        hover_data=['Recency', 'Frequency', 'Monetary'],
        title='CLV vs Churn Risk (Bubble Size = Monetary Value)',
        template='plotly_dark'
    )
    return fig
