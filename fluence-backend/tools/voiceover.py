import json

from google.genai import Client
from google.cloud import texttospeech_v1 as tts
from schemas import CampaignBrief
from prompts import VOICEOVER_SCRIPT_PROMPT
from gcs_utils import upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client(vertexai=True, project=settings.PROJECT_ID, location=settings.VERTEX_LOCATION)

VOICE_PERSONAS = {
    'alex':   'en-US-Neural2-D',
    'maya':   'en-US-Neural2-F',
    'jordan': 'en-US-Neural2-A',
    'chloe':  'en-US-Neural2-C',
    'zephyr': 'en-US-Wavenet-F',
    'puck':   'en-US-Wavenet-D',
}


async def VoiceoverTool(brief_json: str, headline: str, voice_persona: str = 'maya') -> dict:
    '''Write a voiceover script and synthesize it with Cloud Text-to-Speech.

    Args:
        brief_json: JSON string of the campaign brief.
        headline: The headline to build the voiceover script around.
        voice_persona: Voice character — alex, maya, jordan, chloe, zephyr, or puck.

    Returns:
        A dictionary with signed_url, script, and voice_persona.
    '''
    brief = CampaignBrief.model_validate_json(brief_json)

    resp = await client.aio.models.generate_content(
        model=settings.GEMINI_PRO_MODEL,
        contents=VOICEOVER_SCRIPT_PROMPT.format(
            brief=brief.model_dump_json(indent=2),
            headline=headline,
            emotional_hook=brief.emotional_hook,
            voice_persona=voice_persona,
        )
    )
    script = resp.text.strip()
    log.info(f'[TTS] Script: {script}')

    voice_name = VOICE_PERSONAS.get(voice_persona, VOICE_PERSONAS['maya'])
    ssml = f'''<speak>
  <prosody rate="medium" pitch="+1st">
    <break time="250ms"/>{script}<break time="400ms"/>
  </prosody>
</speak>'''

    tts_client = tts.TextToSpeechClient()
    tts_resp = tts_client.synthesize_speech(
        input=tts.SynthesisInput(ssml=ssml),
        voice=tts.VoiceSelectionParams(
            language_code=settings.TTS_LANGUAGE, name=voice_name
        ),
        audio_config=tts.AudioConfig(
            audio_encoding=tts.AudioEncoding.MP3,
            speaking_rate=0.93,
            pitch=0.5,
        )
    )

    gcs_uri = await upload_to_gcs(tts_resp.audio_content, 'audio', 'mp3')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return {
        'type': 'audio',
        'gcs_uri': gcs_uri,
        'signed_url': signed_url,
        'script': script,
        'voice_persona': voice_persona,
    }
