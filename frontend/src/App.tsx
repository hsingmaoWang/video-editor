import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, Download } from 'lucide-react';
import { Header } from './components/Header';
import { UploadTab } from './components/Sidebar/UploadTab';
import { SubtitleTab } from './components/Sidebar/SubtitleTab';
import { ExportTab } from './components/Sidebar/ExportTab';
import { VideoPlayer } from './components/Player/VideoPlayer';
import { Timeline } from './components/Timeline/Timeline';
import { api } from './services/api';
import { VideoItem, SubtitleItem } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'subtitle' | 'export'>('upload');
  const [serverHealthy, setServerHealthy] = useState(false);

  // 影片素材狀態
  const [uploadedVideos, setUploadedVideos] = useState<VideoItem[]>([]);
  const [exportedVideos, setExportedVideos] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  // 播放與時間軸狀態
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);

  // 字幕狀態
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [isRendering, setIsRendering] = useState(false);

  // 初始載入：檢查伺服器健康度並讀取既有影片
  const refreshList = useCallback(async () => {
    try {
      await api.checkHealth();
      setServerHealthy(true);
      const list = await api.listVideos();
      setUploadedVideos(list.uploads);
      setExportedVideos(list.exports);

      // 若目前無選取影片但有已上傳影片，自動載入第一部
      if (!activeVideo && list.uploads.length > 0) {
        handleSelectVideo(list.uploads[0]);
      }
    } catch {
      setServerHealthy(false);
    }
  }, [activeVideo]);

  useEffect(() => {
    refreshList();
  }, []);

  // 選取影片時切換
  const handleSelectVideo = async (vid: VideoItem) => {
    setActiveVideo(vid);
    setCurrentTime(0);
    setIsPlaying(false);
    // 自動載入該影片既有字幕（若有的話）
    try {
      const cached = await api.getSubtitles(vid.filename);
      if (cached && cached.segments && cached.segments.length > 0) {
        setSubtitles(cached.segments);
      } else {
        setSubtitles([]);
      }
    } catch {
      setSubtitles([]);
    }
  };

  // 影片 duration 就緒
  const handleDurationChange = (d: number) => {
    setDuration(d);
    setTrimRange([0, d]);
  };

  // 上傳新影片
  const handleUpload = async (file: File) => {
    const res = await api.uploadVideo(file);
    await refreshList();
    const newVideoItem: VideoItem = {
      filename: res.filename,
      url: res.url,
      size_bytes: res.info.size_bytes,
      created_at: Date.now() / 1000,
    };
    handleSelectVideo(newVideoItem);
    if (res.info.duration > 0) {
      handleDurationChange(res.info.duration);
    }
  };

  // 自動轉錄字幕
  const handleGenerateSubtitles = async (lang: string) => {
    if (!activeVideo) return;
    const res = await api.generateSubtitles(activeVideo.filename, lang);
    setSubtitles(res.segments);
  };

  // 儲存字幕至本機 SRT 並自動下載（Blob URL 方式，繞過 Chrome localhost 下載封鎖）
  const handleSaveSubtitles = async () => {
    if (!activeVideo || subtitles.length === 0) return;
    try {
      const res = await api.saveSubtitles(activeVideo.filename, subtitles);

      // 1. 用 fetch 取得 SRT 檔案二進位內容
      const downloadUrl = `${api.API_BASE}/api/subtitle/download?filename=${encodeURIComponent(activeVideo.filename)}`;
      const fetchRes = await fetch(downloadUrl);
      if (!fetchRes.ok) throw new Error('下載字幕檔失敗，請確認後端服務運行中');
      const blob = await fetchRes.blob();

      // 2. 建立 Blob URL，讓瀏覽器本地觸發下載（不受 Chrome 安全限制）
      const blobUrl = URL.createObjectURL(blob);
      const cleanName = activeVideo.filename.replace(/^[a-f0-9]+_/, '');
      const srtFilename = `${cleanName.replace(/\.[^/.]+$/, '')}.srt`;
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = srtFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 釋放 Blob URL 記憶體
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      alert(
        `✅ 字幕儲存成功！\n\n📥 已下載至瀏覽器預設下載資料夾：${srtFilename}\n\n💾 本機後端同步儲存位置：\n${res.srt_path}`
      );
    } catch (err: any) {
      alert(`儲存字幕失敗：${err.message}`);
    }
  };

  // 執行剪輯與導出
  const handleRender = async (burnSubtitles: boolean) => {
    if (!activeVideo) return;
    try {
      setIsRendering(true);
      const res = await api.renderVideo({
        filename: activeVideo.filename,
        start_time: trimRange[0],
        end_time: trimRange[1],
        burn_subtitles: burnSubtitles,
        subtitles: burnSubtitles ? subtitles : undefined,
      });

      await refreshList();
      setActiveTab('export');
      alert(`影片導出成功！成品保存在本機：${res.output_filename}`);
    } catch (err: any) {
      alert(`導出失敗：${err.message}`);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-canva-dark text-gray-100 overflow-hidden">
      {/* 頂部導航列 */}
      <Header
        serverHealthy={serverHealthy}
        onExportClick={() => setActiveTab('export')}
        hasActiveVideo={activeVideo !== null}
        isRendering={isRendering}
      />

      {/* 主體編輯工作區 (側邊欄 + 播放器畫布) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 最左側 Canva 式圖示導航條 */}
        <aside className="w-16 bg-[#12161f] border-r border-canva-border flex flex-col items-center py-4 gap-4 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'upload'
                ? 'bg-canva-accent/20 text-canva-accent font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-canva-hover'
              }`}
          >
            <UploadCloud className="w-5 h-5" />
            <span className="text-[10px]">素材</span>
          </button>

          <button
            onClick={() => setActiveTab('subtitle')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'subtitle'
                ? 'bg-canva-accent/20 text-canva-accent font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-canva-hover'
              }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">字幕</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export'
                ? 'bg-canva-accent/20 text-canva-accent font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-canva-hover'
              }`}
          >
            <Download className="w-5 h-5" />
            <span className="text-[10px]">導出</span>
          </button>
        </aside>

        {/* 展開之功能側邊面板 */}
        <div className="w-80 bg-canva-panel border-r border-canva-border flex flex-col shrink-0 overflow-hidden">
          {activeTab === 'upload' && (
            <UploadTab
              videos={uploadedVideos}
              activeFilename={activeVideo ? activeVideo.filename : null}
              onSelectVideo={handleSelectVideo}
              onUpload={handleUpload}
            />
          )}

          {activeTab === 'subtitle' && (
            <SubtitleTab
              subtitles={subtitles}
              onGenerate={handleGenerateSubtitles}
              onUpdateSubtitles={setSubtitles}
              onSaveSubtitles={handleSaveSubtitles}
              currentTime={currentTime}
              onSeek={(t) => setCurrentTime(t)}
              hasActiveVideo={activeVideo !== null}
              activeFilename={activeVideo ? activeVideo.filename : null}
            />
          )}

          {activeTab === 'export' && (
            <ExportTab
              exportedVideos={exportedVideos}
              activeFilename={activeVideo ? activeVideo.filename : null}
              trimRange={trimRange}
              videoDuration={duration}
              onRender={handleRender}
              hasSubtitles={subtitles.length > 0}
            />
          )}
        </div>

        {/* 中央畫布視窗 */}
        <main className="flex-1 min-w-0 bg-[#0a0d13] flex flex-col">
          <div className="flex-1 min-h-0">
            <VideoPlayer
              videoUrl={activeVideo ? activeVideo.url : null}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onTimeUpdate={setCurrentTime}
              onDurationChange={handleDurationChange}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              subtitles={subtitles}
              trimRange={trimRange}
            />
          </div>

          {/* 底部時間軸控制區 */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSeek={(t) => setCurrentTime(t)}
            trimRange={trimRange}
            onTrimChange={setTrimRange}
            subtitles={subtitles}
          />
        </main>
      </div>
    </div>
  );
};

export default App;

