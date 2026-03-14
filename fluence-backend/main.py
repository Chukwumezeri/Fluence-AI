import websocket_patch
websocket_patch.apply_websocket_patch()

import json, asyncio, uuid, base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from firestore_session import FirestoreSessionService
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import LiveRequestQueue
from google.genai.types import Blob
from google.cloud.firestore_v1.async_client import AsyncClient
from agents.creative_director import create_runner
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

db = AsyncClient(project=settings.PROJECT_ID)
session_service = FirestoreSessionService(db)
APP_NAME = 'fluence_ai'

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
    voice    = websocket.query_params.get('voice', 'Aoede')
    speed    = websocket.query_params.get('speed', 'normal')
    client_session_id = websocket.query_params.get('session_id')
    
    # Try to rehydrate existing session to preserve conversation memory
    adk_session = None
    if client_session_id:
        try:
            # FirestoreSessionService.get_session is async and needs keywords
            adk_session = await session_service.get_session(
                app_name=APP_NAME,
                user_id=user_id,
                session_id=client_session_id
            )
            if adk_session:
                session_id = client_session_id
                log.info(f'Session Rehydrated: {session_id} user={user_id}')
        except Exception as e:
            log.warning(f'Session rehydration failed for {client_session_id}: {e}')
            pass

    if not adk_session:
        session_id = client_session_id or uuid.uuid4().hex
        adk_session = await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )
        log.info(f'Session created: {session_id} user={user_id} voice={voice} speed={speed}')

    runner = create_runner(
        app_name=APP_NAME,
        session_service=session_service,
        voice_name=voice,
        speed=speed,
    )

    # LiveRequestQueue — the correct ADK bidi-streaming pattern
    live_queue  = LiveRequestQueue()
    run_config  = RunConfig(streaming_mode=StreamingMode.BIDI)

    async def safe_send(data: dict):
        try:
            await websocket.send_json(data)
        except Exception as e:
            log.warning(f'WS send failed: {e}')

    # Keepalive loop removed: rely on frontend to maintain activity, 
    # and Cloud Run's built-in TCP/HTTP idle timeouts.

    # Agent-to-client streaming task — reads events from run_live()
    async def agent_to_client():
        max_retries = 3
        retry_delay = 1.0  # Initial delay for backoff
        
        for attempt in range(max_retries + 1):
            try:
                async for event in runner.run_live(
                    session=adk_session,
                    live_queue=live_queue,
                    run_config=run_config,
                ):
                    # Reset retry delay on successful event receipt
                    retry_delay = 1.0
                    
                    if not event.content or not event.content.parts:
                        continue

                    for part in event.content.parts:
                        # --- Text narration from the AI ---
                        if hasattr(part, 'text') and part.text:
                            log.info(f'[Fluence] Narration: {part.text[:50]}...')
                            await safe_send({
                                'type': 'narration',
                                'text': part.text,
                                'streaming': not event.is_final_response(),
                            })
                            await asyncio.sleep(settings.BLOCK_STREAM_DELAY_MS / 1000)

                        # --- Inline audio response from the AI ---
                        elif hasattr(part, 'inline_data') and part.inline_data:
                            log.info(f'[Fluence] Audio chunk received: {len(part.inline_data.data)} bytes')
                            audio_b64 = base64.b64encode(
                                part.inline_data.data
                            ).decode()
                            await safe_send({
                                'type': 'audio_response',
                                'data': audio_b64,
                                'mime_type': part.inline_data.mime_type,
                            })

                        # --- Tool/function response (image, copy, video, audio, brief) ---
                        elif hasattr(part, 'function_call') or hasattr(part, 'function_response'):
                            # Capture and log tool calls
                            if hasattr(part, 'function_call'):
                                log.info(f'[Fluence] Tool Call: {part.function_call.name}')
                            
                            fr = getattr(part, 'function_response', None)
                            payload = fr.response if fr and hasattr(fr, 'response') else None
                            if isinstance(payload, dict) and payload.get('type'):
                                await safe_send(payload)
                                await asyncio.sleep(settings.BLOCK_STREAM_DELAY_MS / 1000)
                            elif isinstance(payload, dict):
                                # If it's wrapped in a 'result' key
                                inner = payload.get('result', payload)
                                if isinstance(inner, dict) and inner.get('type'):
                                    await safe_send(inner)
                                    await asyncio.sleep(settings.BLOCK_STREAM_DELAY_MS / 1000)

                        # --- Function call (agent is calling a tool) — show status ---
                        elif hasattr(part, 'function_call') and part.function_call:
                            tool_name = part.function_call.name
                            status_map = {
                                'BriefExtractorTool': '📋 Extracting campaign brief...',
                                'BrandGuardTool': '🛡️ Running brand safety check...',
                                'ImageDirectorTool': '🎨 Generating campaign imagery...',
                                'CopywriterTool': '✍️ Writing campaign copy...',
                                'VoiceoverTool': '🎙️ Recording voiceover...',
                                'VideoCinematographerTool': '🎬 Rendering cinematic video...',
                                'CampaignAssemblerTool': '📦 Assembling final campaign...',
                            }
                            status_msg = status_map.get(tool_name, f'⚙️ Running {tool_name}...')
                            await safe_send({'type': 'status', 'message': status_msg})

                # If the loop finishes naturally, break the retry loop
                break

            except Exception as e:
                err_msg = str(e)
                # Handle 429 Rate Limiting
                if '429' in err_msg or 'RESOURCE_EXHAUSTED' in err_msg:
                    if attempt < max_retries:
                        log.warning(f'Rate limit (429) hit. Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})')
                        await safe_send({'type': 'status', 'message': f'💤 Model is busy, retrying in {int(retry_delay)}s...'})
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        log.error(f'Rate limit (429) persists after {max_retries} retries.')
                
                # Handle Normal Idle Timeouts (Gemini Live behavior)
                if '1000 None. The operation was cancelled' in err_msg or 'Cancelled' in err_msg:
                    log.info(f'Agent stream closed normally (idle timeout): {err_msg}')
                    break
                else:
                    log.error(f'Agent stream error: {e}', exc_info=True)
                    await safe_send(ErrorBlock(message=err_msg, recoverable=True).model_dump())
                    break

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
                # Text fallback — send as Content with text Part
                from google.genai.types import Content, Part
                live_queue.send_content(Content(
                    role='user',
                    parts=[Part(text=msg.get('text', ''))],
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
        agent_task.cancel()
        log.info(f'Session ended: {session_id}')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8080, reload=True)
