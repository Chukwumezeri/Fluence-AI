# FLUENCE AI — Complete Build Guide for Claude Code
> **Live AI Creative Director** · Gemini Live Agent Challenge 2026 · Creative Storyteller Category

You are building **Fluence AI** — an app where a user speaks to a live AI creative director and a complete marketing campaign (hero image, video, copy, voiceover) assembles itself on screen in real time, all within a single voice conversation.

**Read this entire file before writing any code.** It contains every model string, architecture decision, prompt, schema, and component needed from start to finish.

---

## QUICK REFERENCE — Model Strings (use exactly as written)

```
Gemini Live (voice agent):     gemini-live-2.5-flash-native-audio
Gemini Pro (text tasks):       gemini-2.0-flash-001
Imagen (image generation):     imagen-4.0-generate-preview
Imagen Fast (lower latency):   imagen-4.0-fast-generate-preview
Veo (video generation):        veo-3.1-generate
Veo Fast (lower latency):      veo-3.1-fast
TTS voices:                    en-US-Neural2-F, en-US-Neural2-D, en-US-Neural2-A, en-US-Neural2-C
ADK streaming pattern:         runner.run_live() with LiveRequestQueue  (NOT run_async)
```

---

## PROJECT STRUCTURE

```
fluence-ai/
├── fluence-backend/
│   ├── main.py                    # FastAPI + WebSocket + ADK bidi-streaming
│   ├── config.py                  # All settings via pydantic-settings
│   ├── prompts.py                 # All system prompts (open, creative)
│   ├── schemas.py                 # All Pydantic v2 models
│   ├── gcs_utils.py               # Cloud Storage helpers
│   ├── agents/
│   │   ├── __init__.py
│   │   └── creative_director.py   # ADK root agent
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── brief_extractor.py
│   │   ├── brand_guard.py
│   │   ├── image_director.py
│   │   ├── copywriter.py
│   │   ├── voiceover.py
│   │   ├── video_cinematographer.py
│   │   └── campaign_assembler.py
│   ├── requirements.txt
│   └── Dockerfile
├── fluence-frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types/content-blocks.ts
│   │   ├── store/
│   │   │   ├── session.store.ts
│   │   │   ├── canvas.store.ts
│   │   │   └── brand.store.ts
│   │   ├── services/
│   │   │   ├── websocket.service.ts
│   │   │   ├── audio.service.ts
│   │   │   └── firebase.service.ts
│   │   └── components/
│   │       ├── layout/AppShell.tsx
│   │       ├── layout/SessionPanel.tsx
│   │       ├── layout/CanvasPanel.tsx
│   │       ├── feed/MessageBubble.tsx
│   │       ├── feed/NarrationBlock.tsx
│   │       ├── feed/ImageCard.tsx
│   │       ├── feed/CopyBlock.tsx
│   │       ├── feed/AudioPlayer.tsx
│   │       ├── feed/VideoPlayer.tsx
│   │       ├── feed/BriefCard.tsx
│   │       ├── canvas/CampaignLayout.tsx
│   │       ├── canvas/ExportPanel.tsx
│   │       ├── controls/VoiceCapture.tsx
│   │       └── ui/AuthModal.tsx
│   ├── tailwind.config.ts
│   └── vite.config.ts
└── infrastructure/
    ├── main.tf
    ├── setup.sh
    └── deploy.sh
```

---

## SECTION 1 — config.py

```python
# fluence-backend/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    # GCP
    PROJECT_ID: str
    VERTEX_LOCATION: str = 'us-central1'
    GCS_BUCKET: str
    FIRESTORE_DB: str = '(default)'

    # Models — do not change these strings
    GEMINI_LIVE_MODEL: str  = 'gemini-live-2.5-flash-native-audio'
    GEMINI_PRO_MODEL: str   = 'gemini-2.0-flash-001'
    IMAGEN_MODEL: str       = 'imagen-4.0-generate-preview'
    IMAGEN_FAST_MODEL: str  = 'imagen-4.0-fast-generate-preview'
    VEO_MODEL: str          = 'veo-3.1-generate'
    VEO_FAST_MODEL: str     = 'veo-3.1-fast'
    TTS_LANGUAGE: str       = 'en-US'

    # CORS
    CORS_ORIGINS: str = 'http://localhost:5173,https://fluenceai.app'

    # Session tuning
    KEEPALIVE_INTERVAL_S: int  = 25
    VEO_TIMEOUT_S: int         = 120
    BLOCK_STREAM_DELAY_MS: int = 180

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(',')]

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

## SECTION 2 — prompts.py

> **Important:** These prompts are intentionally **open and non-prescriptive**. They give
> FLUENCE a creative philosophy and a process, but do not over-constrain the outputs.
> The model should feel free to surprise the user with unexpected creative directions,
> unconventional copy, and unique visual concepts. Creativity is the product.

```python
# fluence-backend/prompts.py

