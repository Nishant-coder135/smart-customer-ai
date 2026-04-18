import os
import sys
import asyncio
import logging
import traceback

# Set up paths
sys.path.append(os.getcwd())

# Force environment loading
from dotenv import load_dotenv
load_dotenv('backend/.env')

from backend.ml_engine.agent_orchestrator import get_agent_orchestrator

async def debug_run():
    print(f"--- [DEBUG] Starting Live Orchestrator Test ---")
    print(f"API KEY PRESENT: {bool(os.environ.get('GEMINI_API_KEY'))}")
    
    orch = get_agent_orchestrator()
    
    # Snapshot from User Screenshot
    snapshot = "URBAN MODE: 25 customers, total revenue ₹49,431, ARPU: ₹1,977. Segments: Churn Risk (5); Low Value (10); Regular (9); VIP (1). Festivals: Baisakhi / Ambedkar Jayanti (14 Apr 2026), Buddha Purnima (12 May 2026)."
    query = "Top growth strategy"
    
    try:
        print("Executing get_multi_agent_advice...")
        # We use a dummy user_id that likely hasn't been used to avoid DB locks
        reply = await orch.get_multi_agent_advice(user_id=999, business_snapshot=snapshot, user_query=query)
        print("\n--- RESPONSE RECEIVED ---")
        print(reply[:500])
        
        if "High-Precision Internal Intelligence Report" in reply:
            print("\n❌ FAILED: The system returned the FALLBACK instead of the LIVE response.")
        else:
            print("\n✅ SUCCESS: Live multi-agent response produced.")
            
    except Exception:
        print("\n!!! CRITICAL CRASH IN TEST SCRIPT:")
        print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(debug_run())
