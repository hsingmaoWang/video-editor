import io
import sys
import wave
import struct
from pathlib import Path

# 加入 backend 到 Python 搜尋路徑
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from starlette.datastructures import UploadFile
from app.schemas import RenderRequest, SubtitleGenerateRequest, SubtitleSaveRequest, SubtitleItem
from app.routers.video import upload_video, list_videos, render_video
from app.routers.subtitle import generate_subtitles, save_subtitles
from app.main import health_check

def create_valid_wav_bytes(duration_sec: float = 1.0) -> bytes:
    """產生包含合法 PCM 標頭之 WAV 音訊供測試"""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        num_samples = int(duration_sec * 16000)
        # 寫入靜音樣本
        wav.writeframes(struct.pack(f"<{num_samples}h", *([0] * num_samples)))
    return buffer.getvalue()

def run_tests():
    print("=== 1. 測試健康檢查 ===")
    health = health_check()
    print("Health Status:", health["status"])
    assert health["status"] == "healthy"

    print("\n=== 2. 測試真實影音檔案上傳 ===")
    wav_data = create_valid_wav_bytes(1.5)
    fake_file = UploadFile(filename="unit_test_audio.wav", file=io.BytesIO(wav_data))
    upload_res = upload_video(file=fake_file)
    print("Upload result:", upload_res["status"])
    print("Assigned Filename:", upload_res["filename"])
    filename = upload_res["filename"]

    print("\n=== 3. 測試影片清單 ===")
    listing = list_videos()
    print("Uploads count:", len(listing["uploads"]), "Exports count:", len(listing["exports"]))
    assert len(listing["uploads"]) >= 1

    print("\n=== 4. 測試 Faster-Whisper 真實音訊轉錄 ===")
    gen_req = SubtitleGenerateRequest(filename=filename, language="zh")
    sub_res = generate_subtitles(gen_req)
    print("Subtitles generated count:", sub_res["count"])

    print("\n=== 5. 測試字幕微調與儲存 (SRT) ===")
    sample_subs = [
        SubtitleItem(id=1, start=0.0, end=1.5, text="單元測試真實逐字稿")
    ]
    save_req = SubtitleSaveRequest(
        filename=filename,
        subtitles=sample_subs
    )
    save_res = save_subtitles(save_req)
    print("Saved SRT to:", save_res["filename"])
    assert Path(save_res["srt_path"]).exists()

    print("\n=== 6. 測試影片剪輯與渲染 (Render) ===")
    render_req = RenderRequest(
        filename=filename,
        start_time=0.0,
        end_time=1.5,
        burn_subtitles=True,
        subtitles=sample_subs
    )
    render_res = render_video(render_req)
    print("Render result status:", render_res["status"])
    print("Output URL:", render_res["url"])

    print("\n[V] 全部後端真實模型與核心管線測試 100% 通過！")

if __name__ == "__main__":
    run_tests()
