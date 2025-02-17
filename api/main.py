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
    response = f"""Answer\n
# Sample Markdown Output

## Introduction

This is a **sample document** generated in Markdown format. The purpose of this document is to demonstrate how Claude outputs content in Markdown.



 Features of the Output

1. **Headings**: Supports multiple levels of headings. Features of the Output Features of the Output Features of the Output Features of the Output
2. **Lists**: Both ordered and unordered lists are supported.
3. **Code Blocks**: Inline and block code formatting available. Features of the Output Features of the Output Features of the Output Features of the Output
4. **Links**: Hyperlinks can be included.
5. **Tables**: Basic tables can be created.



## Example Elements

### Ordered List

1. First item
2. Second item
3. Third item

### Unordered List

- Item A
- Item B
  - Sub-item B1
  - Sub-item B2
- Item C

---

### Code Block Example

Here is an example of a code block:

"""
    # Split the response into paragraphs
    paragraphs = response.split("\n\n")
    for paragraph in paragraphs:
        if paragraph.strip():
            # Concatenate newline characters outside the f-string expression
            content = paragraph + "\n\n"
            yield f"data: {json.dumps({'content': content})}\n\n"
            await asyncio.sleep(0.1)  # Simulate delay
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

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
