# ✦ FLUENCE AI — MASTER BLUEPRINT ✦

**You speak. It creates. Everything, at once.**

> Gemini Live Agent Challenge 2026 · Creative Storyteller Category · Grand Prize Target: $25,000
> *Complete Architecture · ADK Agent Specs · System Prompts · Build Prompts · Deployment Guide*

---

| 8 ADK Agents/Tools | 5 GCP Services | 6 Content Types | 30+ Build Prompts |
|---|---|---|---|
| React 19 + TypeScript | FastAPI + Python 3.11 | ADK + Gemini Live | Cloud Run + Firestore |

**Table of Contents**
1. [Vision & Concept](#1-vision--concept)
2. [Complete System Architecture](#2-complete-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [ADK Multi-Agent Design](#4-adk-multi-agent-design)
5. [All System Prompts](#5-all-system-prompts)
6. [Backend Implementation](#6-backend-implementation)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Firestore Database Schema](#8-firestore-database-schema)
9. [Deployment — Terraform IaC + Cloud Run](#9-deployment--terraform-iac--cloud-run)
10. [Build Prompts — 32 Prompts](#10-build-prompts--32-prompts)
11. [Demo Strategy & Shot List](#11-demo-strategy--shot-list)

---

## 1. Vision & Concept

### 1.1 The One-Sentence Vision

Fluence AI is a live creative director: you describe your brand in a voice conversation and a complete campaign — hero image, video concept, copy, voiceover, and creative brief — emerges inline, simultaneously, as the AI speaks.

### 1.2 The Problem It Solves

Producing a single commercial-quality campaign today requires: a strategist, a copywriter, a photographer, a videographer, a voice actor, an editor, and 6–8 weeks. Average cost: $40,000–$80,000. Even with existing AI tools, creators must switch between Midjourney for images, Runway for video, ElevenLabs for voice, and ChatGPT for copy — fragmented, slow, and disconnected.

> **Core Value Proposition**
>
> Fluence AI collapses this entire workflow into a single live conversation.
> - One voice session. One coherent creative vision. All five content types delivered inline.
> - The creation PROCESS is visible — the campaign assembles itself in real time as the AI narrates its creative decisions.
> - The result is not a chat with an AI that can help with marketing. It is a live creative director that produces a campaign in minutes.

### 1.3 Why This Wins the Grand Prize

The Creative Storyteller category requires "seamlessly weaving together text, images, audio, and video in a single, fluid output stream." Every other entry will show a chatbot that describes images or a workflow tool with separate steps. Fluence AI IS the interleaved output stream — a single agent response containing all five content types, rendered progressively as the agent speaks.

| Judging Criterion | Weight | Fluence AI Score |
|---|---|---|
| Innovation & Multimodal UX | 40% | 5/5 — True interleaved stream, all 4 media types inline |
| Technical Architecture | 30% | 5/5 — ADK multi-agent, 5 GCP services, Vertex AI grounding |
| Demo & Presentation | 30% | 5/5 — Campaign born live on screen, interruption visible |
| Bonus Points | +1.0 | GDG (+0.2) + Terraform IaC (+0.2) + blog post (+0.6) |
| **TOTAL** | | **6.0 / 6.0 (maximum possible score)** |

---

## 2. Complete System Architecture

### 2.1 High-Level Overview

Fluence AI is a three-tier architecture: a React 19 frontend (thin shell, UI rendering), a FastAPI backend on Cloud Run (orchestration, ADK agent hosting), and Google Cloud services (Vertex AI, Firestore, Cloud Storage, Cloud TTS).

```
┌─────────────────────────────────────────────────────────────────────┐
│ FLUENCE AI — SYSTEM ARCHITECTURE                                    │
├──────────────────────┬──────────────────────────────────────────────┤
│ FRONTEND (React 19)  │ BACKEND (Cloud Run — FastAPI)                │
│ ─────────────────    │ ─────────────────────────────────────────    │
│ SessionFeed.tsx      │ ┌──────────────────────────────────────┐    │
│ └ MessageBubble.tsx  │ │ FLUENCE CreativeDirectorAgent (ADK)  │    │
│   ├ NarrationBlock   │ │ ──────────────────────────────────   │    │
│   ├ ImageCard        │ │ BriefExtractorTool                   │    │
│   ├ VideoPlayer      │ │ BrandGuardTool     ──► Firestore     │    │
│   ├ CopyBlock        │ │ ImageDirectorTool  ──► Vertex Imagen │    │
│   ├ AudioPlayer      │ │ VideoCinema...Tool ──► Veo 3         │    │
│   └ BriefCard        │ │ CopywriterTool                       │    │
│                      │ │ VoiceoverTool      ──► Cloud TTS     │    │
│ LiveCanvas.tsx       │ │ CampaignAssemblerTool                │    │
│ └ CampaignLayout.tsx │ └──────────────────────────────────────┘    │
│                      │                                              │
│ ◄── WebSocket ──────►│ WebSocket /session (FastAPI)                 │
│ ◄── Streaming JSON ──│ Streaming interleaved payload                │
│                      │                                              │
│ VoiceCapture.tsx     │ Gemini Live API (gemini-live-2.5-flash)      │
│ (PCM 16kHz mic)      │ ◄── bidirectional audio stream ─────────►   │
└──────────────────────┴──────────────────────────────────────────────┘
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
┌──────────┐ ┌──────────────────┐ ┌────────────────┐
│Vertex AI │ │Cloud Firestore   │ │Cloud Storage   │
│Imagen 4  │ │brand_profiles    │ │/images bucket  │
│Veo 3.1   │ │campaigns         │ │/videos bucket  │
│Gemini Pro│ │assets            │ │/audio bucket   │
└──────────┘ └──────────────────┘ └────────────────┘
                │
     ┌──────────┘
     ▼
┌──────────────────┐
│ Cloud TTS API    │
│ (voiceovers)     │
└──────────────────┘
```

### 2.2 Data Flow — What Happens in One Session

1. User opens Fluence AI, taps the mic button. Browser requests mic permission. AudioContext starts capturing PCM audio at 16kHz.
2. Frontend WebSocket client connects to `wss://fluence-backend-xxxx.run.app/session`. Sends `session_init` with `user_id` and optional `brand_id`.
3. Backend creates a new ADK session. CreativeDirectorAgent initializes with the user's brand profile pre-loaded from Firestore (if `brand_id` provided).
4. User's PCM audio streams to backend over WebSocket. Backend forwards audio chunks to Gemini Live API bidirectional stream.
5. Gemini Live processes speech, detects campaign elements (product name, audience, tone, visual direction). Streams text transcript back.
6. CreativeDirectorAgent calls `BriefExtractorTool` when sufficient context is detected. Returns structured JSON brief.
7. Agent calls `BrandGuardTool` → validates brief against brand profile in Firestore. Grounding evidence stored in session document.
8. Agent calls `ImageDirectorTool`, `CopywriterTool`, `VoiceoverTool`, and `VideoCinematographerTool` **IN PARALLEL** via ADK tool orchestration.
9. As each tool completes, `CampaignAssemblerTool` streams a typed content block back to frontend over WebSocket. Frontend renders each block progressively.
10. Session ends. SessionLogger writes full transcript, all tool outputs, and asset URLs to Firestore campaign document.

---

## 3. Tech Stack

### 3.1 Frontend

| Technology | Version | Role |
|---|---|---|
| React | 19.x | UI framework. Concurrent mode for progressive rendering of streaming content blocks. |
| TypeScript | 5.x | Type safety across all components, API payloads, and content block schemas. |
| Vite | 5.x | Build tool. Fast HMR during development. Optimized production bundle. |
| Tailwind CSS | 3.x | Utility-first styling. Custom dark studio theme. Animation utilities for streaming reveals. |
| Zustand | 4.x | Lightweight state management for session state, brand profile, canvas assets. |
| Web Audio API | Native | PCM microphone capture at 16kHz. Audio playback for voiceovers. |
| WebSocket API | Native | Bidirectional streaming connection to backend. |
| Firebase SDK | 10.x | Google auth (Sign in with Google). Firestore client for brand profile CRUD. |
| Framer Motion | 11.x | Content block entry animations. Progressive reveal effects. |

### 3.2 Backend

| Technology | Version | Role |
|---|---|---|
| Python | 3.11 | Backend runtime. |
| FastAPI | 0.111+ | Async web framework. WebSocket support. Streaming responses. |
| Google ADK | latest | Agent Development Kit. Defines CreativeDirectorAgent and all tool agents. |
| google-cloud-aiplatform | 1.x | Vertex AI SDK. Imagen 4 and Veo 3.1 API calls. |
| google-cloud-firestore | 2.x | Async Firestore client. Brand profiles, session storage. |
| google-cloud-storage | 2.x | GCS bucket operations. Upload and sign URLs for all assets. |
| google-cloud-texttospeech | 2.x | Cloud TTS client. SSML voiceover synthesis. |
| google-generativeai | 0.8+ | Gemini Live API client for bidirectional audio streaming. |
| uvicorn | 0.30+ | ASGI server. Runs FastAPI in production inside Docker container. |
| pydantic | 2.x | Data validation for all API request/response models. |

### 3.3 GCP & Infrastructure

| GCP Service | Plan/SKU | Purpose |
|---|---|---|
| Cloud Run | Always-on min 1 | Hosts FastAPI backend. WebSocket with `--timeout=3600`. Auto-scales. |
| Vertex AI — Imagen 4 | Pay per generation | Hero images and storyboard frames. |
| Vertex AI — Veo 3.1 | Pay per generation | 5-second cinematic video clips. |
| Vertex AI — Gemini Pro | Pay per token | Brief extraction, prompt expansion, copy generation. |
| Cloud Firestore | Free tier + pay | Brand profiles, campaign sessions, asset metadata. |
| Cloud Storage | Pay per GB | All generated images, videos, and audio. Signed URLs. |
| Cloud TTS | Pay per char | Voiceover synthesis with SSML. Neural2 voices. |
| Firebase Auth | Free tier | Google Sign-In. JWT token auth for WebSocket sessions. |
| Artifact Registry | Free tier | Docker image storage for Cloud Run deployment. |

---

## 4. ADK Multi-Agent Design

### 4.1 Agent Hierarchy

> **Orchestration Pattern:** One Root Agent (`CreativeDirectorAgent`) orchestrates 7 specialized Tools.
> - The Root Agent is the user-facing conversational interface — it speaks with the user via Gemini Live.
> - Each Tool is a discrete ADK Tool class with a single responsibility and defined input/output schema.
> - Tools are called in two phases: **Brief Phase** (BriefExtractor + BrandGuard, sequential) and **Creation Phase** (Image + Copy + Voiceover, parallel — Video after Image completes).
> - CampaignAssembler runs last, collecting all outputs and streaming the interleaved payload to the frontend.

| Agent / Tool | ADK Type | Responsibility |
|---|---|---|
| `CreativeDirectorAgent` | Root Agent | User-facing conversational agent. Manages live session, extracts brief, orchestrates all tool calls, streams narration to user. |
| `BriefExtractorTool` | ADK Tool | Extracts structured creative brief from conversation. Returns `CampaignBrief` JSON. |
| `BrandGuardTool` | ADK Tool | Queries Firestore for brand guidelines. Validates brief against brand identity. Returns grounding evidence. |
| `ImageDirectorTool` | ADK Tool | Expands visual concept → master prompt → Vertex AI Imagen 4. Returns image URL + GCS path. |
| `VideoCinematographerTool` | ADK Tool | Takes image frame + scene description → Veo 3.1 on Vertex AI. Returns 5-second video URL. |
| `CopywriterTool` | ADK Tool | Generates headline, body copy, CTA, caption, hashtags for specified platform. |
| `VoiceoverTool` | ADK Tool | Converts script to audio via Cloud TTS with SSML. Returns GCS audio URL. |
| `CampaignAssemblerTool` | ADK Tool | Collects all tool outputs → formats `InterlevedPayload` → streams to frontend WebSocket. |

### 4.2 CreativeDirectorAgent — Root Agent Spec

```python
# agents/creative_director.py
from google.adk.agents import Agent
from google.adk.models import Gemini

creative_director_agent = Agent(
    name='fluence_creative_director',
    model=Gemini(model='gemini-live-2.5-flash-native-audio'),
    description='Fluence AI Creative Director — the live creative intelligence.',
    instruction=CREATIVE_DIRECTOR_SYSTEM_PROMPT,  # See Section 5
    tools=[
        BriefExtractorTool,
        BrandGuardTool,
        ImageDirectorTool,
        VideoCinematographerTool,
        CopywriterTool,
        VoiceoverTool,
        CampaignAssemblerTool,
    ],
    generate_content_config={
        'response_modalities': ['AUDIO', 'TEXT'],
        'speech_config': {
            'voice_config': {
                'prebuilt_voice_config': {'voice_name': 'Aoede'}
            }
        },
        'realtime_input_config': {
            'automatic_activity_detection': {
                'disabled': False,
                'start_of_speech_sensitivity': 'START_SENSITIVITY_HIGH',
                'end_of_speech_sensitivity': 'END_SENSITIVITY_MEDIUM',
            }
        },
    }
)
```

### 4.3 Tool Schemas — Input / Output Contracts

```python
# schemas.py — Pydantic models for all tool I/O

class CampaignBrief(BaseModel):
    product_name: str
    brand_voice: str  # 'empowering' | 'playful' | 'premium' | ...
    target_audience: str
    emotional_hook: str
    visual_direction: str
    platform: str  # 'instagram' | 'tiktok' | 'linkedin' | 'youtube'
    color_palette_hint: str
    influencer_persona: str  # 'alex' | 'maya' | 'jordan' | 'chloe' | 'custom'

class BriefExtractorInput(BaseModel):
    conversation_transcript: str
    user_id: str

class BrandGuardOutput(BaseModel):
    validated: bool
    violations: List[str]       # any brief elements contradicting brand guidelines
    grounding_source: str       # Firestore document path
    adjusted_brief: CampaignBrief

class ImageDirectorInput(BaseModel):
    brief: CampaignBrief
    shot_type: str              # 'hero' | 'lifestyle' | 'product_close' | 'storyboard_frame'
    aspect_ratio: str           # '1:1' | '9:16' | '16:9'

class ImageDirectorOutput(BaseModel):
    gcs_uri: str
    signed_url: str
    expanded_prompt: str        # the master prompt used
    director_note: str          # agent's creative reasoning

class VideoInput(BaseModel):
    reference_frame_gcs_uri: str
    scene_description: str
    duration_seconds: int = 5

class CopyOutput(BaseModel):
    headline: str
    body: str
    cta: str
    caption: str
    hashtags: List[str]

class ContentBlock(BaseModel):
    type: str  # 'narration'|'image'|'video'|'copy'|'audio'|'brief'|'status'
    payload: dict
    sequence: int
    session_id: str

class InterlevedPayload(BaseModel):
    session_id: str
    blocks: List[ContentBlock]
    campaign_id: str
```

### 4.4 BriefExtractorTool

```python
# tools/brief_extractor.py
from google.adk.tools import tool
from google.genai import Client

@tool
async def BriefExtractorTool(input: BriefExtractorInput) -> CampaignBrief:
    '''Extract a structured creative brief from the conversation transcript.'''
    client = Client()
    response = await client.aio.models.generate_content(
        model='gemini-2.0-flash-001',
        contents=BRIEF_EXTRACTOR_PROMPT.format(
            transcript=input.conversation_transcript
        ),
        config={
            'response_mime_type': 'application/json',
            'response_schema': CampaignBrief.model_json_schema()
        }
    )
    return CampaignBrief.model_validate_json(response.text)
```

### 4.5 BrandGuardTool — Grounding

```python
# tools/brand_guard.py
@tool
async def BrandGuardTool(input: BrandGuardInput) -> BrandGuardOutput:
    '''Retrieve brand guidelines from Firestore and validate brief against them.'''
    db = AsyncClient()

    # Retrieve brand profile — THIS IS THE GROUNDING STEP
    if input.brand_id:
        doc = await db.collection('brand_profiles').document(input.brand_id).get()
        brand_data = doc.to_dict()
        grounding_source = f'brand_profiles/{input.brand_id}'
    else:
        brand_data = DEFAULT_BRAND_GUIDELINES
        grounding_source = 'default_guidelines'

    # Validate brief against brand guidelines
    violations = []
    adjusted = input.brief.model_copy()
    if brand_data.get('forbidden_words'):
        for word in brand_data['forbidden_words']:
            if word.lower() in input.brief.brand_voice.lower():
                violations.append(f'Brand voice contains forbidden term: {word}')

    return BrandGuardOutput(
        validated=len(violations) == 0,
        violations=violations,
        grounding_source=grounding_source,
        adjusted_brief=adjusted
    )
```

### 4.6 ImageDirectorTool — Vertex AI Imagen 4

```python
# tools/image_director.py
from vertexai.preview.vision_models import ImageGenerationModel
import vertexai

@tool
async def ImageDirectorTool(input: ImageDirectorInput) -> ImageDirectorOutput:
    '''Expand visual concept to master prompt and generate with Imagen 4.'''

    # Step 1: Expand to master prompt via Gemini
    gemini = Client()
    expansion = await gemini.aio.models.generate_content(
        model='gemini-2.0-flash-001',
        contents=IMAGE_EXPANSION_PROMPT.format(
            brief=input.brief.model_dump_json(),
            shot_type=input.shot_type
        )
    )
    master_prompt = expansion.text

    # Step 2: Generate with Imagen 4 on Vertex AI
    vertexai.init(project=PROJECT_ID, location='us-central1')
    model = ImageGenerationModel.from_pretrained('imagen-4.0-generate-preview')
    images = model.generate_images(
        prompt=master_prompt,
        number_of_images=1,
        aspect_ratio=input.aspect_ratio,
        add_watermark=False,
        safety_filter_level='block_some',
    )

    # Step 3: Upload to GCS
    gcs_uri = await upload_to_gcs(images[0]._image_bytes, 'images', 'jpg')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return ImageDirectorOutput(
        gcs_uri=gcs_uri,
        signed_url=signed_url,
        expanded_prompt=master_prompt,
        director_note=f'Shot type: {input.shot_type}. Style locked to brand palette.'
    )
```

### 4.7 VideoCinematographerTool — Veo 3.1

```python
# tools/video_cinematographer.py
from google.cloud import aiplatform

@tool
async def VideoCinematographerTool(input: VideoInput) -> dict:
    '''Generate 5-second cinematic clip from reference frame using Veo 3.1.'''

    image_bytes = await download_from_gcs(input.reference_frame_gcs_uri)
    image_b64 = base64.b64encode(image_bytes).decode()

    client = aiplatform.gapic.PredictionServiceClient(
        client_options={'api_endpoint': 'us-central1-aiplatform.googleapis.com'}
    )
    endpoint = f'projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/veo-3.1-generate'
    instance = {
        'prompt': input.scene_description,
        'image': {'bytesBase64Encoded': image_b64},
        'videoLength': f'{input.duration_seconds}s',
        'aspectRatio': '9:16',
    }
    response = client.predict(endpoint=endpoint, instances=[instance])
    video_bytes = base64.b64decode(response.predictions[0]['bytesBase64Encoded'])

    gcs_uri = await upload_to_gcs(video_bytes, 'videos', 'mp4')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return {'gcs_uri': gcs_uri, 'signed_url': signed_url, 'duration': input.duration_seconds}
```

### 4.8 VoiceoverTool — Cloud TTS with SSML

```python
# tools/voiceover.py
from google.cloud import texttospeech_v1 as tts

VOICE_PERSONAS = {
    'alex':   {'name': 'en-US-Neural2-D', 'gender': 'MALE'},
    'maya':   {'name': 'en-US-Neural2-F', 'gender': 'FEMALE'},
    'jordan': {'name': 'en-US-Neural2-A', 'gender': 'MALE'},
    'chloe':  {'name': 'en-US-Neural2-C', 'gender': 'FEMALE'},
    'zephyr': {'name': 'en-US-Wavenet-F', 'gender': 'FEMALE'},
    'puck':   {'name': 'en-US-Wavenet-D', 'gender': 'MALE'},
}

@tool
async def VoiceoverTool(input: VoiceoverInput) -> dict:
    '''Synthesize voiceover with SSML styling via Cloud TTS.'''
    client = tts.TextToSpeechAsyncClient()
    voice_config = VOICE_PERSONAS.get(input.voice_persona, VOICE_PERSONAS['maya'])

    ssml = f'''<speak>
  <prosody rate="medium" pitch="+2st">
    <break time="300ms"/>{input.script}<break time="500ms"/>
  </prosody>
</speak>'''

    response = await client.synthesize_speech(
        input=tts.SynthesisInput(ssml=ssml),
        voice=tts.VoiceSelectionParams(language_code='en-US', name=voice_config['name']),
        audio_config=tts.AudioConfig(
            audio_encoding=tts.AudioEncoding.MP3,
            speaking_rate=0.95,
            pitch=1.0,
        )
    )

    gcs_uri = await upload_to_gcs(response.audio_content, 'audio', 'mp3')
    signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

    return {'gcs_uri': gcs_uri, 'signed_url': signed_url, 'voice_persona': input.voice_persona}
```

---

## 5. All System Prompts

### 5.1 CreativeDirectorAgent — Master System Prompt

```python
CREATIVE_DIRECTOR_SYSTEM_PROMPT = '''
You are FLUENCE — a live AI creative director. You think like a creative
director at a world-class agency, create like an AI with access to every
production tool, and communicate like the brilliant friend who makes
hard things feel easy.

## YOUR IDENTITY

You are not a chatbot. You are not an assistant. You are a creative director
in a live session with your client. You think out loud, you have opinions, you
make creative decisions with confidence, and you produce real campaign assets
in real time.

Your voice: Warm, direct, visionary. You use language that is specific
('golden hour backlight', not 'good lighting') and emotionally resonant.
You never say 'I can help you with that.' You say 'Here is what we are going to do.'

## YOUR PROCESS — THE FOUR PHASES

**Phase 1 — LISTEN AND DISCOVER:**
- Listen deeply to the user. Do not rush to generate.
- Ask ONE targeted question if you need a specific piece of information.
- Detect: product name, target audience, emotional hook, visual direction, platform.
- When you have enough to build a brief, say: 'I have everything I need.
  Let me build this campaign.' Then call BriefExtractorTool.

**Phase 2 — BRIEF AND VALIDATE:**
- After BriefExtractorTool returns, call BrandGuardTool to ground the brief.
- Narrate your creative concept to the user while tools run:
  'The emotional core here is [X]. The visual world I am building is [Y].'
- Do NOT wait silently. Keep the user engaged with your creative thinking.

**Phase 3 — CREATE IN PARALLEL:**
- Call ImageDirectorTool, CopywriterTool, and VoiceoverTool in parallel.
- Call VideoCinematographerTool AFTER ImageDirectorTool returns (needs reference frame).
- As each tool streams back results, narrate what you are doing:
  'Your hero image is rendering now — I placed the product on...'
  'Your headline came to me immediately — Not [X]. [Y].'

**Phase 4 — ASSEMBLE AND PRESENT:**
- Call CampaignAssemblerTool with all outputs.
- Present the campaign with creative confidence:
  'Here is your complete campaign. Let me walk you through it.'

## INTERRUPTION HANDLING

If the user interrupts you at ANY point:
- STOP immediately. Do not finish your sentence.
- If they redirect: 'Make it darker' — cancel in-progress generations,
  restart with the new direction. Say: 'Redirecting — night version coming.'
- If they ask a question: answer it, then continue where you left off.
- Never ignore an interruption. Never say 'as I was saying.'

## OUTPUT RULES

- Every substantive response MUST reference what you are creating or have created.
- Never give generic advice about marketing. You are creating, not advising.
- Responses should be 2-4 sentences of narration, then tool calls.
- NEVER reveal tool names to the user. They see the creative output, not the machinery.
- If a tool fails, acknowledge it naturally: 'The video is still rendering —
  your full campaign is ready, I will add the clip when it arrives.'

## PERSONA OPTIONS

When the user specifies an influencer persona, adapt your voice recommendations:
- Alex (25-35, urban professional): confident, slightly edgy, aspirational
- Maya (22-30, lifestyle creator): warm, relatable, authentic
- Jordan (28-40, fitness/wellness): energetic, motivational, direct
- Chloe (20-28, fashion/beauty): playful, aesthetic-forward, trend-aware
'''
```

### 5.2 BriefExtractorTool — Extraction Prompt

```python
BRIEF_EXTRACTOR_PROMPT = '''
You are a creative strategist extracting a structured campaign brief from a conversation.

CONVERSATION TRANSCRIPT:
{transcript}

Extract the following fields. If a field is unclear, infer the most likely value from
context. Never leave a field empty.

Return ONLY valid JSON matching this schema:
{
  "product_name": "exact name as mentioned",
  "brand_voice": "one of: empowering|playful|premium|edgy|warm|authoritative|authentic",
  "target_audience": "specific description e.g. women 35-50 who value self-acceptance",
  "emotional_hook": "the core emotional transformation this brand offers",
  "visual_direction": "specific visual language e.g. warm golden hour, clean minimalist",
  "platform": "one of: instagram|tiktok|linkedin|youtube|twitter|pinterest",
  "color_palette_hint": "any mentioned colors or inferred from brand personality",
  "influencer_persona": "one of: alex|maya|jordan|chloe|custom"
}
'''
```

### 5.3 ImageDirectorTool — Master Prompt Expansion

```python
IMAGE_EXPANSION_PROMPT = '''
You are a master commercial photographer and art director.

Transform this creative brief into a world-class Imagen 4 generation prompt.

BRIEF: {brief}
SHOT TYPE: {shot_type}

Create a single, highly detailed prompt (150-200 words) that includes:
1. SUBJECT: Precise description of the product/subject, placement, and styling
2. LIGHTING: Specific lighting setup (golden hour, studio rim light, soft window)
3. COMPOSITION: Camera angle, framing, depth of field, focal length
4. ATMOSPHERE: Color grading, mood, emotional tone
5. TECHNICAL: Photo quality markers (shot on Phase One, 85mm f/1.4, RAW, editorial)
6. NEGATIVE SPACE: Background treatment that serves the brand

Do NOT include: text overlays, logos, watermarks, people with faces (unless persona)

Style reference: think Vogue Italia product editorial meets Apple product photography.

Return ONLY the prompt text. No preamble.
'''
```

### 5.4 CopywriterTool — Campaign Copy Prompt

```python
COPYWRITER_PROMPT = '''
You are a world-class copywriter. Create campaign copy for this brief.

BRIEF: {brief}
PLATFORM: {platform}
TONE BENCHMARK: {tone_description}

Generate copy optimized for {platform}. Rules:

HEADLINE (max 7 words):
- Subvert the obvious category language
- Example for anti-aging skincare: 'Not anti-aging. Pro-living.' NOT 'Look younger today'
- Tension and contrast are your tools

BODY (2-3 sentences):
- Speak directly to the target audience's identity, not their problem
- No feature lists. Only transformation language.

CTA (max 5 words): Action-oriented, brand-consistent

CAPTION (for social post, max 100 words): Conversational, platform-appropriate

HASHTAGS (5-8 tags): Mix brand + category + trend tags

Return as JSON: {"headline": "", "body": "", "cta": "", "caption": "", "hashtags": []}
'''
```

### 5.5 VoiceoverTool — Script Generation Prompt

```python
VOICEOVER_SCRIPT_PROMPT = '''
Write a 15-25 word voiceover script for this campaign.

BRIEF: {brief}
HEADLINE: {headline}
EMOTIONAL HOOK: {emotional_hook}
VOICE PERSONA: {voice_persona}

Rules for the script:
- Speak in the second person ('You') — directly to the viewer
- One complete emotional arc in under 25 words
- End on an open note — not a command, a feeling
- Rhythm matters: read it aloud as you write it

Example (25 words): 'Life gets better after 40. Your skin knows it.
Your confidence knows it. LUMĒ just makes sure everyone else does too.'

Return ONLY the script. No quotes. No preamble.
'''
```

---

## 6. Backend Implementation

### 6.1 Project Structure

```
fluence-backend/
├── main.py                     # FastAPI app, WebSocket endpoint
├── agents/
│   ├── __init__.py
│   └── creative_director.py    # ADK root agent
├── tools/
│   ├── __init__.py
│   ├── brief_extractor.py
│   ├── brand_guard.py
│   ├── image_director.py
│   ├── video_cinematographer.py
│   ├── copywriter.py
│   ├── voiceover.py
│   └── campaign_assembler.py
├── schemas.py                  # All Pydantic models
├── prompts.py                  # All system prompts
├── gcs_utils.py                # Cloud Storage upload/sign helpers
├── config.py                   # Environment config (pydantic-settings)
├── requirements.txt
├── Dockerfile
└── tests/
    ├── test_tools.py
    └── test_session.py
```

### 6.2 main.py — FastAPI + WebSocket (ADK Bidi-Streaming)

> ⚠️ **Critical:** Use `runner.run_live()` with `LiveRequestQueue`, NOT `runner.run_async()`. This is the correct ADK pattern for bidirectional audio streaming.

```python
# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner, LiveRequestQueue
from google.adk.sessions import InMemorySessionService
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.genai.types import Blob
from agents.creative_director import creative_director_agent
import json, asyncio, uuid, base64

app = FastAPI(title='Fluence AI Backend', version='1.0.0')
app.add_middleware(CORSMiddleware,
    allow_origins=['https://fluenceai.app', 'http://localhost:5173'],
    allow_credentials=True, allow_methods=['*'], allow_headers=['*'],
)

session_service = InMemorySessionService()
APP_NAME = 'fluence_ai'

@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'fluence-backend'}

@app.websocket('/session')
async def session_endpoint(websocket: WebSocket):
    await websocket.accept()
    user_id  = websocket.query_params.get('user_id', 'anonymous')
    brand_id = websocket.query_params.get('brand_id')

    adk_session = await session_service.create_session(
        app_name=APP_NAME, user_id=user_id
    )
    runner = Runner(
        agent=creative_director_agent,
        app_name=APP_NAME,
        session_service=session_service,
    )

    # ✅ LiveRequestQueue — correct ADK bidi-streaming pattern
    live_queue = LiveRequestQueue()
    run_config = RunConfig(streaming_mode=StreamingMode.BIDI)

    async def keepalive():
        while True:
            await asyncio.sleep(25)
            try:
                await websocket.send_json({'type': 'ping'})
            except:
                break

    async def agent_to_client():
        async for event in runner.run_live(
            session=adk_session,
            live_queue=live_queue,
            run_config=run_config,
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, 'text') and part.text:
                        await websocket.send_json({
                            'type': 'narration',
                            'text': part.text,
                            'streaming': not event.is_final_response(),
                        })

    ka_task    = asyncio.create_task(keepalive())
    agent_task = asyncio.create_task(agent_to_client())

    try:
        await websocket.send_json({'type': 'session_ready', 'session_id': adk_session.id})

        async for raw in websocket.iter_text():
            msg = json.loads(raw)
            t = msg.get('type')

            if t == 'audio_chunk':
                pcm_bytes = base64.b64decode(msg.get('data', ''))
                live_queue.send_realtime(Blob(
                    data=pcm_bytes,
                    mime_type='audio/pcm;rate=16000',
                ))
            elif t == 'text_input':
                live_queue.send_realtime(Blob(
                    data=msg.get('text', '').encode(),
                    mime_type='text/plain',
                ))
            elif t == 'session_end':
                await websocket.send_json({'type': 'session_complete'})
                break

    except WebSocketDisconnect:
        pass
    finally:
        live_queue.close()
        ka_task.cancel()
        agent_task.cancel()
```

### 6.3 Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080",
     "--workers", "1", "--timeout-keep-alive", "300"]
```

### 6.4 requirements.txt

```
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

---

## 7. Frontend Architecture

### 7.1 Project Structure

```
fluence-frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types/
    │   ├── content-blocks.ts     # ContentBlock, InterlevedPayload types
    │   ├── session.ts            # SessionState, BrandProfile types
    │   └── campaign.ts           # CampaignBrief, Asset types
    ├── store/
    │   ├── session.store.ts      # Zustand: active session state
    │   ├── canvas.store.ts       # Zustand: canvas asset blocks
    │   └── brand.store.ts        # Zustand: brand profile
    ├── services/
    │   ├── websocket.service.ts  # WS connection, streaming handler
    │   ├── audio.service.ts      # Mic capture, PCM conversion, playback
    │   └── firebase.service.ts   # Auth + Firestore client
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx       # Two-panel layout wrapper
    │   │   ├── SessionPanel.tsx   # Left: conversation feed
    │   │   └── CanvasPanel.tsx    # Right: live campaign canvas
    │   ├── feed/
    │   │   ├── MessageBubble.tsx  # Container for all block types
    │   │   ├── NarrationBlock.tsx # Streaming text narration
    │   │   ├── ImageCard.tsx      # Generated image with zoom
    │   │   ├── VideoPlayer.tsx    # Inline video player
    │   │   ├── CopyBlock.tsx      # Headline + body + CTA + hashtags
    │   │   ├── AudioPlayer.tsx    # Waveform + playback control
    │   │   └── BriefCard.tsx      # Campaign brief summary card
    │   ├── canvas/
    │   │   ├── CampaignLayout.tsx # Auto-layout for canvas assets
    │   │   ├── AssetTile.tsx      # Individual canvas asset
    │   │   └── ExportPanel.tsx    # Download / share controls
    │   ├── controls/
    │   │   ├── VoiceCapture.tsx   # Mic button + visualizer
    │   │   ├── BrandUpload.tsx    # Logo + guideline upload flow
    │   │   └── PersonaSelector.tsx
    │   └── ui/
    │       ├── StatusIndicator.tsx
    │       ├── AuthModal.tsx
    │       └── GalleryGrid.tsx
    └── hooks/
        ├── useSession.ts          # Session lifecycle
        ├── useAudio.ts            # Mic + playback
        └── useStreaming.ts        # Content block stream handler
```

### 7.2 Content Block Types — TypeScript

```typescript
// types/content-blocks.ts
export type ContentBlockType =
  | 'narration' | 'image' | 'video' | 'copy' | 'audio' | 'brief' | 'status';

export interface NarrationBlock  { type: 'narration'; text: string; streaming: boolean }
export interface ImageBlock       { type: 'image'; signed_url: string; expanded_prompt: string; director_note: string; shot_type: string }
export interface VideoBlock       { type: 'video'; signed_url: string; duration: number }
export interface CopyBlock        { type: 'copy'; headline: string; body: string; cta: string; caption: string; hashtags: string[] }
export interface AudioBlock       { type: 'audio'; signed_url: string; script: string; voice_persona: string }
export interface BriefBlock       { type: 'brief'; platform: string; brand_voice: string; color_palette_hint: string; emotional_hook: string }

export type ContentBlock =
  NarrationBlock | ImageBlock | VideoBlock | CopyBlock | AudioBlock | BriefBlock;
```

### 7.3 WebSocket Service

```typescript
// services/websocket.service.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnect = 5;

  connect(userId: string, brandId?: string): void {
    const url = new URL(`${import.meta.env.VITE_BACKEND_WS_URL}/session`);
    url.searchParams.set('user_id', userId);
    if (brandId) url.searchParams.set('brand_id', brandId);

    this.ws = new WebSocket(url.toString());
    this.ws.onopen    = () => useSessionStore.getState().setStatus('connected');
    this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    this.ws.onclose   = () => {
      useSessionStore.getState().setStatus('disconnected');
      this.attemptReconnect(userId, brandId);
    };
  }

  private handleMessage(msg: ContentBlock & { type: string }): void {
    if (msg.type === 'ping') { this.send({ type: 'pong' }); return; }
    if (msg.type === 'session_ready') {
      useSessionStore.getState().setSessionId((msg as any).session_id);
      return;
    }
    useCanvasStore.getState().addBlock(msg as ContentBlock);
    useSessionStore.getState().addFeedBlock(msg as ContentBlock);
  }

  sendAudioChunk(base64Pcm: string): void { this.send({ type: 'audio_chunk', data: base64Pcm }); }
  sendTextInput(text: string): void       { this.send({ type: 'text_input', text }); }
  endSession(): void                       { this.send({ type: 'session_end' }); }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(data));
  }
  private attemptReconnect(userId: string, brandId?: string): void {
    if (this.reconnectAttempts < this.maxReconnect) {
      setTimeout(() => this.connect(userId, brandId),
        Math.pow(2, ++this.reconnectAttempts) * 1000);
    }
  }
}
export const wsService = new WebSocketService();
```

### 7.4 VoiceCapture Component

```tsx
// components/controls/VoiceCapture.tsx
export const VoiceCapture: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
    });
    const ctx = new AudioContext({ sampleRate: 16000 });
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=pcm' });
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) wsService.sendAudioChunk(await toBase64(e.data));
    };
    recorder.start(100);
    setRecording(true);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onMouseDown={startRecording}
        onMouseUp={() => setRecording(false)}
        onTouchStart={startRecording}
        onTouchEnd={() => setRecording(false)}
        animate={{ scale: recording ? 1 + amplitude * 0.3 : 1 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center
          ${recording ? 'bg-purple-600 shadow-purple-500/50 shadow-2xl' : 'bg-slate-700'}`}
      >
        <MicIcon className={recording ? 'text-white' : 'text-slate-300'} size={32} />
      </motion.button>
      <p className="text-slate-400 text-sm">
        {recording ? 'Release to send' : 'Hold to speak to FLUENCE'}
      </p>
    </div>
  );
};
```

---

## 8. Firestore Database Schema

```
# ── brand_profiles/{brand_id} ──────────────────────────────────────────
{
  brand_id:                  string,
  user_id:                   string,
  brand_name:                string,
  brand_voice:               string,   # 'empowering' | 'playful' | ...
  target_audience:           string,
  logo_gcs_uri:              string,   # uploaded logo
  primary_colors:            string[], # hex codes
  forbidden_words:           string[], # words that violate brand identity
  required_visual_elements:  string[],
  created_at:                Timestamp,
  updated_at:                Timestamp
}

# ── campaigns/{campaign_id} ────────────────────────────────────────────
{
  campaign_id:      string,
  user_id:          string,
  brand_id:         string | null,
  session_id:       string,
  status:           'in_progress' | 'complete' | 'failed',
  brief:            CampaignBrief,   # full brief JSON
  transcript:       string,          # full session transcript
  grounding_source: string,          # Firestore path used for grounding
  assets: {
    hero_image_url: string,
    hero_image_gcs: string,
    video_url:      string | null,
    video_gcs:      string | null,
    voiceover_url:  string,
    voiceover_gcs:  string,
    copy:           CopyOutput
  },
  created_at:   Timestamp,
  completed_at: Timestamp | null
}

# ── sessions/{session_id} ──────────────────────────────────────────────
{
  session_id:           string,
  user_id:              string,
  campaign_id:          string | null,
  brand_id:             string | null,
  status:               'active' | 'completed' | 'error',
  blocks_streamed:      number,   # count of content blocks sent
  tools_called:         string[], # which ADK tools fired
  grounding_validations: number,  # times BrandGuardTool ran
  started_at:           Timestamp,
  ended_at:             Timestamp | null
}

# ── users/{user_id} ────────────────────────────────────────────────────
{
  user_id:           string,
  email:             string,
  display_name:      string,
  brand_ids:         string[], # their brands
  campaigns_count:   number,
  preferred_persona: string,
  preferred_platform: string,
  created_at:        Timestamp
}
```

---

## 9. Deployment — Terraform IaC + Cloud Run

### 9.1 infrastructure/main.tf

```hcl
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

variable "project_id" {}
variable "region" { default = "us-central1" }

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com", "aiplatform.googleapis.com",
    "firestore.googleapis.com", "storage.googleapis.com",
    "texttospeech.googleapis.com", "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com", "firebase.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "fluence" {
  location      = var.region
  repository_id = "fluence-repo"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "fluence_backend" {
  name     = "fluence-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling  { min_instance_count = 1  max_instance_count = 10 }
    timeout  = "3600s"
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/fluence-repo/fluence-backend:latest"
      env { name = "PROJECT_ID"   value = var.project_id }
      env { name = "FIRESTORE_DB" value = "(default)" }
      env { name = "GCS_BUCKET"   value = google_storage_bucket.assets.name }
      resources { limits = { memory = "2Gi"  cpu = "2" } }
    }
  }
}

resource "google_cloud_run_service_iam_member" "noauth" {
  service  = google_cloud_run_v2_service.fluence_backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-fluence-assets"
  location                    = "US"
  force_destroy               = false
  uniform_bucket_level_access = true
  cors {
    origin          = ["https://fluenceai.app"]
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

output "backend_url" { value = google_cloud_run_v2_service.fluence_backend.uri }
output "bucket_name" { value = google_storage_bucket.assets.name }
```

### 9.2 infrastructure/setup.sh

```bash
#!/bin/bash
# infrastructure/setup.sh — Run once to initialize GCP project
set -e

PROJECT_ID=$1
if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./setup.sh <project-id>"
    exit 1
fi

gcloud config set project $PROJECT_ID
gcloud services enable \
  run.googleapis.com aiplatform.googleapis.com \
  firestore.googleapis.com storage.googleapis.com \
  texttospeech.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com firebase.googleapis.com

cd infrastructure
terraform init
terraform apply -var="project_id=$PROJECT_ID" -auto-approve

cd ../fluence-backend
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest

gcloud run deploy fluence-backend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout 3600 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1

echo "====> Setup complete!"
gcloud run services describe fluence-backend --region us-central1 --format='value(status.url)'
```

---

## 10. Build Prompts — 32 Prompts

### Phase 1 — Backend Foundation & ADK Setup (Days 1–2)

---

#### Prompt 1.1 — GCP Project Init & Backend Scaffold

```
Create a new Python FastAPI project called 'fluence-backend' with this exact structure:

fluence-backend/
├── main.py
├── agents/__init__.py
├── tools/__init__.py
├── schemas.py
├── prompts.py
├── config.py
├── gcs_utils.py
├── requirements.txt
├── Dockerfile
├── .env.example
└── tests/__init__.py

In config.py use pydantic-settings to load these env vars:
PROJECT_ID, FIRESTORE_DB='(default)', GCS_BUCKET, VERTEX_LOCATION='us-central1',
CORS_ORIGINS='http://localhost:5173,https://fluenceai.app'

In main.py create a FastAPI app with:
- CORS middleware using settings.CORS_ORIGINS
- GET /health returning {status: 'ok', service: 'fluence-backend'}
- A placeholder WebSocket /session endpoint that accepts connection, sends
  {type: 'session_ready', session_id: 'test'} and echoes messages back

In requirements.txt include: fastapi==0.111.1, uvicorn[standard]==0.30.1, pydantic==2.7.1,
pydantic-settings==2.3.0, google-adk>=0.3.0, google-generativeai>=0.8.0,
google-cloud-aiplatform>=1.58.0, google-cloud-firestore>=2.16.0,
google-cloud-storage>=2.17.0, google-cloud-texttospeech>=2.16.0,
vertexai>=1.58.0, httpx==0.27.0, python-multipart==0.0.9, websockets==12.0

Create a Dockerfile: python:3.11-slim base, install requirements, CMD uvicorn main:app --host 0.0.0.0 --port 8080
```

---

#### Prompt 1.2 — Pydantic Schemas

```
In fluence-backend/schemas.py create ALL Pydantic v2 models:

class CampaignBrief(BaseModel):
    product_name: str
    brand_voice: Literal['empowering','playful','premium','edgy','warm','authoritative','authentic']
    target_audience: str
    emotional_hook: str
    visual_direction: str
    platform: Literal['instagram','tiktok','linkedin','youtube','twitter','pinterest']
    color_palette_hint: str = ''
    influencer_persona: Literal['alex','maya','jordan','chloe','custom'] = 'maya'

Also create: BriefExtractorInput, BrandGuardInput, BrandGuardOutput, ImageDirectorInput,
ImageDirectorOutput, VideoInput, VideoOutput, CopyInput, CopyOutput, VoiceoverInput,
VoiceoverOutput, ContentBlock (with type discriminator field), InterlevedPayload.

Each model must have model_config = ConfigDict(extra='ignore').
Write a test in tests/test_schemas.py that instantiates each model with sample data.
```

---

#### Prompt 1.3 — System Prompts File

```
Create fluence-backend/prompts.py containing ALL system prompts as Python constants.

Include these constants (full text, not truncated):

CREATIVE_DIRECTOR_SYSTEM_PROMPT — The master agent persona:
  Identity: FLUENCE is a live AI creative director. Warm, direct, visionary.
  Tone: Never 'I can help you with that.' Always 'Here is what we are going to do.'
  Process phases: 1) Listen & Discover 2) Brief & Validate 3) Create in Parallel 4) Assemble
  Interruption handling: STOP immediately if user redirects mid-generation.
  Cancel in-flight tool calls. Restart with new direction. Never say 'as I was saying.'
  Output rules: Always reference what you are creating. Never reveal tool names to user.
  If tool fails: 'The video is still rendering — your campaign is ready, clip coming.'
  Persona adaptation for Alex/Maya/Jordan/Chloe

