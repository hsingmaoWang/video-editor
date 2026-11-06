import React, { useState } from 'react';
import { Video, Cpu, Sparkles, Download, CheckCircle2, AlertCircle, Settings, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  serverHealthy: boolean;
  onExportClick: () => void;
  hasActiveVideo: boolean;
  isRendering: boolean;
  onRefreshHealth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverHealthy,
  onExportClick,
  hasActiveVideo,
  isRendering,
  onRefreshHealth,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => api.getApiBase());
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveApiUrl = () => {
    api.setApiBase(apiUrl);
    setIsSaved(true);
    if (onRefreshHealth) onRefreshHealth();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetToDefault = () => {
    setApiUrl('');
    api.setApiBase('');
    setIsSaved(true);
    if (onRefreshHealth) onRefreshHealth();
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <>
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
        <div className="flex items-center gap-3">
          {/* 本地狀態標籤（可點擊查看與設定連線） */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-canva-dark/80 hover:bg-canva-dark border border-canva-border text-xs text-gray-300 transition-all cursor-pointer shadow-sm group"
            title="點擊查看算力狀態與連線設定"
          >
            <Cpu className="w-3.5 h-3.5 text-canva-accent" />
            <span>算力引擎</span>
            {serverHealthy ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" /> 在線
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <AlertCircle className="w-3 h-3" /> 離線 (點擊設定)
              </span>
            )}
            <Settings className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors ml-0.5" />
          </button>

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

      {/* 算力連線設定 Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-canva-panel border border-canva-border rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 text-gray-200">
            {/* 標題列 */}
            <div className="flex items-center justify-between border-b border-canva-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-canva-accent/20 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-canva-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">本地算力引擎狀態與連線設定</h3>
                  <p className="text-xs text-gray-400">零 Token 成本運算機制說明</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-canva-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 當前狀態 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-canva-dark/80 border border-canva-border">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">目前後端狀態：</span>
                {serverHealthy ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 正常連線中（可使用本機 GPU/CPU 進行 AI 轉錄與導出）
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> 離線中（目前為純前端預覽模式）
                  </span>
                )}
              </div>
              {onRefreshHealth && (
                <button
                  onClick={onRefreshHealth}
                  className="p-1.5 rounded-lg bg-canva-panel hover:bg-canva-hover text-xs text-gray-300 flex items-center gap-1"
                  title="重新檢查連線"
                >
                  <RefreshCw className="w-3 h-3" />
                  檢查
                </button>
              )}
            </div>

            {/* 為什麼在 Vercel 顯示離線？說明 */}
            <div className="text-xs text-gray-300 space-y-2.5 bg-[#141824] p-4 rounded-xl border border-canva-border/60">
              <div className="font-semibold text-white flex items-center gap-1.5 text-canva-accent">
                💡 為什麼在 Vercel 雲端網站上顯示「離線」？
              </div>
              <p className="text-gray-400 leading-relaxed">
                本專案的核心優勢是<b>「零付費 Token 營運成本」</b>，AI 語音轉錄（Faster-Whisper）與影片剪輯（FFmpeg）是直接在<b>您自己的電腦硬體</b>上計算。
              </p>
              <p className="text-gray-400 leading-relaxed">
                Vercel 僅託管此網頁前端介面。依照現代瀏覽器安全限制（Mixed Content），HTTPS 網頁無法直接連線至未加密的本機 <code className="text-canva-accent bg-black/40 px-1 py-0.5 rounded">http://localhost:8000</code>。
              </p>
            </div>

            {/* 解決方案推薦 */}
            <div className="space-y-3 text-xs">
              <div className="font-semibold text-white">🚀 如何享受 100% 完整功能？</div>

              {/* 推薦方案 1 */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <div className="font-medium text-emerald-400 flex items-center gap-1">
                  ⭐ 方案一（最推薦）：本機一鍵全功能模式
                </div>
                <p className="text-gray-300">
                  直接在您的電腦終端機執行：
                  <code className="block bg-black/50 p-2 rounded text-emerald-300 font-mono mt-1 select-all">
                    python start.py
                  </code>
                  會自動開啟 <b className="text-white">http://127.0.0.1:8000</b>，前後端直接同源運作，影音拖曳、AI 轉錄、FFmpeg 導出全部無限制暢通！
                </p>
              </div>

              {/* 方案 2：自訂後端網址 */}
              <div className="p-3 rounded-xl bg-canva-dark/80 border border-canva-border space-y-2">
                <div className="font-medium text-gray-200">
                  🌐 方案二：自訂後端 API 伺服器網址
                </div>
                <p className="text-[11px] text-gray-400">
                  若您使用 Cloudflare Tunnel、Ngrok 穿透（例如 <code className="text-white">https://xxx.trycloudflare.com</code>）或將後端部署在伺服器，可在下方填入網址：
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="例如: https://my-tunnel.trycloudflare.com 或留空使用同源"
                    className="flex-1 bg-canva-panel border border-canva-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-canva-accent font-mono"
                  />
                  <button
                    onClick={handleSaveApiUrl}
                    className="px-3 py-1.5 rounded-lg bg-canva-accent hover:bg-canva-accent/90 text-black font-semibold text-xs transition-all"
                  >
                    {isSaved ? '已儲存！' : '儲存'}
                  </button>
                  <button
                    onClick={handleResetToDefault}
                    className="px-2.5 py-1.5 rounded-lg bg-canva-panel hover:bg-canva-hover border border-canva-border text-gray-400 hover:text-white text-xs"
                    title="重設為預設值"
                  >
                    重設
                  </button>
                </div>
              </div>
            </div>

            {/* 關閉按鈕 */}
            <div className="flex justify-end pt-2 border-t border-canva-border/60">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 rounded-lg bg-canva-dark hover:bg-canva-hover border border-canva-border text-xs text-gray-300 hover:text-white transition-all"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