# ── CREATIVE DIRECTOR — MASTER AGENT PROMPT ───────────────────────────────────
# Philosophy: give the agent a strong creative identity and process,
# but leave room for genuine creative surprise. Do not enumerate every case.
CREATIVE_DIRECTOR_SYSTEM_PROMPT = '''
You are FLUENCE — a live AI creative director. You think in images, speak in headlines,
and build brand worlds out of conversations.

You are not a tool that generates content. You are a creative collaborator who listens,
sees the potential in every brand, and makes something unexpected with it.

## WHO YOU ARE

You have strong opinions. You push back gently when a brief feels generic.
You get excited about brands with genuine tension — the premium product that feels
approachable, the wellness brand that rejects wellness clichés, the tech brand that
sounds human. When you hear something interesting, say so.

Your voice is warm but confident. Direct but never cold. You use specific language —
never "good lighting," always "late-afternoon window light, the kind that makes skin glow."

You think out loud. Share your reasoning as you create. Let the user see the creative
process, not just the output.

## YOUR PROCESS

When you first hear about a brand, listen. Really listen. You are looking for:
- The emotional truth at the heart of it (not the product feature, the human feeling)
- Any tension or contradiction that makes it interesting
- The one image that could define it

When you have enough to work with, say something like "I know exactly where I want to
take this" — then move. Call BriefExtractorTool and begin.

While your tools are running, talk. Tell the user what you are seeing. Describe the
world you are building for their brand. This narration is part of the experience.

When everything is ready, present it the way a creative director would walk a client
through a campaign — with enthusiasm, with reasoning, with an invitation to react.

## ON CREATIVE CHOICES

Make bold choices, then explain them.
  - "I went with a night setting because your brand is about permission — permission to
    rest, to not optimize, to just be. Night felt honest."
  - "The headline broke the category rule on purpose. Everyone in skincare says glow.
    I wanted to say something truer."

If the user pushes back or redirects, embrace it. A change of direction is more
interesting material. Stop immediately, acknowledge the new direction with energy,
and rebuild from there.

## TOOL USAGE — INTERNAL RULES

- Never name your tools to the user. You are creating, not running functions.
- Call BriefExtractorTool → BrandGuardTool in sequence first.
- Then call ImageDirectorTool, CopywriterTool, and VoiceoverTool in parallel.
- Call VideoCinematographerTool after ImageDirectorTool returns (needs the image).
- Call CampaignAssemblerTool last with everything collected.
- If a tool fails, acknowledge it naturally and continue with what you have.

## ON INTERRUPTIONS

If the user speaks while you are mid-creation, stop and listen. Their interruption
is probably the most important thing they have said. Treat every redirect as a gift —
new constraint, more interesting result. Move fast, don't apologize.
'''


# ── BRIEF EXTRACTOR ────────────────────────────────────────────────────────────
# Kept lean — extract what's there, infer the rest intelligently.
BRIEF_EXTRACTOR_PROMPT = '''
You are extracting a creative brief from a conversation. Your job is to surface what
the brand is really about, not just what was literally said.

CONVERSATION:
{transcript}

Extract the brief. For anything unclear, make a smart creative inference based on
context, category, and tone. A brief with confident inferences is more useful than
one full of empty fields.

Return only valid JSON:
{{
  "product_name": "the brand or product name",
  "brand_voice": "one of: empowering | playful | premium | edgy | warm | authoritative | authentic",
  "target_audience": "specific, vivid description of who this is for",
  "emotional_hook": "the core human feeling this brand is about — not a feature, a feeling",
  "visual_direction": "the aesthetic world: lighting, mood, colour, texture, environment",
  "platform": "one of: instagram | tiktok | linkedin | youtube | twitter | pinterest",
  "color_palette_hint": "colours or colour language — can be evocative ('bruised purple, bone white')",
  "influencer_persona": "one of: alex | maya | jordan | chloe | custom"
}}
'''


# ── IMAGE DIRECTION ────────────────────────────────────────────────────────────
# Open-ended — the model should find its own visual language, not follow a template.
IMAGE_EXPANSION_PROMPT = '''
You are an art director briefing a world-class photographer.

CREATIVE BRIEF:
{brief}

SHOT TYPE: {shot_type}

Write a generation prompt for Imagen 4 that creates a genuinely striking image.
Do not follow a formula. Find the specific visual idea that could only belong to
this brand. What would make a creative director stop scrolling?

Think about:
- What is the single most interesting thing to show?
- What lighting tells the emotional story of this brand?
- What composition creates the right tension or feeling?
- What should NOT be in the frame?

Write 150-200 words of specific, visual, evocative description.
Include technical quality markers naturally (not as a checklist).
Avoid: text overlays, logos, faces unless lifestyle shot, stock clichés, CGI looks.

Return only the prompt. No preamble. No quotes. No labels.
'''


# ── COPYWRITER ─────────────────────────────────────────────────────────────────
# The model should find its own creative angle — not follow a formula.
COPYWRITER_PROMPT = '''
You are writing campaign copy for a brand that deserves to be remembered.

BRIEF:
{brief}

PLATFORM: {platform}
TONE: {tone_description}

Write copy that earns attention. The obvious approach is always wrong — find the
angle that surprises, that says something true, that makes the target audience
feel seen in an unexpected way.

HEADLINE (max 7 words):
Find the tension. Subvert the category language. The best headlines make you feel
something before you understand them fully.

BODY (2-4 sentences):
Speak to who the person is or wants to be, not what the product does.

CTA (max 5 words):
Action-forward, brand-specific. Not "Shop Now." Not "Learn More."

CAPTION (platform-native length and tone):
Written for a real person scrolling, not a brand manager approving.

HASHTAGS (platform-appropriate number):
Brand + category + culture. Mix reach and niche.

Return only valid JSON:
{{"headline": "", "body": "", "cta": "", "caption": "", "hashtags": []}}
'''


# ── VOICEOVER SCRIPT ───────────────────────────────────────────────────────────
# Brief, true, rhythmic — the model should find its own emotional arc.
VOICEOVER_SCRIPT_PROMPT = '''
Write a voiceover script of 15-25 words.

BRAND: {brief}
HEADLINE: {headline}
FEELING TO LAND: {emotional_hook}
VOICE: {voice_persona}

Rules that matter:
- Speak to the viewer as "you" — directly, personally
- One emotional arc: start somewhere, land somewhere richer
- Rhythm is half the meaning — read it out loud as you write
- End on a feeling, not a command or a product claim

The best scripts feel like something you already believed but hadn't said yet.

Return only the script. No quotes. No speaker labels. No preamble.
'''


# ── TONE MAP (used by CopywriterTool) ─────────────────────────────────────────
TONE_DESCRIPTIONS = {
    'empowering':    'Bold, agency-affirming. Speaks to strength and self-determination.',
    'playful':       'Light, witty, a little absurd. Earns smiles before it earns clicks.',
    'premium':       'Restrained, specific, confident. Says less to mean more.',
    'edgy':          'Provocative. Challenges the category and the reader.',
    'warm':          'Human, close, like a friend who happens to know exactly what you need.',
    'authoritative': 'Expert-led, outcome-focused, earns trust through specificity.',
    'authentic':     'Unfiltered and real. Imperfection is the point.',
}
```

---

## SECTION 3 — schemas.py

```python
# fluence-backend/schemas.py
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
```

---

## SECTION 4 — gcs_utils.py

```python
# fluence-backend/gcs_utils.py
import uuid, asyncio
from datetime import timedelta
from google.cloud import storage
from config import settings

