from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from google import genai
from google.genai import types
import os
import base64

router = APIRouter()

# Setup Gemini Modern Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

def get_simulation_svg(reason="Visual Strategy Generated"):
    """
    Creates a premium, high-fidelity abstract marketing visual using SVG.
    Features: Mesh Gradients, Glassmorphism, and modern data-viz aesthetic.
    """
    return f"""
<svg width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Sophisticated Mesh Gradient Background -->
    <rect width="800" height="800" fill="url(#bg_grad)"/>
    <circle cx="600" cy="200" r="300" fill="url(#orb_1)" filter="url(#blur_1)"/>
    <circle cx="150" cy="650" r="250" fill="url(#orb_2)" filter="url(#blur_1)"/>
    
    <!-- Abstract Data Viz Pattern -->
    <g opacity="0.15">
        <path d="M0 400 Q 200 300 400 400 T 800 400" stroke="white" stroke-width="2"/>
        <path d="M0 450 Q 200 350 400 450 T 800 450" stroke="white" stroke-width="1"/>
        <path d="M0 350 Q 200 250 400 350 T 800 350" stroke="white" stroke-width="1"/>
    </g>

    <!-- Glassmorphism Central Card -->
    <rect x="150" y="250" width="500" height="300" rx="30" fill="white" fill-opacity="0.05" stroke="white" stroke-opacity="0.2"/>
    <rect x="150" y="250" width="500" height="300" rx="30" fill="url(#glass_grad)" style="mix-blend-mode:overlay;"/>
    
    <!-- Brand Elements -->
    <circle cx="400" cy="340" r="40" fill="white" fill-opacity="0.1" stroke="white" stroke-width="2"/>
    <path d="M390 340 L410 340 M400 330 L400 350" stroke="white" stroke-width="3" stroke-linecap="round"/>
    
    <text x="400" y="420" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="900" fill="white" text-anchor="middle" style="letter-spacing:-0.05em;">SmartCustomer AI</text>
    <text x="400" y="460" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" fill="white" fill-opacity="0.7" text-anchor="middle">{reason.upper()}</text>
    
    <!-- Status Badge -->
    <rect x="320" y="490" width="160" height="32" rx="16" fill="white" fill-opacity="0.1"/>
    <circle cx="340" cy="506" r="4" fill="#10B981">
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
    </circle>
    <text x="405" y="511" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="800" fill="white" text-anchor="middle" style="letter-spacing:0.1em;">SYSTEM ACTIVE</text>

    <!-- Definitions -->
    <defs>
        <filter id="blur_1" x="-100" y="-100" width="1000" height="1000" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feGaussianBlur stdDeviation="60"/>
        </filter>
        <linearGradient id="bg_grad" x1="0" y1="0" x2="800" y2="800" gradientUnits="userSpaceOnUse">
            <stop stop-color="#1E1B4B"/>
            <stop offset="1" stop-color="#312E81"/>
        </linearGradient>
        <linearGradient id="orb_1" x1="600" y1="-100" x2="600" y2="500" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6366F1"/>
            <stop offset="1" stop-color="#A855F7" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="orb_2" x1="150" y1="400" x2="150" y2="900" gradientUnits="userSpaceOnUse">
            <stop stop-color="#4F46E5"/>
            <stop offset="1" stop-color="#3B82F6" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glass_grad" x1="150" y1="250" x2="650" y2="550" gradientUnits="userSpaceOnUse">
            <stop stop-color="white" stop-opacity="0.1"/>
            <stop offset="1" stop-opacity="0"/>
        </linearGradient>
    </defs>
</svg>
"""


class VisualRequest(BaseModel):
    prompt: str
    context: dict = {}

@router.post("/generate")
async def generate_visual(data: VisualRequest): 
    prompt = data.prompt
    
    if not client:
        # PROFESSIONAL SIMULATION MODE
        print(f"[Visuals] Running in Simulation Mode for prompt: {prompt}")
        return Response(content=get_simulation_svg(), media_type="image/svg+xml", headers={"X-AI-Status": "simulation"})

    try:
        # Use Imagen-3 via the modern Client
        # 'imagen-3' is a reliable alias, or use 'imagen-3.0-generate-001'
        # Use the verified available identifier
        model_name = "imagen-4.0-generate-001" 
        
        print(f"[Visuals] Generating image for prompt: {prompt} using model: {model_name}")
        
        try:
            # IMPORTANT: It must be plural 'generate_images' AND 'GenerateImagesConfig' in google-genai 1.x
            response = client.models.generate_images(
                model=model_name,
                prompt=f"A professional business marketing visual for: {prompt}",
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1"
                )
            )


            
            # The plural method returns a list of images
            if response.generated_images:
                image_data = response.generated_images[0].image.image_bytes
                return Response(content=image_data, media_type="image/png")
            else:
                raise Exception("No images generated.")
        except Exception as inner_e:
            err_str = str(inner_e).upper()
            reason = "AI QUOTA EXHAUSTED" if "429" in err_str or "EXHAUSTED" in err_str else "Visual Strategy Simulation"
            print(f"Imagen error: {inner_e}. Falling back to simulation.")
            return Response(content=get_simulation_svg(reason), media_type="image/svg+xml", headers={"X-AI-Status": "simulation", "X-AI-Error": str(inner_e)})

            
    except Exception as e:
        print(f"Global visuals error: {e}")
        return Response(content=get_simulation_svg("System Error"), media_type="image/svg+xml", headers={"X-AI-Status": "simulation"})
