from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import UPLOAD_DIR, TEMP_DIR
from app.services.ffmpeg_service import FFmpegService
from app.services.whisper_service import WhisperService
from app.schemas import SubtitleGenerateRequest, SubtitleSaveRequest, SubtitleItem

router = APIRouter(prefix="/api/subtitle", tags=["Subtitle"])
ffmpeg_svc = FFmpegService()
whisper_svc = WhisperService()


@router.post("/generate")
def generate_subtitles(req: SubtitleGenerateRequest):
    """
    自影片中辨識語音，產生含時間戳的逐字稿
    """
    video_path = UPLOAD_DIR / req.filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="找不到影片檔案")

    audio_path = video_path
    if ffmpeg_svc.is_available():
        try:
            # 先抽離成 16kHz 單聲道音訊以加速辨識
            audio_path = ffmpeg_svc.extract_audio(video_path)
        except Exception as e:
            # 抽離失敗時 fallback 直讀原始檔案
            audio_path = video_path

    try:
        segments = whisper_svc.transcribe(
            audio_path=audio_path,
            language=req.language,
            model_size=req.model_size or "base",
        )
        # 自動快取產出的 SRT 檔案至本機暫存，防範前端重新載入後遺失
        if segments:
            srt_filename = f"{Path(req.filename).stem}.srt"
            whisper_svc.save_to_srt(segments, TEMP_DIR / srt_filename)

        return {
            "status": "success",
            "segments": segments,
            "count": len(segments),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"語音辨識失敗: {str(e)}")


@router.get("/get")
def get_subtitles(filename: str):
    """
    取得已快取之字幕條目
    """
    srt_path = TEMP_DIR / f"{Path(filename).stem}.srt"
    if not srt_path.exists():
        return {"status": "not_found", "segments": []}

    try:
        lines = srt_path.read_text(encoding="utf-8").splitlines()
        segments = []
        i = 0
        idx = 1
        while i < len(lines):
            line = lines[i].strip()
            if line.isdigit() and i + 2 < len(lines):
                time_line = lines[i + 1].strip()
                text_line = lines[i + 2].strip()
                if "-->" in time_line:
                    start_str, end_str = time_line.split("-->")
                    def to_sec(s):
                        p = s.strip().replace(",", ".").split(":")
                        return float(p[0]) * 3600 + float(p[1]) * 60 + float(p[2])
                    segments.append({
                        "id": idx,
                        "start": round(to_sec(start_str), 2),
                        "end": round(to_sec(end_str), 2),
                        "text": text_line
                    })
                    idx += 1
                i += 3
            else:
                i += 1
        return {"status": "success", "segments": segments}
    except Exception as e:
        return {"status": "error", "message": str(e), "segments": []}


@router.post("/save")
def save_subtitles(req: SubtitleSaveRequest):
    """
    儲存使用者在前端微調後的字幕至本機 SRT 檔案
    """
    srt_filename = f"{Path(req.filename).stem}.srt"
    srt_path = TEMP_DIR / srt_filename

    try:
        whisper_svc.save_to_srt([s.dict() for s in req.subtitles], srt_path)
        resolved_path = str(srt_path.resolve())
        return {
            "status": "success",
            "srt_path": resolved_path,
            "filename": srt_filename,
            "download_url": f"/api/subtitle/download?filename={req.filename}",
            "message": f"字幕已成功存入本地硬碟：{resolved_path}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"儲存字幕失敗: {str(e)}")


@router.get("/download")
def download_subtitles(filename: str):
    """
    自後端直接下載該影片之 .srt 字幕檔
    """
    from fastapi.responses import FileResponse
    srt_filename = f"{Path(filename).stem}.srt"
    srt_path = TEMP_DIR / srt_filename
    if not srt_path.exists():
        raise HTTPException(status_code=404, detail="本機暫存中找不到此影片的字幕檔，請先點擊產生字幕")

    # 清除前綴 uuid，保留乾淨易讀的檔名供使用者下載
    clean_name = filename.split("_", 1)[-1] if "_" in filename else filename
    display_name = f"{Path(clean_name).stem}.srt"

    return FileResponse(
        path=srt_path,
        filename=display_name,
        media_type="application/octet-stream",
    )
