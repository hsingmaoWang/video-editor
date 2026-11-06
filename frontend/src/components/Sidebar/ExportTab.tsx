import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { VideoItem } from '../../types';

interface ExportTabProps {
  exportedVideos: VideoItem[];
  activeFilename: string | null;
  trimRange: [number, number];
  videoDuration: number;
  onRender: (burnSubtitles: boolean) => Promise<void>;
  hasSubtitles: boolean;
}

export const ExportTab: React.FC<ExportTabProps> = ({
  exportedVideos,
  activeFilename,
  trimRange,
  videoDuration,
  onRender,
  hasSubtitles,
}) => {
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [start, end] = trimRange;
  const clipDuration = Math.max(0, end - start);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onRender(burnSubtitles);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full gap-4">
      <div>
        <h2 className="text-sm font-semibold text-white">導出剪輯設定</h2>
        <p className="text-xs text-gray-400 mt-1">使用本機 FFmpeg 進行精準切片與字幕硬編碼</p>
      </div>

      {/* 導出資訊摘要 */}
      <div className="bg-canva-dark/60 border border-canva-border rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">來源檔案：</span>
          <span className="text-white font-medium truncate max-w-[160px]">
            {activeFilename ? activeFilename.replace(/^[a-f0-9]+_/, '') : '未選取影片'}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">剪輯區間：</span>
          <span className="text-canva-accent font-mono font-medium">
            {start.toFixed(1)}s ~ {end.toFixed(1)}s ({clipDuration.toFixed(1)}s)
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">原始時長：</span>
          <span className="text-gray-300 font-mono">{videoDuration.toFixed(1)}s</span>
        </div>

        {/* 字幕硬編碼選項 */}
        <label className={`flex items-center justify-between p-2 rounded-lg bg-canva-panel border transition-all cursor-pointer select-none ${
          hasSubtitles ? 'border-canva-accent/40 hover:border-canva-accent' : 'border-canva-border opacity-70 cursor-not-allowed'
        }`}>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              將字幕燒錄進影片
              {hasSubtitles ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-normal">
                  已載入字幕
                </span>
              ) : (
                <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-normal">
                  未轉錄
                </span>
              )}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              {hasSubtitles
                ? "FFmpeg Subtitles Filter (區間精準對齊並無損壓制)"
                : "尚未產生字幕（請先至左側「字幕」標籤自動轉錄）"}
            </span>
          </div>
          <input
            type="checkbox"
            checked={burnSubtitles && hasSubtitles}
            onChange={(e) => setBurnSubtitles(e.target.checked)}
            disabled={!hasSubtitles}
            className="w-4 h-4 text-canva-accent rounded border-gray-600 focus:ring-0"
          />
        </label>

        {/* 導出動作按鈕 */}
        <button
          onClick={handleExport}
          disabled={!activeFilename || isExporting}
          className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
            !activeFilename || isExporting
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-canva-purple to-canva-accent hover:opacity-95 text-white'
          }`}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              本地 FFmpeg 渲染壓制中...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              開始導出成品影片
            </>
          )}
        </button>
      </div>

      {/* 導出歷史紀錄 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          導出歷史成果 ({exportedVideos.length})
        </span>
        {exportedVideos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            尚無導出成品
          </div>
        ) : (
          exportedVideos.map((vid) => {
            const sizeMb = (vid.size_bytes / (1024 * 1024)).toFixed(1);
            return (
              <div
                key={vid.filename}
                className="p-2.5 rounded-lg border border-canva-border bg-canva-dark/60 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-gray-200 truncate">{vid.filename}</p>
                    <p className="text-[10px] text-gray-500">{sizeMb} MB</p>
                  </div>
                </div>

                <a
                  href={vid.url}
                  download={vid.filename}
                  className="p-1.5 rounded-md bg-canva-panel hover:bg-canva-hover border border-canva-border text-gray-300 hover:text-white transition-colors"
                  title="下載至本機"
                >
                  <Download className="w-3.5 h-3.5 text-canva-accent" />
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

