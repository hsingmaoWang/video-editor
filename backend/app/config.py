import os
import shutil
import sys
from pathlib import Path

# 專案基礎路徑 (backend/)
BASE_DIR = Path(__file__).resolve().parent.parent

# 本地暫存與輸出路徑 (零 Token 成本，檔案全儲存於本地)
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
TEMP_DIR = STORAGE_DIR / "temp"
EXPORT_DIR = STORAGE_DIR / "exports"
BIN_DIR = BASE_DIR / "bin"

# 自動建立必要目錄
for d in [UPLOAD_DIR, TEMP_DIR, EXPORT_DIR, BIN_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# FFmpeg 偵測邏輯：優先找 backend/bin/，次之找 PATH，最後找 imageio_ffmpeg
def get_ffmpeg_path() -> str | None:
    local_bin = BIN_DIR / ("ffmpeg.exe" if sys.platform == "win32" else "ffmpeg")
    if local_bin.exists():
        return str(local_bin)
    path_in_env = shutil.which("ffmpeg")
    if path_in_env:
        return path_in_env
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    return None

def get_ffprobe_path() -> str | None:
    path_in_env = shutil.which("ffprobe")
    if path_in_env:
        return path_in_env
    local_bin = BIN_DIR / ("ffprobe.exe" if sys.platform == "win32" else "ffprobe")
    if local_bin.exists():
        return str(local_bin)
    return None

# 硬體加速偵測 (CUDA GPU / CPU fallback)
def get_compute_device() -> dict:
    has_cuda = False
    device_name = "CPU"
    try:
        import torch
        has_cuda = torch.cuda.is_available()
        if has_cuda:
            device_name = torch.cuda.get_device_name(0)
    except ImportError:
        pass

    return {
        "device": "cuda" if has_cuda else "cpu",
        "device_name": device_name,
        "compute_type": "float16" if has_cuda else "int8"
    }

