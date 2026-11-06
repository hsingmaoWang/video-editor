import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from app.config import get_ffmpeg_path, get_ffprobe_path, TEMP_DIR, EXPORT_DIR


class FFmpegService:
    def __init__(self):
        self.ffmpeg_path = get_ffmpeg_path()
        self.ffprobe_path = get_ffprobe_path()

    def is_available(self) -> bool:
        # 只要找得到 ffmpeg 執行檔即為可用
        self.ffmpeg_path = get_ffmpeg_path()
        return self.ffmpeg_path is not None

    def get_media_info(self, file_path: Path | str) -> Dict[str, Any]:
        """
        獲取影片長度、解析度、FPS 等中繼資料
        優先使用 ffprobe；若無 ffprobe 則調用 PyAV 直接讀取容器
        """
        file_path = Path(file_path).resolve()
        if not file_path.exists():
            raise FileNotFoundError(f"找不到檔案: {file_path}")

        # 1. 嘗試使用 PyAV (本機已安裝，精準且無須外部程序)
        try:
            import av
            with av.open(str(file_path)) as container:
                duration = 0.0
                if container.duration is not None:
                    duration = round(float(container.duration) / float(av.time_base), 3)

                width = 1920
                height = 1080
                fps = 30.0

                if container.streams.video:
                    v = container.streams.video[0]
                    width = v.width or 1920
                    height = v.height or 1080
                    if v.average_rate:
                        fps = round(float(v.average_rate), 2)

                return {
                    "duration": duration,
                    "width": width,
                    "height": height,
                    "fps": fps,
                    "size_bytes": file_path.stat().st_size,
                    "filename": file_path.name,
                    "ffprobe_available": True,
                }
        except Exception as pyav_err:
            logging.warning(f"PyAV media probe failed, fallback to ffprobe: {pyav_err}")

        # 2. 次選 ffprobe CLI
        if self.ffprobe_path:
            cmd = [
                self.ffprobe_path,
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                str(file_path)
            ]
            try:
                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
                probe_data = json.loads(result.stdout)
                format_info = probe_data.get("format", {})
                duration = float(format_info.get("duration", 0.0))
                width = 1920
                height = 1080
                fps = 30.0
                for stream in probe_data.get("streams", []):
                    if stream.get("codec_type") == "video":
                        width = stream.get("width", width)
                        height = stream.get("height", height)
                        r_frame_rate = stream.get("r_frame_rate", "30/1")
                        if "/" in r_frame_rate:
                            num, den = r_frame_rate.split("/")
                            if float(den) > 0:
                                fps = round(float(num) / float(den), 2)
                        break

                return {
                    "duration": duration,
                    "width": width,
                    "height": height,
                    "fps": fps,
                    "size_bytes": file_path.stat().st_size,
                    "filename": file_path.name,
                    "ffprobe_available": True,
                }
            except Exception:
                pass

        return {
            "duration": 0.0,
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
            "size_bytes": file_path.stat().st_size,
            "filename": file_path.name,
            "ffprobe_available": False,
        }

    def extract_audio(self, video_path: Path | str, output_wav_path: Optional[Path | str] = None) -> Path:
        """
        自視訊抽離音訊並轉為 16kHz 單聲道 WAV，以供 Faster-Whisper 高速推論
        """
        video_path = Path(video_path).resolve()
        ffmpeg_bin = get_ffmpeg_path()
        if not ffmpeg_bin:
            raise RuntimeError("尚未偵測到 FFmpeg，請安裝或將 ffmpeg.exe 放置於 backend/bin/")

        if output_wav_path is None:
            output_wav_path = TEMP_DIR / f"{video_path.stem}_audio_16k.wav"
        else:
            output_wav_path = Path(output_wav_path).resolve()

        output_wav_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            ffmpeg_bin,
            "-y",
            "-i", str(video_path),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(output_wav_path)
        ]

        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_wav_path

    def render_video(
        self,
        input_path: Path | str,
        output_filename: str,
        start_time: float = 0.0,
        end_time: Optional[float] = None,
        srt_path: Optional[Path | str] = None,
        font_size: int = 18,
        font_color: str = "&H00FFFFFF",
    ) -> Path:
        """
        精準裁切影片區間，並透過 FFmpeg subtitles filter 將 SRT 字幕無損燒錄 (Hardcode)
        採用工作目錄相對路徑法，徹底解決 Windows 冒號、反斜線與空白路徑轉義報錯問題。
        """
        ffmpeg_bin = get_ffmpeg_path()
        if not ffmpeg_bin:
            raise RuntimeError("尚未偵測到 FFmpeg，請安裝或將 ffmpeg.exe 放置於 backend/bin/")

        input_path = Path(input_path).resolve()
        output_path = (EXPORT_DIR / output_filename).resolve()

        cmd = [ffmpeg_bin, "-y"]

        # 1. 精準切片起始時間
        if start_time > 0:
            cmd.extend(["-ss", f"{start_time:.3f}"])

        # 2. 結束時間 / 時長
        if end_time is not None and end_time > start_time:
            duration = end_time - start_time
            cmd.extend(["-t", f"{duration:.3f}"])

        cmd.extend(["-i", str(input_path)])

        # 3. 處理字幕燒錄 (使用相對路徑以相容 Windows 路徑空白與磁碟代號)
        working_dir = None
        if srt_path and Path(srt_path).exists():
            srt_resolved = Path(srt_path).resolve()
            working_dir = str(srt_resolved.parent)
            srt_name = srt_resolved.name

            sub_filter = (
                f"subtitles={srt_name}:"
                f"force_style='FontSize={font_size},PrimaryColour={font_color},OutlineColour=&H00000000,Outline=2,BorderStyle=3,MarginV=30,Alignment=2'"
            )
            cmd.extend(["-vf", sub_filter])

        # 4. 編碼參數 (H.264 最佳相容性 + AAC 音訊)
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            str(output_path)
        ])

        logging.info(f"執行 FFmpeg 導出指令: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            cwd=working_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            logging.error(f"FFmpeg 導出失敗: {result.stderr}")
            raise RuntimeError(f"FFmpeg 壓制失敗: {result.stderr.splitlines()[-1] if result.stderr else '未知錯誤'}")

        return output_path
