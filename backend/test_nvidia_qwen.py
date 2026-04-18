import os
import asyncio
from agentscope.model import OpenAIChatModel

async def test_qwen_thinking():
    api_key = "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"
    
    model = OpenAIChatModel(
        model_name="qwen/qwen3.5-122b-a10b",
        api_key=api_key,
        stream=False,
        client_kwargs={
            "base_url": "https://integrate.api.nvidia.com/v1",
        },
        generate_kwargs={
            "temperature": 0.6,
            "max_tokens": 1024,
            "extra_body": {
                "chat_template_kwargs": {"enable_thinking": True}
            }
        }
    )
    
    messages = [{"role": "user", "content": "Explain why a retail business should focus on customer retention during a festival. Think deeply."}]
    
    print("--- Sending Request to NVIDIA NIM (Qwen 3.5 Thinking Mode) ---")
    try:
        response = await model(messages)
        print("\n--- RESPONSE KEYS ---")
        if isinstance(response, dict):
            print(response.keys())
            # In OpenAI API, text is in choices[0]['message']['content']
            if 'choices' in response:
                content = response['choices'][0]['message']['content']
                print(f"\nContent Snippet: {content[:500]}...")
        else:
            print(dir(response))
        
        # Check if there's any hidden thinking content in the response object
        if hasattr(response, 'raw_response'):
             print("\n--- RAW RESPONSE DATA ---")
             print(str(response.raw_response)[:1000] + "...")
             
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_qwen_thinking())
