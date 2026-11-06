import React, { useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { SubtitleItem } from '../../types';

interface VideoPlayerProps {
  videoUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayPause: () => void;
  subtitles: SubtitleItem[];
  trimRange: [number, number];
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  subtitles,
  trimRange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = React.useState(false);

  // 同步外部播放狀態
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // 同步時間更新至外層
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    onTimeUpdate(t);

    // 若播放超過裁切區間右邊界，自動循環回裁切起始點
    const [, end] = trimRange;
    if (end > 0 && t >= end) {
      videoRef.current.currentTime = trimRange[0];
      onTimeUpdate(trimRange[0]);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    onDurationChange(videoRef.current.duration);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  // 尋找當前時間戳對應的字幕條目
  const activeSubtitle = subtitles.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#070a0e] overflow-hidden p-6">
      {videoUrl ? (
        <div className="relative max-w-full max-h-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-canva-border flex items-center justify-center group">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={onPlayPause}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* 即時視覺字幕疊層 (類 Canva 畫布預覽) */}
          {activeSubtitle && (
            <div className="absolute bottom-12 inset-x-0 flex justify-center pointer-events-none px-6">
              <span className="bg-black/75 backdrop-blur-sm text-white px-4 py-1.5 rounded-md text-base md:text-lg font-medium tracking-wide border border-white/10 shadow-lg text-center max-w-[85%]">
                {activeSubtitle.text}
              </span>
            </div>
          )}

          {/* 懸浮播放控制列 */}
          <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-4 text-xs text-white">
            <div className="flex items-center gap-3">
              <button onClick={onPlayPause} className="hover:text-canva-accent transition-colors">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button onClick={toggleMute} className="hover:text-canva-accent transition-colors">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="font-mono text-[11px] text-gray-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button onClick={toggleFullscreen} className="hover:text-canva-accent transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 flex flex-col items-center gap-2">
          <p className="text-sm font-medium">尚未載入影片</p>
          <p className="text-xs text-gray-600">請從左側上傳素材或選取現有影片開始剪輯</p>
        </div>
      )}
    </div>
  );
};

