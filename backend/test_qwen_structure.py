
import os
import asyncio
import agentscope
from agentscope.model import OpenAIChatModel

async def test():
    agentscope.init()
    model = OpenAIChatModel(
        model_name='qwen/qwen3.5-122b-a10b',
        api_key=os.getenv('NVIDIA_API_KEY'),
        client_kwargs={'base_url': 'https://integrate.api.nvidia.com/v1'},
        generate_kwargs={
            'temperature': 0.1,
            'max_tokens': 1000,
            'extra_body': {'chat_template_kwargs': {'enable_thinking': True}}
        }
    )
    # If key is missing, this will fail, which is fine
    try:
        resp = await model('Solve 2+2 and show your reasoning.')
        print('--- RESPONSE OBJECT ---')
        print(type(resp))
        print('--- CONTENT BLOCKS ---')
        if hasattr(resp, 'content'):
            for i, block in enumerate(resp.content):
                print(f'Block {i} Type: {type(block)}')
                if hasattr(block, 'text'):
                    print(f'Text Content: {block.text[:200]}...')
                elif hasattr(block, 'reasoning'):
                    print(f'Reasoning Content: {block.reasoning[:200]}...')
                else:
                    print(f'Other Content: {str(block)[:200]}...')
        else:
            print('Response has no content attribute.')
            print(resp)
    except Exception as e:
        print(f'Execution Failed: {e}')

if __name__ == '__main__':
    asyncio.run(test())
