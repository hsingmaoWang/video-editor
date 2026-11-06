from typing import List, Optional
from pydantic import BaseModel


class SubtitleItem(BaseModel):
    id: int
    start: float
    end: float
    text: str


class RenderRequest(BaseModel):
    filename: str
    start_time: float = 0.0
    end_time: Optional[float] = None
    burn_subtitles: bool = False
    subtitles: Optional[List[SubtitleItem]] = None


class SubtitleGenerateRequest(BaseModel):
    filename: str
    language: Optional[str] = "zh"
    model_size: Optional[str] = "base"


class SubtitleSaveRequest(BaseModel):
    filename: str
    subtitles: List[SubtitleItem]

