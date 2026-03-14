import websockets.asyncio.client
print("Patched ping_interval:", websockets.asyncio.client.connect.__name__)
