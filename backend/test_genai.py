import os
from dotenv import load_dotenv
try:
    from google import genai
    from google.genai import types as genai_types
    
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found in .env")
        sys.exit(1)
    print(f"Key format looks like: {api_key[:10]}...")
    client = genai.Client(api_key=api_key)
    chat = client.chats.create(model="gemini-2.0-flash")
    resp = chat.send_message("Say hello!")
    print("Response:", resp.text)
except Exception as e:
    import sys
    print("ERROR:", type(e).__name__, "-", e, file=sys.stderr)
