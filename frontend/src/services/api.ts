import {
  UploadResponse,
  VideoListResponse,
  SubtitleResponse,
  SubtitleItem,
  RenderResponse
} from '../types';

export function getApiBase(): string {
  try {
    const custom = localStorage.getItem('VIDEO_EDITOR_API_URL');
    if (custom !== null && custom !== undefined) {
      return custom.trim().replace(/\/$/, '');
    }
  } catch {}
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export function setApiBase(url: string) {
  try {
    if (!url.trim()) {
      localStorage.removeItem('VIDEO_EDITOR_API_URL');
    } else {
      localStorage.setItem('VIDEO_EDITOR_API_URL', url.trim());
    }
  } catch {}
}

export const API_BASE = getApiBase();

export function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
  const base = getApiBase();
  return `${base}${path}`;
}

export const api = {
  getApiBase,
  setApiBase,
  resolveMediaUrl,
  get API_BASE() {
    return getApiBase();
  },

  // 健康檢查
  async checkHealth() {
    const base = getApiBase();
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) throw new Error('伺服器連線失敗');
    return res.json();
  },

  // 取得已上傳與已導出的影片清單
  async listVideos(): Promise<VideoListResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/video/list`);
    if (!res.ok) throw new Error('無法取得影片清單');
    const data: VideoListResponse = await res.json();
    return {
      uploads: data.uploads.map((v) => ({ ...v, url: resolveMediaUrl(v.url) || v.url })),
      exports: data.exports.map((v) => ({ ...v, url: resolveMediaUrl(v.url) || v.url })),
    };
  },

  // 上傳影片
  async uploadVideo(file: File): Promise<UploadResponse> {
    const base = getApiBase();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${base}/api/video/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || '影片上傳失敗');
    }
    const data: UploadResponse = await res.json();
    return {
      ...data,
      url: resolveMediaUrl(data.url) || data.url,
    };
  },

  // 自動辨識並產生字幕 (Faster-Whisper 本地零成本)
  async generateSubtitles(filename: string, language: string = 'zh'): Promise<SubtitleResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/subtitle/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || '字幕產生失敗');
    }
    return res.json();
  },

  // 取得既有快取字幕
  async getSubtitles(filename: string): Promise<SubtitleResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/subtitle/get?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) return { status: 'not_found', segments: [], count: 0 };
    return res.json();
  },

  // 儲存編輯後的字幕
  async saveSubtitles(filename: string, subtitles: SubtitleItem[]) {
    const base = getApiBase();
    const res = await fetch(`${base}/api/subtitle/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, subtitles }),
    });
    if (!res.ok) throw new Error('字幕儲存失敗');
    return res.json();
  },

  // 剪輯輸出影片
  async renderVideo(params: {
    filename: string;
    start_time: number;
    end_time?: number;
    burn_subtitles: boolean;
    subtitles?: SubtitleItem[];
  }): Promise<RenderResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/video/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || '影片導出失敗');
    }
    const data: RenderResponse = await res.json();
    return {
      ...data,
      url: resolveMediaUrl(data.url) || data.url,
    };
  },
};

