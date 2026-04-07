def generate_recommendation_and_persona(customer_row):
    segment = customer_row['segment']
    r = customer_row['recency']
    f = customer_row['frequency']
    m = customer_row['monetary']
    
    rec_action = ""
    rec_reason = ""
    rec_impact = ""
    persona = ""
    
    if segment == 'VIP':
        rec_action = "Offer Exclusive Early Access"
        rec_reason = f"High spending (${m:.2f}) and frequent visits."
        rec_impact = "Increase Brand Loyalty and CLV"
        persona = "A highly engaged premium buyer who drives significant revenue."
        
    elif segment == 'Churn Risk':
        rec_action = "Send 20% Win-back Discount"
        rec_reason = f"Inactive for {r} days."
        rec_impact = "Improve Retention and Reactivate"
        persona = "A formerly active customer who is slipping away."
        
    elif segment == 'Regular':
        rec_action = "Suggest Loyalty Program"
        rec_reason = f"Consistent purchase history ({f} times)."
        rec_impact = "Increase Purchase Frequency"
        persona = "A steady, reliable customer."
        
    else: # Low Value
        rec_action = "Promote Bundle Offers"
        rec_reason = "Low average order value."
        rec_impact = "Increase Basket Size"
        persona = "A price-sensitive or infrequent shopper."
        
    # Reason formulation based on clustering specifics
    cluster_reason = []
    if r < 30: cluster_reason.append("Recently active")
    elif r > 100: cluster_reason.append("High recency gap")
    
    if f > 20: cluster_reason.append("high frequency")
    if m > 1000: cluster_reason.append("high spending")
    
    explanation = " + ".join(cluster_reason).capitalize() if cluster_reason else "Average behavior"

    return {
        "action": rec_action,
        "reason": rec_reason,
        "impact": rec_impact,
        "persona_summary": persona,
        "explanation": explanation
    }