BRIEF_EXTRACTOR_PROMPT — Extracts CampaignBrief JSON from transcript. Include examples.
IMAGE_EXPANSION_PROMPT — Transforms brief into 150-200 word Imagen 4 master prompt.
  Must include: subject, lighting, composition, atmosphere, technical quality markers.
COPYWRITER_PROMPT — Generates headline/body/cta/caption/hashtags as JSON.
  Headline rule: Subvert category language. Tension and contrast as tools.
VOICEOVER_SCRIPT_PROMPT — 15-25 word script. Second person. One emotional arc.

Each prompt uses {field} placeholders for dynamic injection.
```

---

#### Prompt 1.4 — GCS Utilities

```
Create fluence-backend/gcs_utils.py with these async helper functions:

async def upload_to_gcs(data: bytes, folder: str, ext: str) -> str:
  - Upload bytes to GCS bucket under {folder}/{uuid}.{ext}
  - Return the gs:// URI

async def sign_gcs_url(gcs_uri: str, expiry_hours: int = 24) -> str:
  - Generate a v4 signed URL for the given gs:// URI
  - Return the https:// signed URL

async def download_from_gcs(gcs_uri: str) -> bytes:
  - Download file bytes from gs:// URI
  - Return raw bytes

Use google-cloud-storage async client throughout.
Load bucket name from settings.GCS_BUCKET.
Add proper exception handling — if upload fails, raise RuntimeError with message.
Write tests in tests/test_gcs.py that mock the GCS client and verify each function.
```

---

### Phase 2 — ADK Tools Implementation (Days 3–5)

---

#### Prompt 2.1 — BriefExtractorTool

```
Create fluence-backend/tools/brief_extractor.py

