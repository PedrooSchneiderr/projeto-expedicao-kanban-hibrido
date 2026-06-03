import asyncio
import websockets
import json

async def test():
    async with websockets.connect("ws://localhost:8000/ws") as websocket:
        print("Connected")
        await websocket.send(json.dumps({
            "type": "chat",
            "username": "admin",
            "message": "test",
            "recipient_id": None
        }))
        print("Sent")
        res = await websocket.recv()
        print("Received:", res)

asyncio.run(test())
