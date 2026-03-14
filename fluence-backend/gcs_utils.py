import uuid, asyncio
from datetime import timedelta
from google.cloud import storage
from config import settings

import google.auth
from google.cloud import storage
from google.oauth2 import service_account

# Explicitly load the Service Account strictly from the JSON file to fetch the private key
# Since Cloud Run requires RSA keys to sign URLs, ADC (the compute identity token) isn't enough.
try:
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        print(f"[gcs_utils] Loading explicit credentials from: {settings.GOOGLE_APPLICATION_CREDENTIALS}")
        _creds = service_account.Credentials.from_service_account_file(
            settings.GOOGLE_APPLICATION_CREDENTIALS
        )
        _client = storage.Client(project=settings.PROJECT_ID, credentials=_creds)
    else:
        print("[gcs_utils] Warning: GOOGLE_APPLICATION_CREDENTIALS not set, using default ADC")
        _client = storage.Client(project=settings.PROJECT_ID)
except Exception as e:
    print(f"[gcs_utils] Error loading credentials: {e}")
    _client = storage.Client(project=settings.PROJECT_ID)

def _bucket():
    return _client.bucket(settings.GCS_BUCKET)

async def upload_to_gcs(data: bytes, folder: str, ext: str) -> str:
    import uuid
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
            method='GET'
        )
    )

async def download_from_gcs(gcs_uri: str) -> bytes:
    blob_name = gcs_uri.replace(f'gs://{settings.GCS_BUCKET}/', '')
    blob = _bucket().blob(blob_name)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, blob.download_as_bytes)