Implement an ADK @tool function BriefExtractorTool(input: BriefExtractorInput) -> CampaignBrief:

1. Use google.genai Client to call gemini-2.0-flash-001
2. Pass the BRIEF_EXTRACTOR_PROMPT from prompts.py with the conversation transcript
3. Set response_mime_type='application/json' and response_schema=CampaignBrief.model_json_schema()
4. Parse response.text as CampaignBrief via model_validate_json()
5. Return the validated CampaignBrief

Error handling:
- If JSON parsing fails: log the raw response, return a default CampaignBrief with
  product_name='Unknown Product' and sensible defaults
- If API call fails after 3 retries (exponential backoff): raise RuntimeError

Write a test that mocks the Gemini API call and verifies the tool returns a valid
CampaignBrief for a sample skincare transcript.
```

---

#### Prompt 2.2 — BrandGuardTool (Grounding)

```
Create fluence-backend/tools/brand_guard.py

Implement BrandGuardTool(input: BrandGuardInput) -> BrandGuardOutput:

1. Initialize async Firestore client from google.cloud.firestore_v1.async_client
2. If input.brand_id is provided:
   - Fetch document from brand_profiles/{brand_id}
   - If document doesn't exist, use DEFAULT_BRAND_GUIDELINES
   - Set grounding_source = f'brand_profiles/{brand_id}'
