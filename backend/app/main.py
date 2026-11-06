import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import (
    UPLOAD_DIR,
    EXPORT_DIR,
    TEMP_DIR,
    BASE_DIR,
    get_ffmpeg_path,
    get_ffprobe_path,
    get_compute_device,
)
from app.routers import video, subtitle

app = FastAPI(
    title="Zero-Token Video Editor API",
    description="本地運行、零 Token 成本之類 Canva 影音剪輯與語音轉文字後端引擎",
    version="0.1.0",
)

# 跨來源資源共用 (CORS) 設定：允許前端 (如 http://localhost:5173) 存取
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載靜態媒體目錄，使前端 HTML5 播放器能以 HTTP Range 串流預覽影片
app.mount("/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/static/exports", StaticFiles(directory=str(EXPORT_DIR)), name="exports")

# 註冊業務路由
app.include_router(video.router)
app.include_router(subtitle.router)

# 前端 SPA 整合：若前端已執行 npm run build，則直接託管 dist/
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/")
    def serve_frontend():
        from fastapi.responses import FileResponse
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "project": "Zero-Token Video Editor",
            "status": "online",
            "docs": "/docs",
        }

@app.get("/api/health")
def health_check():
    """
    系統健康檢查與硬體能力探測
    """
    ffmpeg_bin = get_ffmpeg_path()
    ffprobe_bin = get_ffprobe_path()
    compute = get_compute_device()

    return {
        "status": "healthy",
        "python_version": sys.version,
        "ffmpeg": {
            "available": ffmpeg_bin is not None,
            "path": ffmpeg_bin,
            "probe_available": ffprobe_bin is not None,
        },
        "hardware": compute,
        "storage": {
            "upload_dir": str(UPLOAD_DIR),
            "temp_dir": str(TEMP_DIR),
            "export_dir": str(EXPORT_DIR),
        },
    }
