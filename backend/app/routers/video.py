import shutil
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.config import UPLOAD_DIR, EXPORT_DIR, TEMP_DIR
from app.services.ffmpeg_service import FFmpegService
from app.services.whisper_service import WhisperService
from app.schemas import RenderRequest, SubtitleItem

router = APIRouter(prefix="/api/video", tags=["Video"])
ffmpeg_svc = FFmpegService()
whisper_svc = WhisperService()


@router.post("/upload")
def upload_video(file: UploadFile = File(...)):
    """
    上傳原始視訊或音訊檔案，保存至本機 storage/uploads/，並回傳中繼資料
    """
    allowed_exts = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".wav", ".mp3"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"不支援的檔案格式: {ext}，支援: {allowed_exts}")

    # 產生安全唯一的檔名
    unique_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    target_path = UPLOAD_DIR / unique_name

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 獲取影片時長與尺寸資訊
    info = ffmpeg_svc.get_media_info(target_path)

    return {
        "status": "success",
        "filename": unique_name,
        "original_filename": file.filename,
        "url": f"/static/uploads/{unique_name}",
        "info": info,
    }


@router.get("/list")
def list_videos():
    """
    列出已上傳的素材與已導出的成品
    """
    uploads = []
    for f in UPLOAD_DIR.glob("*"):
        if f.is_file():
            uploads.append({
                "filename": f.name,
                "url": f"/static/uploads/{f.name}",
                "size_bytes": f.stat().st_size,
                "created_at": f.stat().st_mtime,
            })

    exports = []
    for f in EXPORT_DIR.glob("*"):
        if f.is_file():
            exports.append({
                "filename": f.name,
                "url": f"/static/exports/{f.name}",
                "size_bytes": f.stat().st_size,
                "created_at": f.stat().st_mtime,
            })

    return {
        "uploads": sorted(uploads, key=lambda x: x["created_at"], reverse=True),
        "exports": sorted(exports, key=lambda x: x["created_at"], reverse=True),
    }


@router.post("/render")
def render_video(req: RenderRequest):
    """
    剪輯輸出：根據時間軸區間裁切，並將字幕時間戳平移後燒錄進影片
    """
    input_file = UPLOAD_DIR / req.filename
    if not input_file.exists():
        raise HTTPException(status_code=404, detail="找不到指定的影片來源檔案")

    srt_path = None
    if req.burn_subtitles:
        candidate_subs = req.subtitles or []
        
        # 若前端未傳遞字幕但請求燒錄，嘗試從本機暫存中讀取既有的 SRT 字幕
        if not candidate_subs:
            cached_srt = TEMP_DIR / f"{Path(req.filename).stem}.srt"
            if cached_srt.exists():
                try:
                    # 簡易讀取 SRT
                    lines = cached_srt.read_text(encoding="utf-8").splitlines()
                    # 每 4 行一個條目
                    parsed_subs = []
                    idx = 1
                    for i in range(0, len(lines), 4):
                        if i + 2 < len(lines):
                            time_line = lines[i + 1]
                            text_line = lines[i + 2].strip()
                            if "-->" in time_line:
                                start_part, end_part = time_line.split("-->")
                                def parse_t(ts_str):
                                    parts = ts_str.strip().replace(",", ".").split(":")
                                    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
                                parsed_subs.append({
                                    "id": idx,
                                    "start": parse_t(start_part),
                                    "end": parse_t(end_part),
                                    "text": text_line
                                })
                                idx += 1
                    candidate_subs = parsed_subs
                except Exception:
                    pass

        # 核心時間戳對齊：將字幕起訖時間扣除剪輯起點 start_time，使字幕與新視訊幀完美同步
        if candidate_subs:
            st = max(0.0, req.start_time)
            et = req.end_time if (req.end_time is not None and req.end_time > st) else float("inf")
            adjusted_subs = []
            
            for s in candidate_subs:
                s_dict = s.dict() if hasattr(s, "dict") else s
                start_t = float(s_dict["start"])
                end_t = float(s_dict["end"])

                # 僅保留落在剪輯區間 [st, et] 內的字幕條目
                if end_t > st and start_t < et:
                    adjusted_subs.append({
                        "id": len(adjusted_subs) + 1,
                        "start": max(0.0, round(start_t - st, 3)),
                        "end": max(0.05, round(min(et, end_t) - st, 3)),
                        "text": s_dict["text"],
                    })

            if adjusted_subs:
                temp_srt_name = f"render_{uuid.uuid4().hex[:8]}.srt"
                srt_path = TEMP_DIR / temp_srt_name
                whisper_svc.save_to_srt(adjusted_subs, srt_path)

    output_filename = f"export_{uuid.uuid4().hex[:8]}_{req.filename}"

    if not ffmpeg_svc.is_available():
        raise HTTPException(
            status_code=500,
            detail="系統尚未找到可用的 FFmpeg 執行檔，無法進行精確切片與字幕燒錄"
        )

    try:
        output_path = ffmpeg_svc.render_video(
            input_path=input_file,
            output_filename=output_filename,
            start_time=req.start_time,
            end_time=req.end_time,
            srt_path=srt_path,
        )
        return {
            "status": "success",
            "output_filename": output_filename,
            "url": f"/static/exports/{output_filename}",
            "size_bytes": output_path.stat().st_size,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"導出影片失敗: {str(e)}")
