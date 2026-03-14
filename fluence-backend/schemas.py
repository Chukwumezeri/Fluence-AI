from pydantic import BaseModel, ConfigDict
from typing import Literal, Optional, List, Any

class CampaignBrief(BaseModel):
    model_config = ConfigDict(extra='ignore')
    product_name:       str
    brand_voice:        Literal['empowering','playful','premium','edgy','warm','authoritative','authentic']
    target_audience:    str
    emotional_hook:     str
    visual_direction:   str
    platform:           Literal['instagram','tiktok','linkedin','youtube','twitter','pinterest']
    color_palette_hint: str = ''
    influencer_persona: Literal['alex','maya','jordan','chloe','custom'] = 'maya'

class BriefExtractorInput(BaseModel):
    conversation_transcript: str
    user_id: str

class BrandGuardInput(BaseModel):
    brief: CampaignBrief
    brand_id: Optional[str] = None

class BrandGuardOutput(BaseModel):
    validated:        bool
    violations:       List[str]
    grounding_source: str
    adjusted_brief:   CampaignBrief

class ImageDirectorInput(BaseModel):
    brief:        CampaignBrief
    shot_type:    Literal['hero','lifestyle','product_close','storyboard_frame'] = 'hero'
    aspect_ratio: Literal['1:1','9:16','16:9'] = '9:16'

class ImageDirectorOutput(BaseModel):
    gcs_uri:         str
    signed_url:      str
    expanded_prompt: str
    director_note:   str
    shot_type:       str

class VideoInput(BaseModel):
    reference_frame_gcs_uri: str
    scene_description:       str
    duration_seconds:        int = 5

class VideoOutput(BaseModel):
    gcs_uri:    Optional[str] = None
    signed_url: Optional[str] = None
    duration:   int = 5
    status:     Literal['ready','processing','failed'] = 'ready'

class CopyInput(BaseModel):
    brief: CampaignBrief

class CopyOutput(BaseModel):
    headline:  str
    body:      str
    cta:       str
    caption:   str
    hashtags:  List[str]

class VoiceoverInput(BaseModel):
    brief:        CampaignBrief
    headline:     str
    voice_persona: Literal['alex','maya','jordan','chloe','zephyr','puck'] = 'maya'

class VoiceoverOutput(BaseModel):
    gcs_uri:       str
    signed_url:    str
    script:        str
    voice_persona: str

class AssemblerInput(BaseModel):
    session_id:        str
    campaign_id:       str
    user_id:           str
    image_output:      Optional[Any] = None
    night_image_output: Optional[Any] = None
    copy_output:       Optional[Any] = None
    audio_output:      Optional[Any] = None
    video_output:      Optional[Any] = None
    brief:             Optional[CampaignBrief] = None
    grounding_source:  str = 'defaults'

# WebSocket content blocks
class NarrationBlock(BaseModel):
    type:      Literal['narration'] = 'narration'
    text:      str
    streaming: bool = False

class ImageBlock(BaseModel):
    type:            Literal['image'] = 'image'
    signed_url:      str
    expanded_prompt: str
    director_note:   str
    shot_type:       str = 'hero'

class VideoBlock(BaseModel):
    type:       Literal['video'] = 'video'
    signed_url: Optional[str] = None
    duration:   int = 5
    status:     str = 'ready'

class CopyBlock(BaseModel):
    type:     Literal['copy'] = 'copy'
    headline: str
    body:     str
    cta:      str
    caption:  str
    hashtags: List[str]

class AudioBlock(BaseModel):
    type:         Literal['audio'] = 'audio'
    signed_url:   str
    script:       str
    voice_persona: str

class BriefBlock(BaseModel):
    type:               Literal['brief'] = 'brief'
    platform:           str
    brand_voice:        str
    color_palette_hint: str
    emotional_hook:     str

class StatusBlock(BaseModel):
    type:    Literal['status'] = 'status'
    message: str

class ErrorBlock(BaseModel):
    type:        Literal['error'] = 'error'
    message:     str
    recoverable: bool = True

class SessionReadyBlock(BaseModel):
    type:       Literal['session_ready'] = 'session_ready'
    session_id: str
    brand_id:   Optional[str] = None

class InterlevedPayload(BaseModel):
    session_id:  str
    campaign_id: str
    blocks:      List[Any]