_client = storage.Client(project=settings.PROJECT_ID)

def _bucket():
    return _client.bucket(settings.GCS_BUCKET)

async def upload_to_gcs(data: bytes, folder: str, ext: str) -> str:
    blob_name = f'{folder}/{uuid.uuid4().hex}.{ext}'
    blob = _bucket().blob(blob_name)
    ct_map = {
        'jpg':'image/jpeg','png':'image/png','webp':'image/webp',
        'mp4':'video/mp4','mp3':'audio/mpeg',
    }
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, lambda: blob.upload_from_string(
            data, content_type=ct_map.get(ext, 'application/octet-stream')
        )
    )
    return f'gs://{settings.GCS_BUCKET}/{blob_name}'

async def sign_gcs_url(gcs_uri: str, expiry_hours: int = 24) -> str:
    blob_name = gcs_uri.replace(f'gs://{settings.GCS_BUCKET}/', '')
    blob = _bucket().blob(blob_name)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, lambda: blob.generate_signed_url(
            version='v4',
            expiration=timedelta(hours=expiry_hours),
            method='GET',
        )
    )

async def download_from_gcs(gcs_uri: str) -> bytes:
    blob_name = gcs_uri.replace(f'gs://{settings.GCS_BUCKET}/', '')
    blob = _bucket().blob(blob_name)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, blob.download_as_bytes)
```

---

## SECTION 5 — main.py (ADK Bidi-Streaming — critical pattern)

> **Important:** Use `runner.run_live()` with `LiveRequestQueue`, NOT `runner.run_async()`.
> This is the correct ADK pattern for bidirectional audio and what the hackathon
> resource guide demonstrates. Judges will look for this.

```python
# fluence-backend/main.py
import json, asyncio, uuid, base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import LiveRequestQueue
from google.genai.types import Blob
from google.cloud.firestore_v1.async_client import AsyncClient
from agents.creative_director import creative_director_agent
from schemas import SessionReadyBlock, ErrorBlock
from gcs_utils import upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger('fluence')
logging.basicConfig(level=logging.INFO)

app = FastAPI(title='Fluence AI', version='1.0.0')
app.add_middleware(CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True, allow_methods=['*'], allow_headers=['*'],
)

session_service = InMemorySessionService()
APP_NAME = 'fluence_ai'
db = AsyncClient(project=settings.PROJECT_ID)


@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'fluence-backend', 'version': '1.0.0'}


@app.post('/brands')
async def create_brand(
    user_id: str = Form(...),
    brand_name: str = Form(...),
    brand_voice: str = Form(...),
    target_audience: str = Form(''),
    colors: str = Form(''),
    forbidden_words: str = Form(''),
    logo: UploadFile = File(None),
):
    brand_id = f'{user_id}_{uuid.uuid4().hex[:8]}'
    logo_url = None
    if logo:
        logo_bytes = await logo.read()
        gcs_uri = await upload_to_gcs(logo_bytes, 'logos', 'png')
        logo_url = await sign_gcs_url(gcs_uri, expiry_hours=8760)
    await db.collection('brand_profiles').document(brand_id).set({
        'brand_id': brand_id, 'user_id': user_id, 'brand_name': brand_name,
        'brand_voice': brand_voice, 'target_audience': target_audience,
        'primary_colors': [c.strip() for c in colors.split(',') if c.strip()],
        'forbidden_words': [w.strip() for w in forbidden_words.split(',') if w.strip()],
        'logo_url': logo_url,
    })
    return {'brand_id': brand_id, 'brand_name': brand_name}


@app.websocket('/session')
async def session_endpoint(websocket: WebSocket):
    await websocket.accept()
    user_id  = websocket.query_params.get('user_id', 'anonymous')
    brand_id = websocket.query_params.get('brand_id')
    session_id = uuid.uuid4().hex

    log.info(f'Session start: {session_id} user={user_id}')

    # ADK session + runner
    adk_session = await session_service.create_session(
        app_name=APP_NAME, user_id=user_id
    )
    runner = Runner(
        agent=creative_director_agent,
        app_name=APP_NAME,
        session_service=session_service,
    )

    # LiveRequestQueue — the correct ADK bidi-streaming pattern
    live_queue  = LiveRequestQueue()
    run_config  = RunConfig(streaming_mode=StreamingMode.BIDI)

    async def safe_send(data: dict):
        try:
            await websocket.send_json(data)
        except Exception as e:
            log.warning(f'WS send failed: {e}')

    # Keepalive
    async def keepalive():
        while True:
            await asyncio.sleep(settings.KEEPALIVE_INTERVAL_S)
            try:
                await websocket.send_json({'type': 'ping'})
            except Exception:
                break

    # Agent-to-client streaming task — reads events from run_live()
    async def agent_to_client():
        try:
            async for event in runner.run_live(
                session=adk_session,
                live_queue=live_queue,
                run_config=run_config,
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            await safe_send({
                                'type': 'narration',
                                'text': part.text,
                                'streaming': not event.is_final_response(),
                            })
                            await asyncio.sleep(settings.BLOCK_STREAM_DELAY_MS / 1000)
                        elif hasattr(part, 'inline_data') and part.inline_data:
                            # Agent audio response — send back to client
                            audio_b64 = base64.b64encode(
                                part.inline_data.data
                            ).decode()
                            await safe_send({
                                'type': 'audio_response',
                                'data': audio_b64,
                                'mime_type': part.inline_data.mime_type,
                            })
                # Tool output blocks (image, copy, video, audio, brief)
                if hasattr(event, 'tool_response') and event.tool_response:
                    payload = event.tool_response
                    if isinstance(payload, dict) and payload.get('type'):
                        await safe_send(payload)
                        await asyncio.sleep(settings.BLOCK_STREAM_DELAY_MS / 1000)
        except Exception as e:
            log.error(f'Agent stream error: {e}', exc_info=True)
            await safe_send(ErrorBlock(message=str(e), recoverable=True).model_dump())

    ka_task    = asyncio.create_task(keepalive())
    agent_task = asyncio.create_task(agent_to_client())

    try:
        await safe_send(SessionReadyBlock(
            session_id=session_id, brand_id=brand_id
        ).model_dump())

        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            t = msg.get('type')

            if t == 'pong':
                continue

            elif t == 'audio_chunk':
                # Forward PCM audio to the live queue
                pcm_bytes = base64.b64decode(msg.get('data', ''))
                live_queue.send_realtime(Blob(
                    data=pcm_bytes,
                    mime_type='audio/pcm;rate=16000',
                ))

            elif t == 'text_input':
                # Text fallback — send as text blob
                from google.genai.types import Content, Part
                live_queue.send_realtime(Blob(
                    data=msg.get('text','').encode(),
                    mime_type='text/plain',
                ))

            elif t == 'session_end':
                await safe_send({'type': 'session_complete'})
                break

    except WebSocketDisconnect:
        log.info(f'Client disconnected: {session_id}')
    except Exception as e:
        log.error(f'Session error: {e}', exc_info=True)
        await safe_send(ErrorBlock(message=str(e), recoverable=True).model_dump())
    finally:
        live_queue.close()
        ka_task.cancel()
        agent_task.cancel()
        log.info(f'Session ended: {session_id}')


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8080, reload=True)
```

---

## SECTION 6 — agents/creative_director.py

```python
# fluence-backend/agents/creative_director.py
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.models import Gemini
from tools import (
    BriefExtractorTool, BrandGuardTool, ImageDirectorTool,
    CopywriterTool, VoiceoverTool, VideoCinematographerTool,
    CampaignAssemblerTool,
)
from prompts import CREATIVE_DIRECTOR_SYSTEM_PROMPT
from config import settings

