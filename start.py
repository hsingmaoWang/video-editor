"""
Zero-Token Video Editor - 本地一鍵啟動腳本
自動檢查環境、載入本機 FastAPI 後端與託管 React 前端，並開啟瀏覽器。
"""

import sys
import time
import webbrowser
from pathlib import Path

# 將 backend 納入路徑
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import uvicorn
from app.config import get_compute_device, get_ffmpeg_path

def main():
    print("=" * 60)
    print("  Zero-Token Video Editor (類 Canva 本地影音剪輯工具)")
    print("  核心機制：完全使用本地端 CPU/GPU 硬體算力，零 Token 成本")
    print("=" * 60)

    # 1. 硬體與依賴探測
    device_info = get_compute_device()
    ffmpeg_path = get_ffmpeg_path()

    print(f"[*] 運算裝置: {device_info['device_name']} ({device_info['device']})")
    print(f"[*] 推論精度: {device_info['compute_type']}")
    if ffmpeg_path:
        print(f"[V] FFmpeg: 已就緒 ({ffmpeg_path})")
    else:
        print("[!] FFmpeg: 未偵測到系統 PATH。若需進行硬編碼字幕燒錄，請將 ffmpeg.exe 放入 backend/bin/")

    print("\n[*] 啟動伺服器位址: http://127.0.0.1:8000")
    print("[*] 正在為您開啟瀏覽器...\n")

    # 延遲 1.2 秒自動開啟瀏覽器
    def open_browser():
        time.sleep(1.2)
        webbrowser.open("http://127.0.0.1:8000")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # 2. 啟動 Uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info", reload=False)

if __name__ == "__main__":
    main()

