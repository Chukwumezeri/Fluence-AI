import asyncio, base64

from google.cloud import aiplatform
from gcs_utils import download_from_gcs, upload_to_gcs, sign_gcs_url
from config import settings
import logging

log = logging.getLogger(__name__)

VEO_ENDPOINT = (
    f'projects/{settings.PROJECT_ID}/locations/{settings.VERTEX_LOCATION}'
    f'/publishers/google/models/{settings.VEO_MODEL}'
)


async def VideoCinematographerTool(reference_frame_gcs_uri: str, scene_description: str, duration_seconds: int = 5) -> dict:
    '''Generate a short cinematic video clip from a reference image frame.

    Args:
        reference_frame_gcs_uri: GCS URI of the reference image frame (e.g. gs://bucket/path.jpg).
        scene_description: Description of the scene to animate.
        duration_seconds: Duration of the video in seconds (default 5).

    Returns:
        A dictionary with signed_url, duration, and status.
    '''
    try:
        frame_bytes = await download_from_gcs(reference_frame_gcs_uri)
        frame_b64 = base64.b64encode(frame_bytes).decode()

        from google.cloud import aiplatform_v1
        from google.protobuf import struct_pb2

        api_client = aiplatform_v1.PredictionServiceAsyncClient(
            client_options={
                'api_endpoint': f'{settings.VERTEX_LOCATION}-aiplatform.googleapis.com'
            }
        )

        instance = struct_pb2.Value()
        instance.struct_value.fields['prompt'].string_value = scene_description
        instance.struct_value.fields['image'].struct_value.fields['bytesBase64Encoded'].string_value = frame_b64

        parameters = struct_pb2.Value()
        parameters.struct_value.fields['aspectRatio'].string_value = '9:16'
        parameters.struct_value.fields['sampleCount'].number_value = 1
        parameters.struct_value.fields['durationSeconds'].number_value = duration_seconds

        endpoint = (
            f'projects/{settings.PROJECT_ID}/locations/{settings.VERTEX_LOCATION}'
            f'/publishers/google/models/{settings.VEO_MODEL}'
        )

        # Use generate_content or predict — fall back gracefully 
        try:
            # Try the standard predict first (works with some Veo versions)
            response = await asyncio.wait_for(
                api_client.predict(
                    endpoint=endpoint,
                    instances=[instance],
                    parameters=parameters,
                ),
                timeout=settings.VEO_TIMEOUT_S,
            )
            video_bytes = base64.b64decode(
                response.predictions[0].struct_value.fields['bytesBase64Encoded'].string_value
            )
        except Exception as predict_err:
            log.warning(f'Veo predict() failed ({predict_err}), trying generate_video via genai...')
            # Fallback: use google-genai client for video generation
            from google import genai
            genai_client = genai.Client(
                vertexai=True,
                project=settings.PROJECT_ID,
                location=settings.VERTEX_LOCATION,
            )
            operation = genai_client.models.generate_videos(
                model=settings.VEO_MODEL,
                prompt=scene_description,
                config={'aspect_ratio': '9:16', 'number_of_videos': 1},
            )
            # Poll for completion
            import time
            start = time.time()
            while not operation.done and (time.time() - start) < settings.VEO_TIMEOUT_S:
                await asyncio.sleep(10)
                operation = genai_client.operations.get(operation)

            if not operation.done:
                log.warning(f'Veo LRO timed out after {settings.VEO_TIMEOUT_S}s')
                return {'type': 'video', 'signed_url': None, 'duration': duration_seconds, 'status': 'processing'}

            # Get the video bytes from result
            generated_video = operation.result.generated_videos[0]
            video_bytes = generated_video.video.video_bytes

        gcs_uri = await upload_to_gcs(video_bytes, 'videos', 'mp4')
        signed_url = await sign_gcs_url(gcs_uri, expiry_hours=24)

        return {
            'type': 'video',
            'gcs_uri': gcs_uri,
            'signed_url': signed_url,
            'duration': duration_seconds,
            'status': 'ready',
        }

    except asyncio.TimeoutError:
        log.warning(f'Veo timed out after {settings.VEO_TIMEOUT_S}s')
        return {'type': 'video', 'signed_url': None, 'duration': duration_seconds, 'status': 'processing'}
    except Exception as e:
        log.error(f'Veo error: {e}', exc_info=True)
        return {'type': 'video', 'signed_url': None, 'duration': duration_seconds, 'status': 'failed'}
