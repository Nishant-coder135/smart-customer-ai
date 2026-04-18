import os
import asyncio
import logging
from unittest.mock import MagicMock
from backend import models
from backend.ml_engine.agent_orchestrator import get_agent_orchestrator

# Setup basic logging to see AgentScope output
logging.basicConfig(level=logging.INFO)

async def test_flow():
    print("--- Starting Multi-Agent Flow Test ---")
    
    # 1. Mock Context
    user_id = 123
    mock_user = MagicMock(spec=models.User)
    mock_user.id = user_id
    mock_user.business_type = "urban"
    
    snapshot = "URBAN MODE: 150 customers, total revenue INR 500,000. Segments: VIP (30); Regular (80); At-Risk (40). Festivals: Diwali (April 15)."
    query = "How can I increase my profit this month?"
    
    # 2. Get Orchestrator
    orchestrator = get_agent_orchestrator()
    if not orchestrator._initialized:
        print("Error: Orchestrator not initialized. Check GEMINI_API_KEY.")
        return

    # 3. Execute Workflow
    print(f"Querying Agents for User {user_id}...")
    try:
        response = await orchestrator.get_multi_agent_advice(user_id, snapshot, query)
        print("\n--- FINAL AGENT RESPONSE ---")
        print(response)
        print("----------------------------\n")
        
        # Check for persistence file
        db_path = f"backend/data/agents_memory/user_{user_id}.db"
        if os.path.exists(db_path):
            print(f"Success: Persistence DB created at {db_path}")
        else:
            print("Warning: Persistence DB file not found.")
            
    except Exception as e:
        print(f"Flow failed: {e}")

if __name__ == "__main__":
    # Ensure environment variable is set for the test session
    if not os.environ.get("GEMINI_API_KEY"):
        print("Please set GEMINI_API_KEY environment variable before running this test.")
    else:
        asyncio.run(test_flow())