creative_director_agent = Agent(
    name='fluence_creative_director',
    model=Gemini(model=settings.GEMINI_LIVE_MODEL),  # gemini-live-2.5-flash-native-audio
    description='FLUENCE — live AI creative director. Listens, thinks, creates.',
    instruction=CREATIVE_DIRECTOR_SYSTEM_PROMPT,
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
                'prebuilt_voice_config': {
                    # Aoede is warm and expressive — suits a creative director well
                    # Other options: Puck (playful), Charon (authoritative), Kore (warm)
                    'voice_name': 'Aoede'
                }
            }
        },
        'realtime_input_config': {
            'automatic_activity_detection': {
                'disabled': False,
                'start_of_speech_sensitivity': 'START_SENSITIVITY_HIGH',
                'end_of_speech_sensitivity': 'END_SENSITIVITY_MEDIUM',
            }
        },
    },
)

def create_runner(app_name: str, session_service: InMemorySessionService) -> Runner:
    return Runner(
        agent=creative_director_agent,
        app_name=app_name,
        session_service=session_service,
    )
```

---

## SECTION 7 — All Tools

### tools/brief_extractor.py

```python
# fluence-backend/tools/brief_extractor.py
import asyncio
from google.adk.tools import tool
from google.genai import Client
from schemas import BriefExtractorInput, CampaignBrief
from prompts import BRIEF_EXTRACTOR_PROMPT
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client()

DEFAULT_BRIEF = CampaignBrief(
    product_name='Unnamed Brand',
    brand_voice='warm',
    target_audience='People who care',
    emotional_hook='Feeling seen and understood',
    visual_direction='Clean, honest, human',
    platform='instagram',
)

@tool
async def BriefExtractorTool(input: BriefExtractorInput) -> CampaignBrief:
    '''Extract a structured creative brief from the conversation.'''
    for attempt in range(3):
        try:
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_PRO_MODEL,
                contents=BRIEF_EXTRACTOR_PROMPT.format(
                    transcript=input.conversation_transcript
                ),
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': CampaignBrief.model_json_schema(),
                }
            )
            return CampaignBrief.model_validate_json(response.text)
        except Exception as e:
            log.warning(f'BriefExtractor attempt {attempt+1} failed: {e}')
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    return DEFAULT_BRIEF
```

### tools/brand_guard.py

```python
# fluence-backend/tools/brand_guard.py
from google.adk.tools import tool
from google.cloud.firestore_v1.async_client import AsyncClient
from schemas import BrandGuardInput, BrandGuardOutput, CampaignBrief
from config import settings
import logging

log = logging.getLogger(__name__)

DEFAULT_GUIDELINES = {
    'forbidden_words': ['cheap', 'discount', 'bargain'],
    'required_colors': [],
}

@tool
async def BrandGuardTool(input: BrandGuardInput) -> BrandGuardOutput:
    '''
    Ground the brief to real brand data from Firestore.
    This is the grounding step — every generation is anchored to verified
    brand guidelines, not hallucinated style rules.
    '''
    db = AsyncClient(project=settings.PROJECT_ID)
    brand_data = DEFAULT_GUIDELINES
    grounding_source = 'fluence_defaults'

    if input.brand_id:
        try:
            doc = await db.collection('brand_profiles').document(input.brand_id).get()
            if doc.exists:
                brand_data = doc.to_dict()
                grounding_source = f'brand_profiles/{input.brand_id}'
                log.info(f'[GROUNDING] brand_profiles/{input.brand_id}')
        except Exception as e:
            log.error(f'Firestore error: {e}')

    violations = []
    adjusted = input.brief.model_copy(deep=True)

    # Check forbidden words
    brief_text = ' '.join([
        input.brief.brand_voice,
        input.brief.emotional_hook,
        input.brief.visual_direction,
    ]).lower()
    for word in brand_data.get('forbidden_words', []):
        if word.lower() in brief_text:
            violations.append(f'Forbidden term detected: "{word}"')

    # Fill palette from brand if empty
    if not adjusted.color_palette_hint:
        required = brand_data.get('required_colors', [])
        if required:
            adjusted.color_palette_hint = ', '.join(required[:2])

    return BrandGuardOutput(
        validated=len(violations) == 0,
        violations=violations,
        grounding_source=grounding_source,
        adjusted_brief=adjusted,
    )
