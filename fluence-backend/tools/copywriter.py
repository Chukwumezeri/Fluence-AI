import json

from google.genai import Client
from schemas import CampaignBrief, CopyOutput
from prompts import COPYWRITER_PROMPT, TONE_DESCRIPTIONS
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client(vertexai=True, project=settings.PROJECT_ID, location=settings.VERTEX_LOCATION)


async def CopywriterTool(brief_json: str) -> dict:
    '''Write campaign copy — headline, body, CTA, caption, and hashtags.

    Args:
        brief_json: JSON string of the campaign brief.

    Returns:
        A dictionary with headline, body, cta, caption, and hashtags.
    '''
    brief = CampaignBrief.model_validate_json(brief_json)
    tone = TONE_DESCRIPTIONS.get(brief.brand_voice, 'genuine and specific')
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_PRO_MODEL,
        contents=COPYWRITER_PROMPT.format(
            brief=brief.model_dump_json(indent=2),
            platform=brief.platform,
            tone_description=tone,
        ),
        config={
            'response_mime_type': 'application/json',
            'response_schema': CopyOutput.model_json_schema(),
        }
    )
    result = CopyOutput.model_validate_json(response.text)
    d = result.model_dump()
    d['type'] = 'copy'
    return d
