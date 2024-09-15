import json
from aioredis import Redis
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from backend.redis.redis import get_redis

router = APIRouter(
    prefix="/ws",
    tags=["websocket"]
)

connections = {} # Use in memory storage for now

class ProgressUpdate(BaseModel):
    progress: float
    status: str
    message: str

@router.websocket("/progress/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str, redis: Redis = Depends(get_redis)):
    await websocket.accept()
    try:
        # Subscribe to the Redis channel for this task_id
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"task:{task_id}")

        connections[task_id] = websocket

        async for message in pubsub.listen():
            if message.get('type') == 'message':
                data = json.loads(message['data'])
                await websocket.send_json(data)

    except WebSocketDisconnect as e:
        print(f"WebSocket disconnected: {e}")
    finally:
        # Unsubscribe from the Redis channel
        await pubsub.unsubscribe(f"task:{task_id}")
        del connections[task_id]
        print(f"WebSocket disconnected: {e}")

async def send_progress_update(task_id: str, message: ProgressUpdate):
    if task_id in connections:
        websocket = connections[task_id]
        try:
            if websocket.client_state.CONNECTED:
                await websocket.send_json(message.model_dump())
            else:
                print(f"WebSocket for task {task_id} is no longer connected")
        except Exception as e:
            print(f"Error sending message to task {task_id}: {e}")
    else:
        print(f"No active connection for task {task_id}")