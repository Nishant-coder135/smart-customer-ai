import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta
import os

fake = Faker()
Faker.seed(42)
np.random.seed(42)
random.seed(42)

def generate_synthetic_data(num_customers=5000, num_transactions=25000, output_file='data/retail_data.csv'):
    print(f"Generating synthetic data for {num_customers} customers and {num_transactions} transactions...")
    
    # 1. Generate Customers
    customer_ids = [f"C{str(i).zfill(5)}" for i in range(1, num_customers + 1)]
    
    customer_profiles = {}
    for cid in customer_ids:
        profile_type = np.random.choice(['Budget', 'Average', 'Premium', 'VIP'], p=[0.4, 0.4, 0.15, 0.05])
        if profile_type == 'Budget':
            freq_lam = 2
            spend_mean, spend_std = 25, 10
        elif profile_type == 'Average':
            freq_lam = 5
            spend_mean, spend_std = 75, 25
        elif profile_type == 'Premium':
            freq_lam = 12
            spend_mean, spend_std = 200, 50
        else: # VIP
            freq_lam = 25
            spend_mean, spend_std = 500, 150
            
        customer_profiles[cid] = {
            'type': profile_type,
            'freq_weight': freq_lam,
            'spend_mean': spend_mean,
            'spend_std': spend_std,
            'country': fake.country() if np.random.random() > 0.8 else 'United States'
        }

    # 2. Generate Products
    num_products = 500
    product_ids = [f"P{str(i).zfill(4)}" for i in range(1, num_products + 1)]
    product_categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Toys', 'Beauty', 'Groceries']
    products = {
        pid: {
            'category': np.random.choice(product_categories),
            'base_price': round(np.random.lognormal(mean=3, sigma=1), 2) + 5
        } for pid in product_ids
    }

    # 3. Generate Transactions
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
        
        invoice_no = f"INV{str(i).zfill(6)}"
        
        for _ in range(num_items):
            pid = np.random.choice(product_ids)
            prod = products[pid]
            qty = max(1, int(np.random.poisson(lam=2)))
            
            price_multiplier = max(0.5, np.random.normal(1.0, 0.1)) 
            if prof['type'] == 'Budget':
                price_multiplier *= 0.8
            elif prof['type'] == 'VIP':
                price_multiplier *= 1.2
                
            unit_price = round(prod['base_price'] * price_multiplier, 2)
            
            transactions.append({
                'InvoiceNo': invoice_no,
                'CustomerID': cid,
                'InvoiceDate': t_date.strftime('%Y-%m-%d %H:%M:%S'),
                'ProductID': pid,
                'Category': prod['category'],
                'Quantity': qty,
                'UnitPrice': unit_price,
                'TotalAmount': round(qty * unit_price, 2),
                'Country': prof['country']
            })

    df = pd.DataFrame(transactions)
    
    # Introduce dirty data
    null_idx = np.random.choice(df.index, size=int(len(df)*0.01), replace=False)
    df.loc[null_idx, 'CustomerID'] = np.nan
    
    return_idx = np.random.choice(df.index, size=int(len(df)*0.02), replace=False)
    df.loc[return_idx, 'Quantity'] = -abs(df.loc[return_idx, 'Quantity'])
    df.loc[return_idx, 'TotalAmount'] = -abs(df.loc[return_idx, 'TotalAmount'])
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df.to_csv(output_file, index=False)
    print(f"Data generated and saved to {output_file}")
    
    return df

if __name__ == "__main__":
    generate_synthetic_data()
