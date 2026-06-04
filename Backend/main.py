import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import normalizer
import sentence_embedder

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str

@app.post("/analyze")
def analyze(req: TextRequest):
    result = normalizer.analyze(req.text)
    try:
        flow_result = sentence_embedder.analyze_flow(req.text)
        result["flow"] = flow_result["flow"]
    except Exception as e:
        traceback.print_exc()          # 서버 터미널에 전체 오류 출력
        result["flow"] = []
    return result

@app.get("/health")
def health():
    return {"status": "ok"}
