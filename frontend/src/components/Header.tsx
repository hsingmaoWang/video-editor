import React from 'react';
import { Video, Cpu, Sparkles, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  serverHealthy: boolean;
  onExportClick: () => void;
  hasActiveVideo: boolean;
  isRendering: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  serverHealthy,
  onExportClick,
  hasActiveVideo,
  isRendering,
}) => {
  return (
    <header className="h-14 border-b border-canva-border bg-canva-panel px-4 flex items-center justify-between select-none">
      {/* 品牌與標題 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-canva-purple to-canva-accent flex items-center justify-center shadow-lg">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
            Vibe Video Studio
            <span className="text-[10px] bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 零 Token 成本
            </span>
          </h1>
          <p className="text-[11px] text-gray-400">本地高速運算引擎 (FastAPI + FFmpeg + Whisper)</p>
        </div>
      </div>

      {/* 伺服器狀態與操作 */}
      <div className="flex items-center gap-4">
        {/* 本地狀態標籤 */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-canva-dark/60 border border-canva-border text-xs text-gray-300">
          <Cpu className="w-3.5 h-3.5 text-canva-accent" />
          <span>本地算力</span>
          {serverHealthy ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" /> 在線
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <AlertCircle className="w-3 h-3" /> 離線
            </span>
          )}
        </div>

        {/* 導出按鈕 */}
        <button
          onClick={onExportClick}
          disabled={!hasActiveVideo || isRendering}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md ${
            !hasActiveVideo || isRendering
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-canva-purple to-canva-accent hover:opacity-95 text-white'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          {isRendering ? '導出合成中...' : '匯出影片'}
        </button>
      </div>
    </header>
  );
};

