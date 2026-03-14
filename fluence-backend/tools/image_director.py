import json
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel

from google.genai import Client
from schemas import CampaignBrief
from prompts import IMAGE_EXPANSION_PROMPT
from gcs_utils import upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client(vertexai=True, project=settings.PROJECT_ID, location=settings.VERTEX_LOCATION)
vertexai.init(project=settings.PROJECT_ID, location=settings.VERTEX_LOCATION)


async def ImageDirectorTool(brief_json: str, shot_type: str = 'hero', aspect_ratio: str = '9:16') -> dict:
    '''Develop a visual concept from the brief and generate an image with Imagen.

    Args:
        brief_json: JSON string of the campaign brief.
        shot_type: Type of shot — hero, lifestyle, product_close, or storyboard_frame.
        aspect_ratio: Image aspect ratio — 1:1, 9:16, or 16:9.

    Returns:
        A dictionary with signed_url, expanded_prompt, director_note, and shot_type.
    '''
    brief = CampaignBrief.model_validate_json(brief_json)

    expansion = await client.aio.models.generate_content(
        model=settings.GEMINI_PRO_MODEL,
        contents=IMAGE_EXPANSION_PROMPT.format(
            brief=brief.model_dump_json(indent=2),
            shot_type=shot_type,
        )
    )
    master_prompt = expansion.text.strip()
    log.info(f'[IMAGE] Prompt preview: {master_prompt[:80]}...')

    try:
        model_id = settings.IMAGEN_FAST_MODEL
        model = ImageGenerationModel.from_pretrained(model_id)
        images = model.generate_images(
            prompt=master_prompt,
            number_of_images=1,
            aspect_ratio=aspect_ratio,
            add_watermark=False,
            safety_filter_level='block_some',
        )
        image_bytes = images[0]._image_bytes
    except Exception as e:
        if 'safety' in str(e).lower():
            log.warning('Safety filter — retrying with softened prompt')
            model = ImageGenerationModel.from_pretrained(settings.IMAGEN_MODEL)
            images = model.generate_images(
                prompt=master_prompt + ' clean professional editorial photography',
                number_of_images=1, aspect_ratio=aspect_ratio, add_watermark=False,
            )
            image_bytes = images[0]._image_bytes
        else:
            raise

    gcs_uri = await upload_to_gcs(image_bytes, 'images', 'jpg')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return {
        'type': 'image',
        'gcs_uri': gcs_uri,
        'signed_url': signed_url,
        'expanded_prompt': master_prompt,
        'director_note': f'{shot_type} — visual world locked to brief.',
        'shot_type': shot_type,
    }
