import React, { useRef, useState } from 'react';
import { UploadCloud, Film, Loader2, Check } from 'lucide-react';
import { VideoItem } from '../../types';

interface UploadTabProps {
  videos: VideoItem[];
  activeFilename: string | null;
  onSelectVideo: (item: VideoItem) => void;
  onUpload: (file: File) => Promise<void>;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  videos,
  activeFilename,
  onSelectVideo,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      await onUpload(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full gap-4">
      <div>
        <h2 className="text-sm font-semibold text-white">素材檔案庫</h2>
        <p className="text-xs text-gray-400 mt-1">上傳本地影音檔，所有處理皆於本機完成</p>
      </div>

      {/* 拖曳上傳區塊 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          dragOver
            ? 'border-canva-accent bg-canva-accent/10'
            : 'border-canva-border hover:border-gray-500 bg-canva-dark/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/mkv"
          className="hidden"
          onChange={handleFileChange}
        />
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-canva-accent animate-spin" />
            <span className="text-xs text-gray-300 font-medium">檔案儲存中...</span>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-canva-panel flex items-center justify-center border border-canva-border">
              <UploadCloud className="w-5 h-5 text-canva-accent" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-200">點擊或拖曳影片至此</p>
              <p className="text-[10px] text-gray-500 mt-0.5">支援 MP4, MOV, WEBM, MKV</p>
            </div>
          </>
        )}
      </div>

      {/* 影片清單 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">已上傳影片 ({videos.length})</span>
        {videos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">
            目前尚無影片素材，請先點擊上方上傳
          </div>
        ) : (
          videos.map((vid) => {
            const isActive = activeFilename === vid.filename;
            const sizeMb = (vid.size_bytes / (1024 * 1024)).toFixed(1);
            return (
              <div
                key={vid.filename}
                onClick={() => onSelectVideo(vid)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isActive
                    ? 'border-canva-accent bg-canva-accent/15'
                    : 'border-canva-border bg-canva-dark/60 hover:bg-canva-hover'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-canva-panel flex items-center justify-center shrink-0 border border-canva-border">
                    <Film className={`w-4 h-4 ${isActive ? 'text-canva-accent' : 'text-gray-400'}`} />
                  </div>
                  <div className="truncate">
                    <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {vid.filename.replace(/^[a-f0-9]+_/, '')}
                    </p>
                    <p className="text-[10px] text-gray-500">{sizeMb} MB</p>
                  </div>
                </div>

                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-canva-accent flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-black font-bold" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

