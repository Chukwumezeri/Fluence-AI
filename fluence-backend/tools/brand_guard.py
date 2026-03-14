import json

from google.cloud.firestore_v1.async_client import AsyncClient
from schemas import CampaignBrief, BrandGuardOutput
from config import settings
import logging

log = logging.getLogger(__name__)

DEFAULT_GUIDELINES = {
    'forbidden_words': ['cheap', 'discount', 'bargain'],
    'required_colors': [],
}


async def BrandGuardTool(brief_json: str, brand_id: str = '') -> dict:
    '''Ground the creative brief against real brand guidelines from the database.

    Args:
        brief_json: JSON string of the campaign brief to validate.
        brand_id: Optional brand profile ID to look up guidelines for.

    Returns:
        A dictionary with validated status, violations list, grounding source, and adjusted brief.
    '''
    brief = CampaignBrief.model_validate_json(brief_json)
    db = AsyncClient(project=settings.PROJECT_ID)
    brand_data = DEFAULT_GUIDELINES
    grounding_source = 'fluence_defaults'

    if brand_id:
        try:
            doc = await db.collection('brand_profiles').document(brand_id).get()
            if doc.exists:
                brand_data = doc.to_dict()
                grounding_source = f'brand_profiles/{brand_id}'
                log.info(f'[GROUNDING] brand_profiles/{brand_id}')
        except Exception as e:
            log.error(f'Firestore error: {e}')

    violations = []
    adjusted = brief.model_copy(deep=True)

    brief_text = ' '.join([
        brief.brand_voice, brief.emotional_hook, brief.visual_direction,
    ]).lower()
    for word in brand_data.get('forbidden_words', []):
        if word.lower() in brief_text:
            violations.append(f'Forbidden term detected: "{word}"')

    if not adjusted.color_palette_hint:
        required = brand_data.get('required_colors', [])
        if required:
            adjusted.color_palette_hint = ', '.join(required[:2])

    return BrandGuardOutput(
        validated=len(violations) == 0,
        violations=violations,
        grounding_source=grounding_source,
        adjusted_brief=adjusted,
    ).model_dump()
