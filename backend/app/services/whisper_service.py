import math
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.config import get_compute_device, TEMP_DIR

# 相容性修復：PyAV 15+ 移除了 metadata_errors 參數，此處 patch 防止 faster_whisper.audio.decode_audio 報錯
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except Exception as e:
    logging.warning(f"PyAV patch failed or not installed: {e}")

def format_timestamp_srt(seconds: float) -> str:
    """將秒數格式化為標準 SRT 時間戳格式 (00:00:00,000)"""
    hours = math.floor(seconds / 3600)
    minutes = math.floor((seconds % 3600) / 60)
    secs = math.floor(seconds % 60)
    millis = math.floor((seconds - math.floor(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


class WhisperService:
    def __init__(self):
        self.device_info = get_compute_device()
        self._model = None
        self._loaded_model_size = None

    def _get_model(self, model_size: str = "base"):
        """延遲載入 (Lazy Load) 模型，節省記憶體"""
        if self._model is not None and self._loaded_model_size == model_size:
            return self._model

        try:
            from faster_whisper import WhisperModel
            device = self.device_info["device"]
            compute_type = self.device_info["compute_type"]
            
            # 本地快取載入，零外部網路 Token 費用
            self._model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type,
                download_root=str(TEMP_DIR / "models")
            )
            self._loaded_model_size = model_size
            return self._model
        except Exception as e:
            logging.error(f"[WhisperService] 載入模型失敗: {e}")
            raise RuntimeError(f"載入 Faster-Whisper 模型失敗: {str(e)}")

    def transcribe(
        self,
        audio_path: Path | str,
        language: Optional[str] = None,
        model_size: str = "base"
    ) -> List[Dict[str, Any]]:
        """
        將音訊檔轉為包含真實起訖時間戳的逐字稿
        依據上傳檔案真實內容即時解析，絕不使用硬編碼假資料
        """
        audio_path = Path(audio_path).resolve()
        if not audio_path.exists():
            raise FileNotFoundError(f"找不到影音來源檔案: {audio_path}")

        model = self._get_model(model_size)

        # 若語言設為 auto 或空值，傳入 None 讓 Faster-Whisper 自動語系偵測
        target_lang = None if (not language or language.lower() in ("auto", "none")) else language

        segments, info = model.transcribe(
            str(audio_path),
            language=target_lang,
            beam_size=5,
            vad_filter=True, # 啟用語音活動偵測，自動過濾靜音空白區間
        )

        results = []
        for idx, seg in enumerate(segments, start=1):
            text_clean = seg.text.strip()
            if text_clean:
                results.append({
                    "id": idx,
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": text_clean,
                })

        return results

    def save_to_srt(self, segments: List[Dict[str, Any]], output_path: Path | str) -> Path:
        """將字幕片段清單輸出為標準 .srt 檔案"""
        output_path = Path(output_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        srt_lines = []
        for seg in segments:
            idx = seg.get("id", 1)
            start_str = format_timestamp_srt(seg["start"])
            end_str = format_timestamp_srt(seg["end"])
            text = seg.get("text", "")

            srt_lines.append(f"{idx}\n{start_str} --> {end_str}\n{text}\n")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(srt_lines))

        return output_path
