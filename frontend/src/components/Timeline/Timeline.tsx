import React, { useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { SubtitleItem } from '../../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  trimRange: [number, number];
  onTrimChange: (range: [number, number]) => void;
  subtitles: SubtitleItem[];
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  isPlaying,
  onPlayPause,
  onSeek,
  trimRange,
  onTrimChange,
  subtitles,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [start, end] = trimRange;

  const validDuration = duration > 0 ? duration : 1;
  const playheadPercent = Math.min(100, Math.max(0, (currentTime / validDuration) * 100));
  const startPercent = Math.min(100, Math.max(0, (start / validDuration) * 100));
  const endPercent = Math.min(100, Math.max(0, (end / validDuration) * 100));

  // 點擊軌道進行時間跳轉 (Seek)
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  // 拖曳起始裁切手柄
  const handleStartDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!trackRef.current || duration <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
        const newStart = Math.min(ratio * duration, end - 0.5);
        onTrimChange([Math.max(0, newStart), end]);
      };
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [duration, end, onTrimChange]
  );

  // 拖曳結束裁切手柄
  const handleEndDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!trackRef.current || duration <= 0) return;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
        const newEnd = Math.max(ratio * duration, start + 0.5);
        onTrimChange([start, Math.min(duration, newEnd)]);
      };
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [duration, start, onTrimChange]
  );

  return (
    <div className="h-44 border-t border-canva-border bg-canva-panel flex flex-col select-none">
      {/* 工具控制條 */}
      <div className="h-10 border-b border-canva-border px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            className="w-7 h-7 rounded-full bg-canva-accent hover:bg-canva-accent/90 text-black flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => onSeek(start)}
            title="回到剪輯起點"
            className="p-1.5 rounded hover:bg-canva-hover text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-gray-300">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-4 text-gray-400">
          <span>剪輯區間：<strong className="text-canva-accent font-mono font-medium">{start.toFixed(1)}s ~ {end.toFixed(1)}s</strong></span>
          <span>有效時長：<strong className="text-white font-mono font-medium">{(end - start).toFixed(1)}s</strong></span>
        </div>
      </div>

      {/* 視覺軌道區 */}
      <div className="flex-1 p-4 flex flex-col justify-center">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative h-20 bg-canva-dark rounded-lg border border-canva-border overflow-hidden cursor-pointer"
        >
          {/* 字幕分段可視化標記軌 */}
          <div className="absolute top-1 inset-x-0 h-4 flex items-center pointer-events-none px-1">
            {subtitles.map((sub) => {
              const left = (sub.start / validDuration) * 100;
              const width = Math.max(1, ((sub.end - sub.start) / validDuration) * 100);
              const isActive = currentTime >= sub.start && currentTime <= sub.end;
              return (
                <div
                  key={sub.id}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(sub.start);
                  }}
                  className={`absolute h-3.5 rounded-sm border truncate text-[9px] px-1 flex items-center shadow-sm pointer-events-auto cursor-pointer transition-all ${
                    isActive
                      ? 'bg-canva-accent text-black font-semibold border-white scale-105 z-10'
                      : 'bg-canva-purple/80 text-white border-purple-400/40 hover:bg-canva-purple'
                  }`}
                  title={`[點擊跳轉] ${sub.start.toFixed(1)}s ~ ${sub.end.toFixed(1)}s: ${sub.text}`}
                >
                  {sub.text}
                </div>
              );
            })}
          </div>

          {/* 視訊區塊與波形/底色 */}
          <div className="absolute top-6 inset-x-0 bottom-1 flex items-center px-1">
            <div className="w-full h-10 bg-gradient-to-r from-gray-800 to-gray-700/60 rounded flex items-center justify-around px-2 opacity-60">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gray-500 rounded-full"
                  style={{ height: `${20 + (i % 5) * 12}%` }}
                />
              ))}
            </div>
          </div>

          {/* 剪輯遮罩 (左側非選取區) */}
          <div
            style={{ width: `${startPercent}%` }}
            className="absolute inset-y-0 left-0 bg-black/70 pointer-events-none backdrop-blur-[1px]"
          />

          {/* 剪輯遮罩 (右側非選取區) */}
          <div
            style={{ width: `${100 - endPercent}%` }}
            className="absolute inset-y-0 right-0 bg-black/70 pointer-events-none backdrop-blur-[1px]"
          />

          {/* 剪輯有效亮框 */}
          <div
            style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
            className="absolute inset-y-0 border-y-2 border-canva-accent pointer-events-none"
          />

          {/* 雙向左手柄 (In-Point) */}
          <div
            style={{ left: `${startPercent}%` }}
            onMouseDown={handleStartDrag}
            className="absolute inset-y-0 -ml-2 w-4 bg-canva-accent rounded-l cursor-ew-resize flex items-center justify-center shadow-lg z-10 hover:brightness-110 active:brightness-125"
          >
            <div className="w-0.5 h-6 bg-black/70 rounded-full" />
          </div>

          {/* 雙向右手柄 (Out-Point) */}
          <div
            style={{ left: `${endPercent}%` }}
            onMouseDown={handleEndDrag}
            className="absolute inset-y-0 -ml-2 w-4 bg-canva-accent rounded-r cursor-ew-resize flex items-center justify-center shadow-lg z-10 hover:brightness-110 active:brightness-125"
          >
            <div className="w-0.5 h-6 bg-black/70 rounded-full" />
          </div>

          {/* 播放指針 (Playhead Needle) */}
          <div
            style={{ left: `${playheadPercent}%` }}
            className="absolute inset-y-0 -ml-0.5 w-1 bg-rose-500 pointer-events-none z-20 shadow-md flex flex-col items-center"
          >
            <div className="w-3 h-3 bg-rose-500 rotate-45 -mt-1.5 shadow" />
          </div>
        </div>
      </div>
    </div>
  );
};

