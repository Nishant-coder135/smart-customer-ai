import os
import sys
import asyncio
import logging

# Set up paths
sys.path.append(os.getcwd())

from backend.ml_engine.agent_orchestrator import get_agent_orchestrator

async def test_fallback():
    print("--- [TEST] Triggering Data-Grounded Fallback ---")
    orch = get_agent_orchestrator()
    
    # Mock snapshot with specific numbers
    snapshot = "URBAN MODE: 25 customers, total revenue ₹49,431, ARPU: ₹1,977. Segments: VIP (5); Churn Risk (10). Festivals: Diwali (Nov 1)."
    query = "Top growth strategy"
    
    # We force a failure by passing invalid context or just testing the method directly
    print("\n1. Testing direct fallback method:")
    fallback_report = orch._detailed_data_grounded_fallback(snapshot, query)
    print(fallback_report)
    
    # Check for "exact" numbers
    if "25 customers" in fallback_report and "49,431" in fallback_report:
        print("\n✅ Verification SUCCESS: Exact numbers from snapshot are present in the report.")
    else:
        print("\n❌ Verification FAILED: Exact numbers missing from the report.")

if __name__ == "__main__":
    asyncio.run(test_fallback())