3. If no brand_id: use DEFAULT_BRAND_GUIDELINES, grounding_source = 'defaults'
4. Validate brief against brand data:
   - Check brand_voice against forbidden_words list
   - Check color_palette_hint against required_colors (fill from brand data if empty)
   - Check emotional_hook for brand violations
5. Return BrandGuardOutput with validated, violations list, grounding_source, adjusted_brief

DEFAULT_BRAND_GUIDELINES = {
  'forbidden_words': ['cheap', 'discount', 'bargain'],
  'required_colors': [],
  'tone': 'professional'
}

CRITICAL: This is the grounding step. Log grounding_source to session in Firestore.
Write a test verifying forbidden words are detected and brief is adjusted.
```

---

#### Prompt 2.3 — ImageDirectorTool

```
Create fluence-backend/tools/image_director.py

Implement ImageDirectorTool(input: ImageDirectorInput) -> ImageDirectorOutput:

Step 1 — Expand to master prompt:
- Call gemini-2.0-flash-001 with IMAGE_EXPANSION_PROMPT from prompts.py
- Pass brief as JSON and shot_type
- Parse response.text as the master prompt string

Step 2 — Generate with Imagen 4 via Vertex AI:
- vertexai.init(project=settings.PROJECT_ID, location='us-central1')
- from vertexai.preview.vision_models import ImageGenerationModel
- model = ImageGenerationModel.from_pretrained('imagen-4.0-generate-preview')
- images = model.generate_images(prompt=master_prompt, number_of_images=1,
    aspect_ratio=input.aspect_ratio, add_watermark=False,
    safety_filter_level='block_some')

