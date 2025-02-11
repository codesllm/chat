from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import AsyncGenerator
import asyncio
import json

app = FastAPI()

# Updated CORS configuration with more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization"],
)

class ChatRequest(BaseModel):
    message: str

async def fake_stream_response(message: str) -> AsyncGenerator[str, None]:
    # Simulate a response being generated word by word
    response = f"{message}"
    words = response.split()
    
    for word in words:
        # Yield each word as a server-sent event with proper formatting
        yield f"data: {json.dumps({'content': word + ' '})}\n\n"
        await asyncio.sleep(0.01)
    
    yield "data: [DONE]\n\n"

@app.post("/api/chat/stream")
async def stream_chat(request: ChatRequest):
    return StreamingResponse(
        fake_stream_response(request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*"
        }
    )

# Add a health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
