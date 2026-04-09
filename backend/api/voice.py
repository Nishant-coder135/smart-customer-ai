from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
import os, re
from backend.api.auth import get_current_user
from backend import models

router = APIRouter()

def clean_text_for_speech(text: str) -> str:
    """
    Strips Markdown symbols and specialized tags from text to ensure 
    a clean, professional audio synthesis experience.
    """
    if not text: return ""
    
    # 1. Remove Markdown Bold/Italic (e.g. **text** or *text*)
    text = re.sub(r'\*\*+(.*?)\*\*+', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    
    # 2. Remove Headings (e.g. ### Title)
    text = re.sub(r'#+\s*(.*?)\n', r'\1. ', text)
    text = re.sub(r'#+\s*(.*)', r'\1', text)
    
    # 3. Remove Navigation Tags (e.g. [[TAB:ACTIONS]])
    text = re.sub(r'\[\[.*?\]\]', '', text)
    
    # 4. Remove other Markdown junk
    text = text.replace('_', ' ')
    text = text.replace('`', '')
    
    # 5. Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

# Environment-based configuration
class VoiceRequest(BaseModel):
    text: str

@router.post("/synthesize")
def synthesize_voice(req: VoiceRequest, user: models.User = Depends(get_current_user)):
    """
    Converts text to speech using ElevenLabs. 
    Includes a 'Professional Simulation' mode if the API key is missing.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    
    if not api_key:
        # PROFESSIONAL SIMULATION MODE
        # We return a 1-second silent MP3 buffer to allow the UI to trigger its fallback.
        print("[Voice] ELEVENLABS_API_KEY not found. Running in Intelligence Simulation Mode.")
        
        # A tiny valid MP3 header for "silence" - padded to 1KB for browser compatibility
        silent_mp3_hex = (
            "ff f3 40 c4 00 00 00 03 48 00 00 00 00 4c 41 4d 45 33 2e 39 38 2e 34"
        ).replace(" ", "")
        audio_data = bytes.fromhex(silent_mp3_hex) + (b"\x00" * 1024)
        
        return Response(
            content=audio_data, 
            media_type="audio/mpeg",
            headers={"X-AI-Status": "simulation"}
        )

    try:
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=api_key)
        try:
            voices_response = client.voices.get_all()
            available_ids = [v.voice_id for v in voices_response.voices]
            voice_id = "nPczCjzI2ndSTrZfghLp" if "nPczCjzI2ndSTrZfghLp" in available_ids else (available_ids[0] if available_ids else None)
            if not voice_id:
                raise Exception("No voices available in this ElevenLabs account.")
        except Exception as ve:
            print(f"[ElevenLabs Voice Check Error] {ve}")
            voice_id = "nPczCjzI2ndSTrZfghLp" # fallback to attempt anyway

        # Clean text before synthesis to avoid "asterisk asterisk"
        clean_text = clean_text_for_speech(req.text)
        
        # ElevenLabs v1.0+ uses text_to_speech.convert
        audio_generator = client.text_to_speech.convert(
            text=clean_text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2"
        )
        
        # convert generator to bytes
        audio_data = b"".join(audio_generator)


        
        if not audio_data:
            raise Exception("Empty audio data received from ElevenLabs")
            
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        print(f"[ElevenLabs Error] {e}")
        # Fallback to simulation bytes to trigger frontend browser speech fallback
        silent_mp3_hex = "ff f3 40 c4 00 00 00 03 48 00 00 00 00 4c 41 4d 45 33 2e 39 38 2e 34"
        audio_data = bytes.fromhex(silent_mp3_hex) + (b"\x00" * 1024)
        return Response(content=audio_data, media_type="audio/mpeg", headers={"X-AI-Status": "simulation", "X-AI-Error": str(e)})