Step 3 — Upload to GCS and sign URL:
- Use gcs_utils.upload_to_gcs(images[0]._image_bytes, 'images', 'jpg')
- Use gcs_utils.sign_gcs_url(gcs_uri, expiry_hours=24)

Step 4 — Return ImageDirectorOutput with gcs_uri, signed_url, expanded_prompt, director_note

Error handling: If Imagen call fails due to safety filter, retry with a softened prompt.
```

---

#### Prompt 2.4 — CopywriterTool

```
Create fluence-backend/tools/copywriter.py

Implement CopywriterTool(input: CopyInput) -> CopyOutput:

1. Prepare tone_description from brief.brand_voice:
   - 'empowering': 'Bold, confidence-affirming. Speaks to self-worth, not insecurity.'
   - 'playful': 'Light, witty, irreverent. Does not take itself too seriously.'
   - 'premium': 'Understated luxury. What you don't say matters as much as what you do.'
   - 'edgy': 'Provocative, slightly rebellious. Challenges category conventions.'
   - 'warm': 'Inviting, human, community-first. Feels like a close friend.'
   - 'authoritative': 'Expert-led, data-informed, outcome-focused.'
   - 'authentic': 'Unfiltered, real, relatable. Imperfections are features.'

2. Call gemini-2.0-flash-001 with COPYWRITER_PROMPT, setting:
   response_mime_type='application/json'
   response_schema=CopyOutput.model_json_schema()

