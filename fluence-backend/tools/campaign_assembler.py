import json

from google.cloud.firestore_v1.async_client import AsyncClient
from schemas import CampaignBrief
from config import settings
import logging

log = logging.getLogger(__name__)


async def CampaignAssemblerTool(
    session_id: str,
    campaign_id: str,
    user_id: str,
    brief_json: str = '{}',
    image_url: str = '',
    copy_headline: str = '',
    copy_body: str = '',
    copy_cta: str = '',
    audio_url: str = '',
    video_url: str = '',
    grounding_source: str = 'defaults',
) -> dict:
    '''Assemble all generated campaign assets into a final campaign package and save it.

    Args:
        session_id: The current session ID.
        campaign_id: A unique campaign ID.
        user_id: The user who owns this campaign.
        brief_json: JSON string of the campaign brief.
        image_url: Signed URL of the hero image.
        copy_headline: Campaign headline text.
        copy_body: Campaign body text.
        copy_cta: Call-to-action text.
        audio_url: Signed URL of the voiceover audio.
        video_url: Signed URL of the video.
        grounding_source: Source of brand grounding data.

    Returns:
        A dictionary with session_id, campaign_id, status, and block count.
    '''
    blocks = []

    try:
        brief = CampaignBrief.model_validate_json(brief_json)
        product = brief.product_name
    except Exception:
        brief = None
        product = 'your campaign'

    blocks.append({'type': 'narration', 'text': f'Here is your complete {product} campaign.', 'streaming': False})

    if image_url:
        blocks.append({'type': 'image', 'signed_url': image_url, 'expanded_prompt': '', 'director_note': '', 'shot_type': 'hero'})
    if copy_headline:
        blocks.append({'type': 'copy', 'headline': copy_headline, 'body': copy_body, 'cta': copy_cta, 'caption': '', 'hashtags': []})
    if audio_url:
        blocks.append({'type': 'audio', 'signed_url': audio_url, 'script': '', 'voice_persona': 'maya'})
    if video_url:
        blocks.append({'type': 'video', 'signed_url': video_url, 'duration': 5, 'status': 'ready'})
    if brief:
        blocks.append({'type': 'brief', 'platform': brief.platform, 'brand_voice': brief.brand_voice,
                        'color_palette_hint': brief.color_palette_hint, 'emotional_hook': brief.emotional_hook})

    db = AsyncClient(project=settings.PROJECT_ID)
    await db.collection('campaigns').document(campaign_id).set({
        'campaign_id': campaign_id,
        'user_id': user_id,
        'session_id': session_id,
        'status': 'complete',
        'grounding_source': grounding_source,
        'brief': brief.model_dump() if brief else {},
        'assets': {
            'hero_image_url': image_url or None,
            'video_url': video_url or None,
            'voiceover_url': audio_url or None,
            'copy': {'headline': copy_headline, 'body': copy_body, 'cta': copy_cta},
        },
        'blocks_count': len(blocks),
    })
    log.info(f'Campaign saved: {campaign_id} ({len(blocks)} blocks)')

    return {
        'session_id': session_id,
        'campaign_id': campaign_id,
        'status': 'complete',
        'blocks_count': len(blocks),
        'blocks': blocks,
    }
