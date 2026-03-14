import asyncio
import json

from google.genai import Client
from schemas import CampaignBrief
from prompts import BRIEF_EXTRACTOR_PROMPT
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client(vertexai=True, project=settings.PROJECT_ID, location=settings.VERTEX_LOCATION)

DEFAULT_BRIEF = CampaignBrief(
    product_name='Unnamed Brand',
    brand_voice='warm',
    target_audience='People who care',
    emotional_hook='Feeling seen and understood',
    visual_direction='Clean, honest, human',
    platform='instagram',
)


async def BriefExtractorTool(conversation_transcript: str, user_id: str) -> dict:
    '''Extract a structured creative brief from the conversation transcript.

    Args:
        conversation_transcript: The full text of the user conversation to extract a brief from.
        user_id: The ID of the user making the request.

    Returns:
        A dictionary containing the extracted campaign brief fields.
    '''
    for attempt in range(3):
        try:
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_PRO_MODEL,
                contents=BRIEF_EXTRACTOR_PROMPT.format(
                    transcript=conversation_transcript
                ),
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': CampaignBrief.model_json_schema(),
                }
            )
            return json.loads(response.text)
        except Exception as e:
            log.warning(f'BriefExtractor attempt {attempt+1} failed: {e}')
            if attempt < 2:
                await asyncio.sleep(1.0)
    
    # Final fallback if all retries fail: raise to let agent handle it
    raise RuntimeError("Critical: Could not extract creative brief after multiple attempts.")

