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
    
## Table of Contents

- [Table of Contents](#table-of-contents)
- [About The Project](#about-the-project)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)
- [Notice](#notice)

## About The Project

![Screenshot](images/demo.gif)

One of the challenges with building and contributing to open source software is that while many projects have amazing functionalities, they often miss out on reaching a wider audience due to lack of clear and user-friendly installation instructions. In addition, lack of efficient showcase of their use cases also contribute to the lower reach of these projects.

While there are ReadME templates that can help address this, the process of manually filling out these templates can be time-consuming and tedious. That&#39;s where our project makeread.me comes in.

Introducing makeread.me, an automated ReadMe Generator that can revolutionize how you create your project documentation. It is designed to:

- Save your valuable time enhancing your focus on development,
- Automate redundant tasks, and,
- Implement DRY (Don&#39;t Repeat Yourself) principles to your documentation.

It&#39;s free, open-source, and highly customizable. Feel free to modify our templates to fit your needs. If you find that a particular component is missing, you are more than welcome to contribute and expand the project.

We&#39;ve made it easy for you to contribute to the project by using Nunjucks and JSON templates for programmatic mapping. Enjoy the benefits of clear and concise project documentation with makeread.me!

### Built With

This project was built with the following technologies:

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