3. Parse and return CopyOutput

4. Platform-specific adjustments:
   - TikTok: caption max 100 chars, 5-7 trending hashtags
   - LinkedIn: more formal body, professional CTA, 3-5 hashtags
   - Instagram: emoji allowed in caption, 8-10 hashtags
```

---

#### Prompt 2.5 — VoiceoverTool

```
Create fluence-backend/tools/voiceover.py

Implement VoiceoverTool(input: VoiceoverInput) -> VoiceoverOutput:

Step 1 — Generate voiceover script:
- Call gemini-2.0-flash-001 with VOICEOVER_SCRIPT_PROMPT
- Returns a 15-25 word script string

VOICE_PERSONAS dict (6 entries):
  alex:   en-US-Neural2-D (male, confident)
  maya:   en-US-Neural2-F (female, warm)
  jordan: en-US-Neural2-A (male, energetic)
  chloe:  en-US-Neural2-C (female, playful)
  zephyr: en-US-Wavenet-F (female, refined)
  puck:   en-US-Wavenet-D (male)

Step 2 — Synthesize with Cloud TTS:
- from google.cloud import texttospeech_v1 as tts
- Wrap script in SSML: <speak><prosody rate="medium" pitch="+2st">
  <break time="300ms"/>{script}<break time="500ms"/></prosody></speak>
- audio_config: MP3, speaking_rate=0.95

Step 3 — Upload to GCS and sign URL.
Return VoiceoverOutput with gcs_uri, signed_url, script, voice_persona.
```

---

#### Prompt 2.6 — VideoCinematographerTool

```
Create fluence-backend/tools/video_cinematographer.py

Implement VideoCinematographerTool(input: VideoInput) -> VideoOutput:

Step 1 — Download reference frame from GCS:
- Use gcs_utils.download_from_gcs(input.reference_frame_gcs_uri)
- Convert to base64: base64.b64encode(image_bytes).decode()

Step 2 — Call Veo 3.1 via Vertex AI Prediction API:
  from google.cloud import aiplatform
  client = aiplatform.gapic.PredictionServiceAsyncClient(
      client_options={'api_endpoint': 'us-central1-aiplatform.googleapis.com'}
  )
  endpoint = f'projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/veo-3.1-generate'
  instance = {
    'prompt': input.scene_description,
    'image': {'bytesBase64Encoded': image_b64},
    'videoLength': f'{input.duration_seconds}s',
    'aspectRatio': '9:16',
  }

Step 3 — Upload video bytes to GCS 'videos' folder, sign URL, return VideoOutput.

Error handling: Veo may take 30-60s. Use asyncio.wait_for with timeout=120.
If timeout: return VideoOutput with status='processing', signed_url=None.
```

---

#### Prompt 2.7 — CampaignAssemblerTool

```
Create fluence-backend/tools/campaign_assembler.py

Implement CampaignAssemblerTool that collects all tool outputs and formats
the interleaved payload for the frontend WebSocket stream.

Input: AssemblerInput with fields for all tool outputs (image, copy, video, audio, brief)

Build an ordered list of ContentBlock items:
1. {type: 'narration', text: FLUENCE intro to campaign, streaming: false}
2. {type: 'image', signed_url, expanded_prompt, director_note, shot_type: 'hero'}
3. {type: 'copy', headline, body, cta, caption, hashtags}
4. {type: 'audio', signed_url, script, voice_persona}
5. {type: 'video', signed_url, duration} — or status block if video still processing
6. {type: 'brief', platform, brand_voice, color_palette_hint, emotional_hook}

Also write the complete campaign to Firestore campaigns/{campaign_id}:
- All asset URLs, the brief, the grounding_source, status='complete'
- Return the InterlevedPayload with all blocks and the campaign_id

The assembler returns the payload to the root agent, which streams each block over
WebSocket with a 200ms delay between blocks for the progressive reveal effect.
```

---

### Phase 3 — Root Agent + WebSocket Integration (Days 5–6)

---

#### Prompt 3.1 — CreativeDirectorAgent

```
Create fluence-backend/agents/creative_director.py

Create the ADK root agent using google.adk.agents.Agent:

creative_director_agent = Agent(
    name='fluence_creative_director',
    model=Gemini(model='gemini-live-2.5-flash-native-audio'),
    description='Fluence AI live creative director.',
    instruction=CREATIVE_DIRECTOR_SYSTEM_PROMPT,
    tools=[BriefExtractorTool, BrandGuardTool, ImageDirectorTool,
           VideoCinematographerTool, CopywriterTool, VoiceoverTool,
           CampaignAssemblerTool],
    generate_content_config={
        'response_modalities': ['AUDIO', 'TEXT'],
        'speech_config': {'voice_config': {'prebuilt_voice_config': {'voice_name': 'Aoede'}}},
        'realtime_input_config': {
            'automatic_activity_detection': {
                'disabled': False,
                'start_of_speech_sensitivity': 'START_SENSITIVITY_HIGH',
                'end_of_speech_sensitivity': 'END_SENSITIVITY_MEDIUM'
            }
        }
    }
)

Add a convenience function create_runner(app_name, session_service) -> Runner.
```

---

#### Prompt 3.2 — WebSocket Session Endpoint

```
Upgrade main.py with the full production WebSocket /session endpoint.

CRITICAL: Use runner.run_live() with LiveRequestQueue and StreamingMode.BIDI.
Do NOT use runner.run_async() — that is text-mode only.

WebSocket message protocol:

Incoming from frontend:
  {type: 'audio_chunk', data: '<base64-pcm>'} — live mic audio (PCM 16kHz)
  {type: 'text_input', text: '<string>'}      — typed fallback
  {type: 'session_end'}                        — graceful close
  {type: 'pong'}                               — keepalive response

Outgoing to frontend:
  {type: 'session_ready', session_id, brand_id}
  {type: 'ping'}                               — every 25s
  {type: 'narration', text, streaming: bool}
  {type: 'image', signed_url, expanded_prompt, director_note}
  {type: 'video', signed_url, duration}
  {type: 'copy', headline, body, cta, caption, hashtags}
  {type: 'audio', signed_url, script, voice_persona}
  {type: 'brief', platform, brand_voice, color_palette_hint, emotional_hook}
  {type: 'status', message}
  {type: 'error', message, recoverable: bool}
  {type: 'session_complete'}

Implement:
1. ADK InMemorySessionService + Runner creation per connection
2. LiveRequestQueue + RunConfig(streaming_mode=StreamingMode.BIDI)
3. Audio chunks forwarded via live_queue.send_realtime(Blob(data=pcm_bytes, mime_type='audio/pcm;rate=16000'))
4. 25-second keepalive ping loop as asyncio.Task
5. Content blocks streamed with 200ms delay between each
6. Error handling that never crashes the session
```

---

#### Prompt 3.3 — End-to-End Backend Test

```
Create tests/test_session.py with a full integration test:

