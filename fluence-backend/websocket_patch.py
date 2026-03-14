import logging

log = logging.getLogger('fluence')

def apply_websocket_patch():
    try:
        # --- HOTFIX: Disable unhandled websocket keepalive pings for Google GenAI API ---
        import websockets.asyncio.client
        _orig_connect = websockets.asyncio.client.connect
        
        def _patched_connect(*args, **kwargs):
            # The Vertex AI Multimodal Live API does not respond to python protocol pings reliably.
            # This causes the library to forcibly sever the connection with a 1011 timeout.
            kwargs['ping_interval'] = None
            kwargs['ping_timeout'] = None
            log.info("WebSocket connect patched: ping_interval=None")
            return _orig_connect(*args, **kwargs)
            
        websockets.asyncio.client.connect = _patched_connect
        log.info("Successfully installed websocket keepalive patch.")
    except Exception as e:
        log.error(f"Failed to patch websockets: {e}")