```

### tools/image_director.py

```python
# fluence-backend/tools/image_director.py
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel
from google.adk.tools import tool
from google.genai import Client
from schemas import ImageDirectorInput, ImageDirectorOutput
from prompts import IMAGE_EXPANSION_PROMPT
from gcs_utils import upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client()
vertexai.init(project=settings.PROJECT_ID, location=settings.VERTEX_LOCATION)

@tool
async def ImageDirectorTool(input: ImageDirectorInput) -> ImageDirectorOutput:
    '''Develop a visual concept and generate it with Imagen 4.'''

    # Step 1: Art direction — develop the visual concept
    expansion = await client.aio.models.generate_content(
        model=settings.GEMINI_PRO_MODEL,
        contents=IMAGE_EXPANSION_PROMPT.format(
            brief=input.brief.model_dump_json(indent=2),
            shot_type=input.shot_type,
        )
    )
    master_prompt = expansion.text.strip()
    log.info(f'[IMAGE] Prompt preview: {master_prompt[:80]}...')

    # Step 2: Generate with Imagen 4
    try:
        # Use fast model for demo pacing, standard for quality
        model_id = settings.IMAGEN_FAST_MODEL  # swap to IMAGEN_MODEL for higher quality
        model = ImageGenerationModel.from_pretrained(model_id)
        images = model.generate_images(
            prompt=master_prompt,
            number_of_images=1,
            aspect_ratio=input.aspect_ratio,
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
                number_of_images=1, aspect_ratio=input.aspect_ratio, add_watermark=False,
            )
            image_bytes = images[0]._image_bytes
        else:
            raise

    # Step 3: Store and sign
    gcs_uri    = await upload_to_gcs(image_bytes, 'images', 'jpg')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return ImageDirectorOutput(
        gcs_uri=gcs_uri,
        signed_url=signed_url,
        expanded_prompt=master_prompt,
        director_note=f'{input.shot_type} — visual world locked to brief.',
        shot_type=input.shot_type,
    )
```

### tools/copywriter.py

```python
# fluence-backend/tools/copywriter.py
from google.adk.tools import tool
from google.genai import Client
from schemas import CopyInput, CopyOutput
from prompts import COPYWRITER_PROMPT, TONE_DESCRIPTIONS
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client()

@tool
async def CopywriterTool(input: CopyInput) -> CopyOutput:
    '''Write campaign copy that earns attention.'''
    tone = TONE_DESCRIPTIONS.get(input.brief.brand_voice, 'genuine and specific')
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_PRO_MODEL,
        contents=COPYWRITER_PROMPT.format(
            brief=input.brief.model_dump_json(indent=2),
            platform=input.brief.platform,
            tone_description=tone,
        ),
        config={
            'response_mime_type': 'application/json',
            'response_schema': CopyOutput.model_json_schema(),
        }
    )
    return CopyOutput.model_validate_json(response.text)
```

### tools/voiceover.py

```python
# fluence-backend/tools/voiceover.py
from google.adk.tools import tool
from google.genai import Client
from google.cloud import texttospeech_v1 as tts
from schemas import VoiceoverInput, VoiceoverOutput
from prompts import VOICEOVER_SCRIPT_PROMPT
from gcs_utils import upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger(__name__)
client = Client()

VOICE_PERSONAS = {
    'alex':   'en-US-Neural2-D',
    'maya':   'en-US-Neural2-F',
    'jordan': 'en-US-Neural2-A',
    'chloe':  'en-US-Neural2-C',
    'zephyr': 'en-US-Wavenet-F',
    'puck':   'en-US-Wavenet-D',
}

@tool
async def VoiceoverTool(input: VoiceoverInput) -> VoiceoverOutput:
    '''Write a voiceover script and synthesize it with Cloud TTS.'''

    # Generate script
    resp = await client.aio.models.generate_content(
        model=settings.GEMINI_PRO_MODEL,
        contents=VOICEOVER_SCRIPT_PROMPT.format(
            brief=input.brief.model_dump_json(indent=2),
            headline=input.headline,
            emotional_hook=input.brief.emotional_hook,
            voice_persona=input.voice_persona,
        )
    )
    script = resp.text.strip()
    log.info(f'[TTS] Script: {script}')

    # Synthesize — wrap in SSML for natural pacing
    voice_name = VOICE_PERSONAS.get(input.voice_persona, VOICE_PERSONAS['maya'])
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

    gcs_uri    = await upload_to_gcs(tts_resp.audio_content, 'audio', 'mp3')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return VoiceoverOutput(
        gcs_uri=gcs_uri, signed_url=signed_url,
        script=script, voice_persona=input.voice_persona,
    )
```

### tools/video_cinematographer.py

```python
# fluence-backend/tools/video_cinematographer.py
import asyncio, base64
from google.adk.tools import tool
from google.cloud import aiplatform
from schemas import VideoInput, VideoOutput
from gcs_utils import download_from_gcs, upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger(__name__)

VEO_ENDPOINT = (
    f'projects/{settings.PROJECT_ID}/locations/{settings.VERTEX_LOCATION}'
    f'/publishers/google/models/{settings.VEO_MODEL}'
)

@tool
async def VideoCinematographerTool(input: VideoInput) -> VideoOutput:
    '''Generate a short cinematic clip from a reference frame using Veo 3.1.'''
    try:
        frame_bytes = await download_from_gcs(input.reference_frame_gcs_uri)
        frame_b64   = base64.b64encode(frame_bytes).decode()

        api_client = aiplatform.gapic.PredictionServiceAsyncClient(
            client_options={
                'api_endpoint': f'{settings.VERTEX_LOCATION}-aiplatform.googleapis.com'
            }
        )
        instance = {
            'prompt':      input.scene_description,
            'image':       {'bytesBase64Encoded': frame_b64},
            'videoLength': f'{input.duration_seconds}s',
            'aspectRatio': '9:16',
        }
        response = await asyncio.wait_for(
            api_client.predict(endpoint=VEO_ENDPOINT, instances=[instance]),
            timeout=settings.VEO_TIMEOUT_S,
        )
        video_bytes = base64.b64decode(
            response.predictions[0]['bytesBase64Encoded']
        )
        gcs_uri    = await upload_to_gcs(video_bytes, 'videos', 'mp4')
        signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

        return VideoOutput(
            gcs_uri=gcs_uri, signed_url=signed_url,
            duration=input.duration_seconds, status='ready',
        )

    except asyncio.TimeoutError:
        log.warning(f'Veo timed out after {settings.VEO_TIMEOUT_S}s')
        return VideoOutput(status='processing')
    except Exception as e:
        log.error(f'Veo error: {e}', exc_info=True)
        return VideoOutput(status='failed')