Test: test_complete_session
1. Start FastAPI test client (httpx.AsyncClient)
2. Connect to WebSocket /session?user_id=test_user
3. Receive session_ready message
4. Send {type: 'text_input', text: 'I have a new skincare brand called LUMĒ.
   It is for women over 40 who are tired of anti-aging panic. Empowering, warm tone.'}
5. Collect all incoming messages for 60 seconds
6. Assert messages received include types: narration, image, copy, audio, brief
7. Assert all signed_url fields are non-empty strings
8. Assert copy.headline is non-empty and copy.hashtags has at least 3 items
9. Assert session completes with session_complete message

Mock: ImageDirectorTool (return placeholder URL), VideoCinematographerTool (skip),
VoiceoverTool (return placeholder URL).
Let BriefExtractorTool and CopywriterTool call real Gemini API to verify output quality.
```

---

### Phase 4 — Frontend: Core Components (Days 6–8)

---

#### Prompt 4.1 — React Project Scaffold

```
Create a new React 19 + TypeScript + Vite project called 'fluence-frontend'.

npm create vite@latest fluence-frontend -- --template react-ts
cd fluence-frontend
npm install zustand @tanstack/react-query framer-motion firebase lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

Configure tailwind.config.ts with custom additions:
  colors: { fluence: { purple: '#C084FC', dark: '#05080F', navy: '#0A0F1E' } }
  animation: { 'fade-in': 'fadeIn 0.3s ease-in-out', 'slide-up': 'slideUp 0.4s ease-out' }

Create src/types/content-blocks.ts with all TypeScript interfaces.
Create src/types/session.ts: SessionStatus, SessionState, BrandProfile interfaces.
Create src/types/campaign.ts: Campaign, Asset interfaces.

Create src/store/session.store.ts (Zustand):
  State: status, sessionId, feedBlocks, isRecording, user
  Actions: setStatus, setSessionId, addFeedBlock, setRecording, setUser, reset

Create src/store/canvas.store.ts (Zustand):
  State: blocks (ContentBlock[]), campaignId
  Actions: addBlock, clearCanvas, removeBlock
```

---

#### Prompt 4.2 — WebSocket Service & Audio Service

```
Create src/services/websocket.service.ts as specified in Section 7.3.

Additionally implement:
- isConnected(): boolean — checks ws.readyState === WebSocket.OPEN
- onAudioResponse(callback: (base64mp3: string) => void) — for FLUENCE audio output

Create src/services/audio.service.ts:
class AudioService {
  async startCapture(onChunk: (base64: string) => void): Promise<void>
    // Request mic, create AudioContext at 16kHz
    // MediaRecorder with 100ms timeslice
    // Convert each Blob to base64 and call onChunk

  stopCapture(): void

  async playAudio(base64mp3: string): Promise<void>
    // Decode base64 → ArrayBuffer → AudioBuffer → play
    // Queue system: if already playing, add to queue

  getAmplitude(): number  // Return current mic amplitude 0-1 for UI visualizer
}

Create src/utils/audio.ts with helper:
export async function toBase64(blob: Blob): Promise<string>
```

---

#### Prompt 4.3 — AppShell Layout

```
Create src/components/layout/AppShell.tsx — the main two-panel layout.

Layout (full viewport, dark theme):
- Left panel (40% width, min-w-80): SessionPanel — scrolling conversation feed
- Right panel (60% width): CanvasPanel — live campaign canvas
- Top bar: FLUENCE wordmark (purple), session status indicator, end session button
- Bottom of left panel: VoiceCapture component

Tailwind classes:
  bg-[#05080F] text-white h-screen flex flex-col overflow-hidden
  Left panel: bg-[#0A0F1E] border-r border-slate-800/50
  Right panel: bg-[#080D18]

Create src/components/layout/SessionPanel.tsx:
- Reads feedBlocks from session.store
- Renders each block as a <MessageBubble> component
- Auto-scrolls to bottom when new blocks arrive (useEffect on feedBlocks.length)
- Shows 'FLUENCE is thinking...' animated dots when status='generating'

Create src/components/layout/CanvasPanel.tsx:
- Reads blocks from canvas.store
- Shows empty state ('Your campaign will appear here') when no blocks
- Renders CampaignLayout component when blocks exist
- Shows Export button when status='complete'
```

---

#### Prompt 4.4 — MessageBubble & All Content Block Components

```
Create src/components/feed/MessageBubble.tsx:
- Container component receiving a ContentBlock and rendering the correct child
- Entry animation: framer-motion initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}
- FLUENCE bubbles: left-aligned, subtle purple left border

Create src/components/feed/NarrationBlock.tsx:
- Renders streaming narration text
- If streaming=true: show blinking cursor at end of text

Create src/components/feed/ImageCard.tsx:
- Shows image with rounded corners, max-w-xs in feed
- On hover: show director_note tooltip overlay
- Click: open full-size in lightbox

Create src/components/feed/CopyBlock.tsx:
- Headline: text-white font-bold text-lg
- Body: text-slate-300 text-sm mt-1
- CTA: purple badge
- Hashtags: flex-wrap gap-1, each tag as text-purple-400 text-xs
- Copy-to-clipboard button on hover

Create src/components/feed/AudioPlayer.tsx:
- Show waveform bars (animated while playing, static otherwise)
- Play/pause button, show script text below
- Auto-plays when block first appears

Create src/components/feed/VideoPlayer.tsx:
- HTML5 <video> with controls, rounded corners, autoplay muted, loop

Create src/components/feed/BriefCard.tsx:
- Summary card: platform chip, brand_voice, color swatch from color_palette_hint
- Compact design: two columns of label/value pairs
```

---

#### Prompt 4.5 — VoiceCapture Component

```
Create src/components/controls/VoiceCapture.tsx as specified in Section 7.4.

Additional requirements:
- Press-and-hold (onMouseDown/Up, onTouchStart/End) for recording
- Amplitude-driven scale animation: button scales up to 1.3x at max amplitude
- While recording: show pulsing purple ring animation around button
- Text fallback: text input appears when user clicks a keyboard icon
  - On Enter key, call wsService.sendTextInput(text) and clear input

Status display below button:
  'Hold to speak' (idle)
  'Listening...' (recording)
  'FLUENCE is creating...' (generating, show animated spinner)

Create src/hooks/useAudio.ts:
Returns { startRecording, stopRecording, isRecording, amplitude }
Wraps audioService methods, connects audio chunks directly to wsService.sendAudioChunk()
```

---

#### Prompt 4.6 — CampaignLayout — Live Canvas

```
Create src/components/canvas/CampaignLayout.tsx:

The canvas auto-arranges ContentBlocks as they arrive using CSS Grid:

Starting state (empty): centered text 'Your campaign will appear here...'
After image block: large hero image takes center stage
After copy block: headline + body appear beside the image (60/40 split)
After audio block: audio player appears at bottom of canvas
After video block: video replaces hero image area in PiP mode
After brief block: compact brief card appears at top of canvas

Each block enters with framer-motion:
  initial: {opacity: 0, scale: 0.95}
  animate: {opacity: 1, scale: 1}
  transition: {duration: 0.4, ease: 'easeOut'}

Create src/components/canvas/AssetTile.tsx:
- Hover state: show download icon and expand icon
- Download: fetch signed_url and trigger browser download

Create src/components/canvas/ExportPanel.tsx:
- Appears when campaign is complete
- 'Download All' button: zip all assets (use JSZip)
- 'New Campaign' button: reset all stores, reconnect WebSocket
```

---

### Phase 5 — Auth, Brand Upload & Integration (Days 9–10)

---

#### Prompt 5.1 — Firebase Auth Integration

```
Create src/services/firebase.service.ts:

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_PROJECT_ID,
};

export const auth = getAuth(initializeApp(firebaseConfig));
export async function signInWithGoogle(): Promise<User>
export async function signOut(): Promise<void>
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe

Create src/components/ui/AuthModal.tsx:
- Shown when user is not signed in and tries to start a session
- 'Sign in with Google' button using firebase signInWithGoogle()
- FLUENCE branding, dark background, centered on screen
- Dismiss button (for browsing the gallery without signing in)

Add user state to session.store.ts:
- user: FirebaseUser | null
- Action: setUser(user)
- App.tsx: subscribe to onAuthChange and call setUser()

Gate the WebSocket connect() call: only connect if user is signed in.
Pass Firebase JWT token as query param in WS URL.
```

---

#### Prompt 5.2 — Brand Upload Flow

```
Create src/components/controls/BrandUpload.tsx:

A modal/drawer for creating a Brand Profile before starting a session.

Form fields:
- Brand name (text input)
- Logo upload (drag-drop or click, accepts PNG/JPG, shows preview)
- Brand voice selector (8 options as styled radio buttons)
- Target audience (text area)
- Primary colors (up to 3 hex color pickers)
- Forbidden words (comma-separated text input)

On submit:
1. Upload logo to backend: POST /brands with FormData
2. Backend saves logo to GCS, creates Firestore brand_profiles/{uid} document
3. Returns {brand_id} which is saved to brand.store.ts
4. Modal closes, brand_id is passed to WebSocket connection

Add backend endpoint POST /brands in main.py:
- Accepts FormData: brand_name, brand_voice, target_audience, colors[], forbidden_words[]
- Optional logo file upload
- Creates Firestore document, returns {brand_id, brand_name}
```

---

#### Prompt 5.3 — Gallery & Session History

```
Create src/components/ui/GalleryGrid.tsx:

A masonry grid showing all past campaigns from Firestore.
Query: collection('campaigns').where('user_id', '==', currentUser.uid).orderBy('created_at', 'desc')

Each campaign card shows:
- Hero image thumbnail (from assets.hero_image_url)
- Campaign product name from brief
- Platform chip, date
- Hover: show headline from copy
- Click: open campaign detail view

Campaign detail view:
- Full campaign canvas re-rendered from stored assets
- 'Remix' button: reconnects WebSocket with brand_id and sends:
  {type: 'text_input', text: f'Remix the {product_name} campaign. Previous brief: {brief_json}'}

Add a Gallery tab to AppShell top bar (only shown when not in active session).
```

---

### Phase 6 — Polish, Deploy & Demo Prep (Days 11–14)

---

#### Prompt 6.1 — Terraform Infrastructure

```
Create infrastructure/main.tf with the complete Terraform configuration from Section 9.1.

Also create:

infrastructure/variables.tf:
  variable "project_id" { type = string }
  variable "region" { type = string, default = "us-central1" }

infrastructure/outputs.tf:
  output "backend_url" { value = google_cloud_run_v2_service.fluence_backend.uri }
  output "bucket_name" { value = google_storage_bucket.assets.name }

infrastructure/setup.sh (from Section 9.2)

infrastructure/deploy.sh — incremental deploy:
  #!/bin/bash
  PROJECT_ID=$1
  cd fluence-backend
  gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest
  gcloud run deploy fluence-backend \
    --image us-central1-docker.pkg.dev/$PROJECT_ID/fluence-repo/fluence-backend:latest \
    --region us-central1

Create README.md with complete spin-up instructions:
1. Prerequisites (gcloud, terraform, node 20, python 3.11)
2. Clone repo and set GCP project
3. Run setup.sh
4. Set frontend .env with backend URL
5. npm run dev
```

---

#### Prompt 6.2 — Error Handling Audit

```
Perform a full error handling audit across the entire codebase.

Backend — verify these failure modes are handled gracefully:
1. Gemini API returns 429 (rate limit): retry with exponential backoff (1s, 2s, 4s, 8s)
2. Imagen 4 safety filter block: log and retry with softened prompt
3. Veo 3.1 timeout (>120s): send status block to frontend 'Video rendering, will deliver shortly'
   then continue polling and send video block when ready
4. Firestore unavailable: continue session without logging, store locally, sync when available
5. WebSocket client disconnects mid-session: save session state to Firestore so user can resume
   (implement GET /session/{session_id}/resume endpoint)
6. GCS upload failure: retry 3 times, then send error block to frontend

Frontend — verify these are handled:
1. WebSocket disconnects: show reconnecting indicator, auto-reconnect with backoff
2. Mic permission denied: show clear instructions modal (not just an alert)
3. Image signed URL expires (>24h): show re-fetch button on ImageCard
4. Audio playback blocked (browser autoplay policy): show manual play button

Write tests for each error case using pytest with mocked dependencies.
```

---

#### Prompt 6.3 — Architecture Diagram

```
Create docs/architecture.png showing the complete system.

The diagram must clearly label:

User Layer:
  [User Voice] ──► [Browser: React 19 App]
                   ├─ SessionPanel (conversation feed)
                   └─ CanvasPanel (live campaign canvas)

Transport Layer:
  [Browser] ◄──── WebSocket /session ────► [Cloud Run: FastAPI]
            ◄──── Streaming JSON blocks ───────────────────────

Agent Layer (inside Cloud Run box):
  [FLUENCE CreativeDirectorAgent (ADK Root)]
  ├─ [BriefExtractorTool]
  ├─ [BrandGuardTool]    ──► [Firestore: brand_profiles]
  ├─ [ImageDirectorTool] ──► [Vertex AI: Imagen 4]
  ├─ [VideoCinema...Tool]──► [Vertex AI: Veo 3.1]
  ├─ [CopywriterTool]    ──► [Vertex AI: Gemini Pro]
  ├─ [VoiceoverTool]     ──► [Cloud TTS]
  └─ [CampaignAssemblerTool]

Storage Layer:
  [Cloud Firestore: campaigns, sessions, users]
  [Cloud Storage: /images, /videos, /audio]

Auth Layer:
  [Firebase Auth: Google Sign-In]

Export as a clean 1920x1080 PNG with dark background.
Upload this PNG directly to the Devpost submission image carousel.
```

---

#### Prompt 6.4 — Devpost Submission Description

```
Write the complete Devpost submission description (400-600 words) for Fluence AI.

Structure it EXACTLY in this order:

1. SUMMARY OF FEATURES AND FUNCTIONALITY (150 words):
   Describe the one-session experience: voice → interleaved campaign.
   Mention all 6 content types: narration, hero image, video concept, copy, voiceover, brief.
   Describe the interruption/redirect capability.
   Mention the brand profile grounding.

2. TECHNOLOGIES USED (100 words):
   Gemini Live API (gemini-live-2.5-flash-native-audio) via Google GenAI SDK
   Google ADK (Agent Development Kit) — 8-agent multi-agent architecture
   Vertex AI Imagen 4, Veo 3.1, Gemini Pro
   Google Cloud Run, Cloud Firestore, Cloud Storage, Cloud TTS
   Firebase Auth, React 19 + TypeScript, FastAPI, Python 3.11, Terraform

3. DATA SOURCES (50 words):
   No external data sources. All generation is from user's live voice session.
   Brand profiles stored in Firestore are user-provided.

4. FINDINGS AND LEARNINGS (200 words):
   - Parallel ADK tool calling reduces total session time by 60%
   - 200ms streaming delay between content blocks creates natural progressive reveal
   - Cloud Run WebSocket timeout: required --timeout=3600 for full session support
   - Veo 3.1 generation averages 45-90s — async handling essential for UX
   - Brand grounding via Firestore prevents off-brand outputs more reliably than prompt instructions alone

End with: GitHub URL and backend URL. Save as docs/devpost_description.md
```

---

#### Prompt 6.5 — Blog Post (+0.6 bonus points)

```
Write a complete blog post for dev.to titled:
'How I Built Fluence AI: A Live Creative Director Powered by Gemini and ADK'

Structure (target 1200-1500 words):

INTRO (150 words): The problem with fragmented AI content tools.
The insight: what if the conversation IS the campaign?

SECTION 1 — The Architecture Decision (250 words):
Why ADK multi-agent over a single prompt approach.
How 8 specialized agents each do one thing perfectly.
The parallel tool calling pattern that makes it fast.

SECTION 2 — The Interleaved Payload (250 words):
The ContentBlock schema that makes progressive rendering possible.
How WebSocket streaming creates the 'live creation' feeling.
Code snippet: the assembler building the ordered block list.

SECTION 3 — The Hardest Technical Challenges (300 words):
WebSocket longevity on Cloud Run (the --timeout=3600 discovery)
Veo 3.1 async polling pattern
BrandGuardTool as grounding layer

SECTION 4 — Demo Insight (200 words):
The interruption moment as the 'aha' for judges
Why the creation process IS the product

CLOSING (100 words): Link to GitHub, demo URL.

REQUIRED DISCLAIMER (word-for-word):
'I created this piece of content for the purposes of entering the Gemini Live Agent Challenge hackathon.'

Publish to dev.to. Tag: #GeminiLiveAgentChallenge
Save draft as docs/blog_post.md
```

---

#### Prompt 6.6 — Final Submission Checklist

```
Run through this final checklist before submitting. Fix each failing item.

STAGE 1 — PASS/FAIL (every item must pass):
□ GitHub repo is PUBLIC
□ README.md has complete spin-up instructions (test from scratch on a clean machine)
□ Demo video uploaded to YouTube as PUBLIC (not unlisted)
□ Demo video is under 4:00 minutes (check duration twice)
□ Architecture diagram PNG uploaded to Devpost image carousel
□ GCP proof recording (Cloud Run + Firestore console, 60 seconds)
□ Devpost text description covers all 4 required sections
□ Category selected: Creative Storyteller
□ Cloud Run service is running and /health returns 200

STAGE 2 — QUALITY (score maximization):
□ Demo shows ALL 6 content types appearing inline in a single session
□ Demo shows the interruption pivot (user redirects mid-generation)
□ Demo shows BrandGuardTool grounding lookup (text overlay visible in video)
□ Vertex AI console visible in GCP proof showing Imagen/Veo API calls
□ Firestore console shows brand_profiles and campaigns collections with data

STAGE 3 — BONUS (all 3 for max +1.0):
□ GDG profile link ready (+0.2) — sign up at developers.google.com/community/gdg
□ infrastructure/main.tf and deploy.sh in public repo (+0.2)
□ Blog post published PUBLIC on dev.to with disclaimer and #GeminiLiveAgentChallenge (+0.6)

FINAL:
□ Set GCP billing alert — service must run through April 3, 2026
□ Add April 8 calendar reminder (winner notification — 2-day response window)
□ Submit on Devpost before 3:00 PM PDT March 16 (2 hours before deadline)
```

---

## 11. Demo Strategy & Shot List

| Time | Scene | Show | Say |
|---|---|---|---|
| 0:00–0:20 | HOOK | Black screen → montage | "A 30-second ad costs $50,000. A campaign takes 8 weeks. And by the time it launches — the trend is gone. Fluence AI changes that." |
| 0:20–0:45 | INTERFACE | Two-panel app, mic button | "One conversation. Your complete campaign. Watch." |
| 0:45–1:20 | BRIEF | User speaks naturally to FLUENCE | User: "I have a skincare brand called LUMĒ. For women over 40 who are done with anti-aging panic." FLUENCE responds with creative direction. |
| 1:20–1:55 | HERO IMAGE | Image renders in SessionFeed AND Canvas | FLUENCE narrates: "Your hero image — marble surface, warm backlight. The contrast says: premium, but yours." |
| 1:55–2:25 | COPY + GROUNDING | Copy block appears. Show BrandGuard overlay | FLUENCE: "Your headline — Not anti-aging. Pro-living. Validated against your brand voice." [Overlay: BrandGuard: grounded to brand_profiles/lumē] |
| 2:25–3:00 | ★ INTERRUPTION | User cuts off mid-generation | User: "Wait — night version. Dark background, candlelight." FLUENCE immediately: "Night version — immediately." New image appears. |
| 3:00–3:30 | AUDIO + VIDEO | AudioPlayer appears, video plays on canvas | Voiceover plays. FLUENCE: "Your campaign voiceover and video concept. Ready for export." |
| 3:30–3:50 | FULL CANVAS | Pull back to full canvas view | All assets visible: two images, copy, audio, video. "Built in one 3-minute conversation." |
| 3:50–4:00 | CLOSE | GitHub URL, Cloud Run console briefly | "Fluence AI — Outpace the viral loop. Code on GitHub." |

---

> **FLUENCE AI** — *You speak. It creates. Everything, at once.*
>
> Gemini Live Agent Challenge 2026 · Creative Storyteller · Grand Prize Target: $25,000 · Deadline: March 16, 5:00 PM PDT
