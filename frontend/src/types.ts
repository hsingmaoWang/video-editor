export interface SubtitleItem {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  size_bytes: number;
  filename: string;
  ffprobe_available?: boolean;
}

export interface VideoItem {
  filename: string;
  url: string;
  size_bytes: number;
  created_at: number;
}

export interface VideoListResponse {
  uploads: VideoItem[];
  exports: VideoItem[];
}

export interface UploadResponse {
  status: string;
  filename: string;
  original_filename: string;
  url: string;
  info: VideoInfo;
}

export interface SubtitleResponse {
  status: string;
  segments: SubtitleItem[];
  count: number;
}

export interface RenderResponse {
  status: string;
  message?: string;
  output_filename: string;
  url: string;
  size_bytes?: number;
}

