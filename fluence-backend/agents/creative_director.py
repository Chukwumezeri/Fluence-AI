from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import BaseSessionService
from google.adk.models import Gemini
from tools import (
    BriefExtractorTool, BrandGuardTool, ImageDirectorTool,
    CopywriterTool, VoiceoverTool, VideoCinematographerTool,
    CampaignAssemblerTool,
)
from prompts import CREATIVE_DIRECTOR_SYSTEM_PROMPT
from config import settings

def get_creative_director_agent(voice_name: str = 'Puck', speed: str = 'normal') -> Agent:
    if speed == 'fast':
        speed_instruction = "\n\nCRITICAL DIRECTIVE: Speak with EXTREME brevity! Use rapid-fire punchy sentences. MAXIMUM 2 short sentences per response. DO NOT use filler words. DO NOT drag out your responses. Keep it FAST."
    elif speed == 'slow':
        speed_instruction = "\n\nCRITICAL DIRECTIVE: You must speak slowly, clearly, and thoughtfully. Take your time with every word."
    else:
        speed_instruction = "\n\nCRITICAL DIRECTIVE: Speak with a natural, human-like conversational pace. Be concise but warm. Do not sound slow, robotic, or overly verbose. Answer directly."
    
    return Agent(
        name=f'fluence_cd_{voice_name.lower()}',
        model=settings.GEMINI_LIVE_MODEL,
        description='FLUENCE — live AI creative director. Listens, thinks, creates.',
        instruction=CREATIVE_DIRECTOR_SYSTEM_PROMPT + speed_instruction,
        tools=[
            BriefExtractorTool,
            BrandGuardTool,
            ImageDirectorTool,
            CopywriterTool,
            VoiceoverTool,
            VideoCinematographerTool,
            CampaignAssemblerTool,
        ],
        generate_content_config={
            'response_modalities': ['AUDIO', 'TEXT'],
            'speech_config': {
                'voice_config': {
                    'prebuilt_voice_config': {'voice_name': voice_name}
                }
            }
        }
    )

def create_runner(app_name: str, session_service: BaseSessionService, voice_name: str = 'Puck', speed: str = 'normal') -> Runner:
    return Runner(
        agent=get_creative_director_agent(voice_name=voice_name, speed=speed),
        app_name=app_name,
        session_service=session_service,
    )
