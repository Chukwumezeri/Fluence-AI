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

    db = AsyncClient(project=settings.PROJECT_ID)
    
    # --- Self-Healing: Recover missing assets from session history if needed ---
    if not image_url or not audio_url or not video_url:
        log.info(f'[Assembler] Missing assets, attempting self-healing for session {session_id}')
        try:
            from firestore_session import FirestoreSessionService
            session_service = FirestoreSessionService(db)
            adk_session = await session_service.get_session(
                app_name='fluence_ai',
                user_id=user_id,
                session_id=session_id
            )
            
            if adk_session and hasattr(adk_session, 'events'):
                for event in reversed(adk_session.events):
                    response = getattr(event, 'response', None)
                    if not response or not hasattr(response, 'candidates'):
                        continue
                    
                    for candidate in response.candidates:
                        content = getattr(candidate, 'content', None)
                        if not content or not hasattr(content, 'parts'):
                            continue
                        
                        for part in content.parts:
                            fresp = getattr(part, 'function_response', None)
                            if fresp:
                                name = getattr(fresp, 'name', None)
                                resp_data = getattr(fresp, 'response', None)
                                
                                if not isinstance(resp_data, dict):
                                    continue
                                
                                if name == 'ImageDirectorTool' and not image_url:
                                    image_url = resp_data.get('signed_url')
                                    if image_url: log.info(f'[Assembler] Recovered image_url from history.')
                                
                                if name == 'VoiceoverTool' and not audio_url:
                                    audio_url = resp_data.get('signed_url')
                                    if audio_url: log.info(f'[Assembler] Recovered audio_url from history.')
                                    
                                if name == 'VideoCinematographerTool' and not video_url:
                                    video_url = resp_data.get('signed_url')
                                    if video_url: log.info(f'[Assembler] Recovered video_url from history.')
        except Exception as e:
            log.warning(f'[Assembler] Self-healing failed: {e}')

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
