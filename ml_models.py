import pandas as pd
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score
import warnings
warnings.filterwarnings('ignore')

def find_optimal_clusters_kmeans(data, max_k=10):
    """Finds optimal k using Silhouette Score and Elbow Method."""
    inertias = []
    silhouette_scores = []
    
    k_range = range(2, max_k + 1)
    
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(data)
        
        inertias.append(kmeans.inertia_)
        silhouette_scores.append(silhouette_score(data, labels))
        
    optimal_k = k_range[np.argmax(silhouette_scores)]
    return optimal_k, inertias, silhouette_scores, k_range

def train_kmeans(data, n_clusters):
    """Trains KMeans model."""
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(data)
    sil_score = silhouette_score(data, labels)
    return kmeans, labels, sil_score

def train_dbscan(data, eps=0.5, min_samples=5):
    """Trains DBSCAN model."""
    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    labels = dbscan.fit_predict(data)
    
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    
    if n_clusters > 1:
        sil_score = silhouette_score(data, labels)
    else:
        sil_score = -1
        
    return dbscan, labels, sil_score, n_clusters

def train_agglomerative(data, n_clusters):
    """Trains Agglomerative Clustering model."""
    agg = AgglomerativeClustering(n_clusters=n_clusters)
    labels = agg.fit_predict(data)
    sil_score = silhouette_score(data, labels)
    return agg, labels, sil_score

def compare_and_select_best_model(data, max_k=10):
    """Compares models and returns the best one based on Silhouette Score."""
    results = {}
    
    # 1. K-Means
    optimal_k, inertias, kmeans_sil_scores, k_range = find_optimal_clusters_kmeans(data, max_k)
    kmeans, km_labels, km_sil_score = train_kmeans(data, optimal_k)
    results['KMeans'] = {
        'model': kmeans,
        'labels': km_labels,
        'silhouette_score': km_sil_score,
        'optimal_k': optimal_k,
        'inertias': inertias,
        'k_range': list(k_range),
        'sil_scores_per_k': kmeans_sil_scores
    }
    
    # 2. DBSCAN
    from sklearn.neighbors import NearestNeighbors
    nn = NearestNeighbors(n_neighbors=5)
    nn.fit(data)
    distances, _ = nn.kneighbors(data)
    
    sorted_distances = np.sort(distances[:, 4])
    eps = np.percentile(sorted_distances, 95)
    
    dbscan, db_labels, db_sil_score, db_k = train_dbscan(data, eps=eps, min_samples=5)
    results['DBSCAN'] = {
        'model': dbscan,
        'labels': db_labels,
        'silhouette_score': db_sil_score,
        'optimal_k': db_k
    }
    
    # 3. Agglomerative
    agg, agg_labels, agg_sil_score = train_agglomerative(data, optimal_k)
    results['Agglomerative'] = {
        'model': agg,
        'labels': agg_labels,
        'silhouette_score': agg_sil_score,
        'optimal_k': optimal_k
    }
    
    best_model_name = max(results, key=lambda k: results[k]['silhouette_score'])
    best_results = results[best_model_name]
    
    return best_model_name, best_results, results