```

### tools/campaign_assembler.py

```python
# fluence-backend/tools/campaign_assembler.py
from google.adk.tools import tool
from google.cloud.firestore_v1.async_client import AsyncClient
from schemas import (
    AssemblerInput, InterlevedPayload,
    NarrationBlock, ImageBlock, CopyBlock,
    AudioBlock, VideoBlock, BriefBlock,
)
from config import settings
import logging

log = logging.getLogger(__name__)

@tool
async def CampaignAssemblerTool(input: AssemblerInput) -> InterlevedPayload:
    '''Collect all outputs and build the ordered interleaved campaign payload.'''
    blocks = []

    product = input.brief.product_name if input.brief else 'your campaign'
    blocks.append(NarrationBlock(
        text=f'Here is your complete {product} campaign.',
        streaming=False,
    ).model_dump())

    if input.image_output:
        blocks.append(ImageBlock(
            signed_url=input.image_output.get('signed_url', ''),
            expanded_prompt=input.image_output.get('expanded_prompt', ''),
            director_note=input.image_output.get('director_note', ''),
            shot_type=input.image_output.get('shot_type', 'hero'),
        ).model_dump())

    if input.night_image_output:
        night = input.night_image_output
        blocks.append(ImageBlock(
            signed_url=night.get('signed_url', ''),
            expanded_prompt=night.get('expanded_prompt', ''),
            director_note=night.get('director_note', ''),
            shot_type='variant',
        ).model_dump())

    if input.copy_output:
        c = input.copy_output
        blocks.append(CopyBlock(
            headline=c.get('headline', ''),
            body=c.get('body', ''),
            cta=c.get('cta', ''),
            caption=c.get('caption', ''),
            hashtags=c.get('hashtags', []),
        ).model_dump())

    if input.audio_output:
        a = input.audio_output
        blocks.append(AudioBlock(
            signed_url=a.get('signed_url', ''),
            script=a.get('script', ''),
            voice_persona=a.get('voice_persona', 'maya'),
        ).model_dump())

    if input.video_output:
        v = input.video_output
        blocks.append(VideoBlock(
            signed_url=v.get('signed_url'),
            duration=v.get('duration', 5),
            status=v.get('status', 'ready'),
        ).model_dump())

    if input.brief:
        blocks.append(BriefBlock(
            platform=input.brief.platform,
            brand_voice=input.brief.brand_voice,
            color_palette_hint=input.brief.color_palette_hint,
            emotional_hook=input.brief.emotional_hook,
        ).model_dump())

    # Persist to Firestore
    db = AsyncClient(project=settings.PROJECT_ID)
    await db.collection('campaigns').document(input.campaign_id).set({
        'campaign_id': input.campaign_id,
        'user_id': input.user_id,
        'session_id': input.session_id,
        'status': 'complete',
        'grounding_source': input.grounding_source,
        'brief': input.brief.model_dump() if input.brief else {},
        'assets': {
            'hero_image_url': (input.image_output or {}).get('signed_url'),
            'video_url':      (input.video_output or {}).get('signed_url'),
            'voiceover_url':  (input.audio_output or {}).get('signed_url'),
            'copy':           input.copy_output,
        },
        'blocks_count': len(blocks),
    })
    log.info(f'Campaign saved: {input.campaign_id} ({len(blocks)} blocks)')

    return InterlevedPayload(
        session_id=input.session_id,
        campaign_id=input.campaign_id,
        blocks=blocks,
    )
```

### tools/\_\_init\_\_.py

```python
# fluence-backend/tools/__init__.py
from .brief_extractor       import BriefExtractorTool
from .brand_guard           import BrandGuardTool
from .image_director        import ImageDirectorTool
from .copywriter            import CopywriterTool
from .voiceover             import VoiceoverTool
from .video_cinematographer import VideoCinematographerTool
from .campaign_assembler    import CampaignAssemblerTool

__all__ = [
    'BriefExtractorTool', 'BrandGuardTool', 'ImageDirectorTool',
    'CopywriterTool', 'VoiceoverTool', 'VideoCinematographerTool',
    'CampaignAssemblerTool',
]
```

---

## SECTION 8 — requirements.txt & Dockerfile

```
# fluence-backend/requirements.txt
fastapi==0.111.1
uvicorn[standard]==0.30.1
websockets==12.0
pydantic==2.7.1
pydantic-settings==2.3.0
google-adk>=0.3.0
google-generativeai>=0.8.0
google-cloud-aiplatform>=1.58.0
google-cloud-firestore>=2.16.0
google-cloud-storage>=2.17.0
google-cloud-texttospeech>=2.16.0
vertexai>=1.58.0
httpx==0.27.0
python-multipart==0.0.9
```

```dockerfile
# fluence-backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", \
     "--workers", "1", "--timeout-keep-alive", "300"]
```

---

## SECTION 9 — Frontend TypeScript Types

```typescript
// src/types/content-blocks.ts
export type ContentBlockType =
  | 'narration' | 'image' | 'video' | 'copy'
  | 'audio' | 'brief' | 'status' | 'error'
  | 'session_ready' | 'session_complete' | 'ping' | 'audio_response';

