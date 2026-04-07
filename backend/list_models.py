import os
from google import genai
from dotenv import load_dotenv

_base = os.path.dirname(os.path.abspath(__file__))
_env = os.path.join(_base, ".env")
load_dotenv(_env)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY)

try:
    for model in client.models.list():
        print(f"Model: {model.name}")
except Exception as e:
    print(f"Error: {e}")
