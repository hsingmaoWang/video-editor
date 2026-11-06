import React, { useState } from 'react';
import { SubtitleItem } from '../../types';
import { Sparkles, Loader2, Save, Trash2, Plus, Clock, Download, Check, Copy } from 'lucide-react';
import { api } from '../../services/api';

interface SubtitleTabProps {
  subtitles: SubtitleItem[];
  onGenerate: (language: string) => Promise<void>;
  onUpdateSubtitles: (subs: SubtitleItem[]) => void;
  onSaveSubtitles: () => Promise<void>;
  currentTime: number;
  onSeek: (time: number) => void;
  hasActiveVideo: boolean;
  activeFilename?: string | null;
}

export const SubtitleTab: React.FC<SubtitleTabProps> = ({
  subtitles,
  onGenerate,
  onUpdateSubtitles,
  onSaveSubtitles,
  currentTime,
  onSeek,
  hasActiveVideo,
  activeFilename,
}) => {
  const [language, setLanguage] = useState('zh');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanStem = activeFilename
    ? activeFilename.replace(/^[a-f0-9]+_/, '').replace(/\.[^/.]+$/, '')
    : 'subtitles';
  // 顯示用本機相對路徑（單斜線，Windows 可讀）
  const expectedSrtPath = activeFilename
    ? `backend\\storage\\temp\\${activeFilename.replace(/\.[^/.]+$/, '')}.srt`
    : '';

  const handleCopyPath = () => {
    if (!expectedSrtPath) return;
    navigator.clipboard.writeText(expectedSrtPath).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Blob URL 下載 — 繞過 Chrome 對 localhost HTTP 下載的「無法擷取檔案」封鎖
  const handleDirectDownload = async () => {
    if (!activeFilename) return;
    try {
      const url = `${api.API_BASE}/api/subtitle/download?filename=${encodeURIComponent(activeFilename)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('尚未產生字幕，請先點擊「一鍵自動轉錄字幕」');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${cleanStem}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err: any) {
      alert(`下載失敗：${err.message}`);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await onGenerate(language);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveSubtitles();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextChange = (id: number, newText: string) => {
    const updated = subtitles.map((s) => (s.id === id ? { ...s, text: newText } : s));
    onUpdateSubtitles(updated);
  };

  const handleDelete = (id: number) => {
    const updated = subtitles.filter((s) => s.id !== id);
    onUpdateSubtitles(updated);
  };

  const handleAddAtCurrent = () => {
    const newId = subtitles.length > 0 ? Math.max(...subtitles.map((s) => s.id)) + 1 : 1;
    const start = Math.round(currentTime * 10) / 10;
    const end = Math.round((currentTime + 2.0) * 10) / 10;
    const newSub: SubtitleItem = {
      id: newId,
      start,
      end,
      text: '新字幕內容',
    };
    const updated = [...subtitles, newSub].sort((a, b) => a.start - b.start);
    onUpdateSubtitles(updated);
  };

  return (
    <div className="p-4 flex flex-col h-full gap-4">
      <div>
        <h2 className="text-sm font-semibold text-white">AI 自動字幕生成</h2>
        <p className="text-xs text-gray-400 mt-1">使用本機 Faster-Whisper 模型，零 Token 費用</p>
      </div>

      {/* 產生器設定區塊 */}
      <div className="bg-canva-dark/60 border border-canva-border rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 whitespace-nowrap">辨識語系：</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex-1 bg-canva-panel border border-canva-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-canva-accent"
          >
            <option value="zh">繁體/簡體中文 (Chinese)</option>
            <option value="auto">自動偵測語系 (Auto Detect)</option>
            <option value="en">英語 (English)</option>
            <option value="ja">日語 (Japanese)</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!hasActiveVideo || isGenerating}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${!hasActiveVideo || isGenerating
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-canva-accent hover:bg-canva-accent/90 text-black font-semibold'
            }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              本地 Whisper 辨識中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              一鍵自動轉錄字幕
            </>
          )}
        </button>
      </div>

      {/* 字幕列表操作列 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          字幕片段 ({subtitles.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddAtCurrent}
            disabled={!hasActiveVideo}
            title="在播放指針位置插入字幕"
            className="p-1 rounded bg-canva-panel hover:bg-canva-hover border border-canva-border text-xs text-gray-300 flex items-center gap-1 px-2"
          >
            <Plus className="w-3 h-3 text-canva-accent" />
            新增
          </button>
          <button
            onClick={handleSave}
            disabled={subtitles.length === 0 || isSaving}
            className="p-1 rounded bg-canva-panel hover:bg-canva-hover border border-canva-border text-xs text-gray-300 flex items-center gap-1 px-2"
          >
            <Save className="w-3 h-3 text-canva-accent" />
            {isSaving ? '儲存中' : '存為 SRT'}
          </button>
        </div>
      </div>

      {/* 字幕條目清單 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
        {subtitles.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            尚無字幕資料，點擊上方按鈕開始辨識
          </div>
        ) : (
          subtitles.map((sub) => {
            const isPlayingThis = currentTime >= sub.start && currentTime <= sub.end;
            return (
              <div
                key={sub.id}
                className={`p-2.5 rounded-lg border transition-all ${isPlayingThis
                    ? 'border-canva-accent bg-canva-accent/10'
                    : 'border-canva-border bg-canva-dark/50'
                  }`}
              >
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                  <button
                    onClick={() => onSeek(sub.start)}
                    className="flex items-center gap-1 hover:text-canva-accent text-gray-300 font-mono"
                  >
                    <Clock className="w-3 h-3 text-canva-accent" />
                    {sub.start.toFixed(1)}s ~ {sub.end.toFixed(1)}s
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="text-gray-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={sub.text}
                  onChange={(e) => handleTextChange(sub.id, e.target.value)}
                  className="w-full bg-canva-panel border border-canva-border rounded p-1.5 text-xs text-white focus:outline-none focus:border-canva-accent resize-none"
                />
              </div>
            );
          })
        )}
      </div>

      {/* 字幕儲存與檔案位置提示區 */}
      {subtitles.length > 0 && activeFilename && (
        <div className="bg-canva-dark/80 border border-canva-border rounded-xl p-3 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-canva-accent" />
              字幕檔操作與本機位置
            </span>
            {/* 改用 Blob URL 下載，避免 Chrome「無法在網站上擷取檔案」封鎖 */}
            <button
              onClick={handleDirectDownload}
              className="text-[11px] text-canva-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              直接下載 .SRT
            </button>
          </div>
          <div className="p-2 rounded bg-canva-panel border border-canva-border/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span className="truncate pr-2" title={expectedSrtPath}>
              {expectedSrtPath}
            </span>
            <button
              onClick={handleCopyPath}
              className="hover:text-white shrink-0 p-1 rounded hover:bg-canva-hover"
              title="複製本機檔案相對路徑"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
