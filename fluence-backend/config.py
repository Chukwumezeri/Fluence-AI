from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='allow')

    # GCP
    PROJECT_ID: str
    VERTEX_LOCATION: str = 'us-central1'
    GCS_BUCKET: str
    FIRESTORE_DB: str = '(default)'
    GOOGLE_APPLICATION_CREDENTIALS: str = '/secrets/sa-key.json'

    # Models — do not change these strings
    GEMINI_LIVE_MODEL: str  = 'gemini-live-2.5-flash-native-audio'
    GEMINI_PRO_MODEL: str   = 'gemini-2.5-flash'
    IMAGEN_MODEL: str       = 'imagen-4.0-generate-001'
    IMAGEN_FAST_MODEL: str  = 'imagen-4.0-generate-001'
    VEO_MODEL: str          = 'veo-3.1-generate-preview'
    VEO_FAST_MODEL: str     = 'veo-3.1-fast-generate-preview'
    TTS_LANGUAGE: str       = 'en-US'

    # CORS
    CORS_ORIGINS: str = 'http://localhost:5173,https://fluence-ai-ae778.web.app,https://fluence-ai-ae778.firebaseapp.com'

    # Session tuning
    KEEPALIVE_INTERVAL_S: int  = 25
    VEO_TIMEOUT_S: int         = 120
    BLOCK_STREAM_DELAY_MS: int = 250

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(',')]

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