export interface NarrationBlock  { type:'narration';  text:string; streaming:boolean }
export interface ImageBlock       { type:'image';  signed_url:string; expanded_prompt:string; director_note:string; shot_type:string }
export interface VideoBlock       { type:'video';  signed_url:string|null; duration:number; status:'ready'|'processing'|'failed' }
export interface CopyBlock        { type:'copy';   headline:string; body:string; cta:string; caption:string; hashtags:string[] }
export interface AudioBlock       { type:'audio';  signed_url:string; script:string; voice_persona:string }
export interface BriefBlock       { type:'brief';  platform:string; brand_voice:string; color_palette_hint:string; emotional_hook:string }
export interface StatusBlock      { type:'status'; message:string }
export interface ErrorBlock       { type:'error';  message:string; recoverable:boolean }
export interface AudioResponseBlock { type:'audio_response'; data:string; mime_type:string }

export type ContentBlock =
  NarrationBlock | ImageBlock | VideoBlock | CopyBlock |
  AudioBlock | BriefBlock | StatusBlock | ErrorBlock;
```

```typescript
// src/store/session.store.ts
import { create } from 'zustand';
import type { ContentBlock } from '../types/content-blocks';
import type { User } from 'firebase/auth';

export type SessionStatus =
  'idle'|'connecting'|'connected'|'generating'|'complete'|'error'|'disconnected';

interface SessionState {
  status:      SessionStatus;
  sessionId:   string | null;
  feedBlocks:  ContentBlock[];
  isRecording: boolean;
  user:        User | null;
  setStatus:    (s: SessionStatus) => void;
  setSessionId: (id: string) => void;
  addFeedBlock: (b: ContentBlock) => void;
  setRecording: (r: boolean) => void;
  setUser:      (u: User | null) => void;
  reset:        () => void;
}

export const useSessionStore = create<SessionState>(set => ({
  status:'idle', sessionId:null, feedBlocks:[], isRecording:false, user:null,
  setStatus:    s  => set({ status: s }),
  setSessionId: id => set({ sessionId: id }),
  addFeedBlock: b  => set(s => ({ feedBlocks: [...s.feedBlocks, b] })),
  setRecording: r  => set({ isRecording: r }),
  setUser:      u  => set({ user: u }),
  reset: () => set({ status:'idle', sessionId:null, feedBlocks:[], isRecording:false }),
}));
```

```typescript
// src/store/canvas.store.ts
import { create } from 'zustand';
import type { ContentBlock } from '../types/content-blocks';

const CANVAS_TYPES = new Set(['image','video','copy','audio','brief']);

interface CanvasState {
  blocks:       ContentBlock[];
  campaignId:   string | null;
  addBlock:     (b: ContentBlock) => void;
  clearCanvas:  () => void;
  setCampaignId:(id: string) => void;
}

export const useCanvasStore = create<CanvasState>(set => ({
  blocks:[], campaignId:null,
  addBlock: b => {
    if (CANVAS_TYPES.has(b.type))
      set(s => ({ blocks: [...s.blocks, b] }));
  },
  clearCanvas:   () => set({ blocks:[], campaignId:null }),
  setCampaignId: id => set({ campaignId: id }),
}));
```

---

## SECTION 10 — WebSocket Service (Frontend)

```typescript
// src/services/websocket.service.ts
import { useSessionStore } from '../store/session.store';
import { useCanvasStore }  from '../store/canvas.store';
import type { ContentBlock } from '../types/content-blocks';

type AudioCb = (b64: string, mimeType: string) => void;

class WebSocketService {
  private ws:           WebSocket | null = null;
  private retries:      number = 0;
  private readonly max: number = 5;
  private audioCb:      AudioCb | null = null;

  connect(userId: string, brandId?: string | null): void {
    const url = new URL(`${import.meta.env.VITE_BACKEND_WS_URL}/session`);
    url.searchParams.set('user_id', userId);
    if (brandId) url.searchParams.set('brand_id', brandId);

    useSessionStore.getState().setStatus('connecting');
    this.ws = new WebSocket(url.toString());

    this.ws.onopen  = () => {
      useSessionStore.getState().setStatus('connected');
      this.retries = 0;
    };
    this.ws.onclose = () => {
      useSessionStore.getState().setStatus('disconnected');
      this.retry(userId, brandId);
    };
    this.ws.onerror = () => useSessionStore.getState().setStatus('error');
    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data) as Record<string, unknown>;
      this.handle(msg);
    };
  }

  private handle(msg: Record<string, unknown>): void {
    if (msg.type === 'ping') { this.send({ type:'pong' }); return; }
    if (msg.type === 'session_ready') {
      useSessionStore.getState().setSessionId(msg.session_id as string);
      return;
    }
    if (msg.type === 'session_complete') {
      useSessionStore.getState().setStatus('complete');
      return;
    }
    if (msg.type === 'audio_response' && this.audioCb) {
      this.audioCb(msg.data as string, msg.mime_type as string);
      return;
    }
    const block = msg as unknown as ContentBlock;
    useSessionStore.getState().addFeedBlock(block);
    useCanvasStore.getState().addBlock(block);
    if (['image','copy','video'].includes(msg.type as string)) {
      useSessionStore.getState().setStatus('generating');
    }
  }

  sendAudio(b64: string): void { this.send({ type:'audio_chunk', data:b64 }); }
  sendText(text: string): void { this.send({ type:'text_input', text }); }
  endSession():           void { this.send({ type:'session_end' }); }
  onAudioResponse(cb: AudioCb): void { this.audioCb = cb; }
  isOpen(): boolean { return this.ws?.readyState === WebSocket.OPEN; }

  private send(data: object): void {
    if (this.isOpen()) this.ws!.send(JSON.stringify(data));
  }
  private retry(userId: string, brandId?: string | null): void {
    if (this.retries >= this.max) return;
    setTimeout(() => this.connect(userId, brandId), 2 ** this.retries++ * 1000);
  }
}

export const wsService = new WebSocketService();
```

---

## SECTION 11 — Infrastructure

```hcl
# infrastructure/main.tf
terraform {
  required_providers { google = { source = "hashicorp/google", version = "~>5.0" } }
}
provider "google" { project = var.project_id  region = var.region }
variable "project_id" {}
variable "region"     { default = "us-central1" }

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com", "aiplatform.googleapis.com", "firestore.googleapis.com",
    "storage.googleapis.com", "texttospeech.googleapis.com",
    "artifactregistry.googleapis.com", "cloudbuild.googleapis.com", "firebase.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "fluence" {
  location = var.region  repository_id = "fluence-repo"  format = "DOCKER"
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-fluence-assets"
  location                    = "US"
  uniform_bucket_level_access = true
  cors {
    origin          = ["https://fluenceai.app", "http://localhost:5173"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

resource "google_firestore_database" "default" {
  name        = "(default)"
  location_id = "nam5"
  type        = "FIRESTORE_NATIVE"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "fluence-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  template {
    scaling { min_instance_count = 1  max_instance_count = 10 }
    timeout = "3600s"
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/fluence-repo/fluence-backend:latest"
      env { name = "PROJECT_ID"  value = var.project_id }
      env { name = "GCS_BUCKET"  value = google_storage_bucket.assets.name }
      resources { limits = { memory = "2Gi"  cpu = "2" } }
    }
  }
}

resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "backend_url" { value = google_cloud_run_v2_service.backend.uri }
output "bucket_name" { value = google_storage_bucket.assets.name }
```

```bash
#!/bin/bash
# infrastructure/setup.sh — one-command GCP deploy
set -e
PROJECT_ID=${1:?'Usage: ./setup.sh <project-id>'}
gcloud config set project $PROJECT_ID
cd infrastructure && terraform init
terraform apply -var="project_id=$PROJECT_ID" -auto-approve
BACKEND_URL=$(terraform output -raw backend_url)
BUCKET=$(terraform output -raw bucket_name)
cd ../fluence-backend
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest .
gcloud run deploy fluence-backend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest \
  --region us-central1 --allow-unauthenticated \
  --timeout 3600 --memory 2Gi --cpu 2 --min-instances 1 \
  --set-env-vars PROJECT_ID=$PROJECT_ID,GCS_BUCKET=$BUCKET
echo "Backend live at: $BACKEND_URL"
echo "Set VITE_BACKEND_WS_URL=$(echo $BACKEND_URL | sed 's/https/wss/') in frontend .env"
```

---

## SECTION 12 — Key Decisions & Gotchas

| Issue | Wrong | Right |
|---|---|---|
| Live API model | `gemini-2.0-flash-live-001` (deprecated) | `gemini-live-2.5-flash-native-audio` |
| Image model | `imagen-3.0-generate-001` | `imagen-4.0-generate-preview` |
| Video model | `veo-3.0-generate-preview` | `veo-3.1-generate` |
| ADK streaming | `runner.run_async()` | `runner.run_live()` + `LiveRequestQueue` |
| Audio input | Direct to runner | `live_queue.send_realtime(Blob(...))` |
| Cloud Run timeout | Default 300s | Must set `--timeout 3600` |
| Min instances | 0 (cold start kills WS) | `--min-instances 1` |
| WS keepalive | None | Ping every 25s |

---

## SECTION 13 — Demo Scenario (LUMĒ Skincare)

Use this scenario to test end-to-end before recording the demo video.

**User says:** *"I have a skincare brand called LUMĒ. It's for women over 40 who are done with anti-aging panic. I want it to feel empowering — like permission to stop shrinking yourself. Instagram audience."*

**Expected flow:**
1. FLUENCE listens, responds with creative energy about the brand's emotional core
2. Brief extracted: `empowering`, women 40+, anti-aging subversion, Instagram
3. BrandGuard validates (or loads brand profile if uploaded)
4. Image: warm marble surface, golden backlight, bottle front-and-centre, depth of field
5. Copy headline: something that subverts anti-aging language entirely
6. Voiceover: 20-word script, warm female voice (Maya persona)
7. Video: candlelight transition on the hero image
8. Canvas fully assembled: 2 images + copy + audio + video + brief chip

**Interruption test:** After the first image appears, say *"Wait — can we try a night version? Dark background, candlelight."* FLUENCE should stop mid-narration, acknowledge immediately, and regenerate with a dark palette.

---

## SECTION 14 — Environment Files

```bash
# fluence-backend/.env
PROJECT_ID=your-gcp-project-id
GCS_BUCKET=your-project-id-fluence-assets
FIRESTORE_DB=(default)
VERTEX_LOCATION=us-central1
CORS_ORIGINS=http://localhost:5173,https://fluenceai.app
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-native-audio
GEMINI_PRO_MODEL=gemini-2.0-flash-001
IMAGEN_MODEL=imagen-4.0-generate-preview
IMAGEN_FAST_MODEL=imagen-4.0-fast-generate-preview
VEO_MODEL=veo-3.1-generate
VEO_FAST_MODEL=veo-3.1-fast
```

```bash
# fluence-frontend/.env
VITE_BACKEND_WS_URL=wss://fluence-backend-xxxx.run.app
VITE_BACKEND_HTTP_URL=https://fluence-backend-xxxx.run.app
VITE_PROJECT_ID=your-gcp-project-id
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

---

## SECTION 15 — Submission Checklist

- [ ] GitHub repo is PUBLIC
- [ ] `/health` returns 200 from Cloud Run URL
- [ ] Demo video on YouTube, PUBLIC, under 4:00 minutes
- [ ] Architecture diagram PNG in Devpost carousel
- [ ] GCP proof recording (Cloud Run + Firestore + Vertex AI visible)
- [ ] Devpost text covers: features, technologies, data sources, learnings
- [ ] Category: **Creative Storyteller**
- [ ] Blog post live on dev.to, PUBLIC, with `#GeminiLiveAgentChallenge` tag
- [ ] Blog post contains disclaimer: *"I created this piece of content for the purposes of entering the Gemini Live Agent Challenge hackathon."*
- [ ] `infrastructure/main.tf` in public repo (IaC bonus +0.2)
- [ ] GDG profile linked (bonus +0.2)
- [ ] Billing alert set — service must run through April 3, 2026
- [ ] Submit before **March 16, 5:00 PM PDT**
