# Zero-Token Video Editor (類 Canva 本地影音剪輯工具)

> 運用 **Vibe Coding** 理念打造之高階開源影音剪輯工具。除開發階段外，工具完工後**完全不呼叫任何付費雲端 API，剪輯與 AI 自動上字幕 100% 依賴本機端 CPU/GPU 硬體算力，實現「零 Token 營運成本」**。

---

## 核心亮點與特色

1. **類 Canva 網頁視覺化工作台**：
   - **左側側邊欄**：素材檔案庫拖曳上傳、多國語言字幕自動辨識、剪輯區間導出設定。
   - **中央播放畫布**：支援 HTML5 Video 高清預覽，搭配 **CSS 即時美化字幕疊層**（無須先行後端壓制即可 100% 所見即所得試看）。
   - **下方時間軸 (Timeline)**：具備 In-point / Out-point 雙向可拖曳裁剪手柄、播放紅指針 (Playhead) 精確跳轉、紫色字幕區間標記軌。

2. **本地 Faster-Whisper 語音轉文字 (零 Token 成本)**：
   - 整合 CTranslate2 高效推論引擎，速度為原版 Whisper 4 倍以上。
   - 自動硬體偵測：具備 NVIDIA 顯卡時啟用 `CUDA (float16)` 加速；一般電腦自動切換為 `CPU (int8)` 量化模式。
   - 支援線上時間戳與文字內容微調，並可一鍵導出標準 SubRip (`.srt`) 檔案。

3. **FFmpeg 工業級無損剪輯與硬編碼字幕燒錄**：
   - 時間軸精準裁切 (`-ss`, `-t`)。
   - 整合 `subtitles` filter 將調整後的 `.srt` 字幕無損燒錄進視訊軌。
   - 專門針對 Windows 檔案路徑與冒號逸出進行最佳化防護。

---

## 系統架構

```
video editor v01/
├── start.py                   # 一鍵整合啟動腳本 (Single-Port 模式: http://localhost:8000)
├── start_dev.bat              # 開發模式啟動 (FastAPI + Vite HMR: http://localhost:5173)
│
├── backend/                   # Python FastAPI 本地運算後端
│   ├── app/
│   │   ├── main.py            # FastAPI 核心、CORS、SPA 前端託管、靜態串流
│   │   ├── config.py          # 全域路徑與硬體 (CUDA/CPU) 自動探測
│   │   ├── schemas.py         # Pydantic 資料模型
│   │   ├── routers/           # /api/video 與 /api/subtitle 端點
│   │   └── services/          # FFmpegService 與 WhisperService
│   ├── storage/               # 本地儲存區 (uploads, temp, exports)
│   ├── bin/                   # 可攜式 FFmpeg 放置路徑 (ffmpeg.exe)
│   └── tests/                 # 單元測試套件
│
└── frontend/                  # React 18 + TypeScript + TailwindCSS 前端
    ├── src/
    │   ├── components/        # Header, Sidebar, VideoPlayer, Timeline
    │   ├── services/api.ts    # REST API 連線層
    │   └── App.tsx            # 核心狀態管理與畫布佈局
    └── dist/                  # 已生產打包之前端靜態資源
```

---

## 快速開始

### 方式一：一鍵啟動（推薦一般使用者）

直接在專案根目錄執行：

```powershell
python start.py
```

系統將自動檢測本機硬體、掛載前後端服務，並自動於預設瀏覽器開啟 **`http://127.0.0.1:8000`**。

---

### 方式二：開發雙工模式（前端熱更新 HMR）

如需修改前端 React 代碼並享有即時熱更新：

在 Windows 雙擊執行 `start_dev.bat` 或在終端分別執行：

```powershell
# 視窗 1：啟動後端
python backend/run.py

# 視窗 2：啟動前端開發伺服器
cd frontend
npm run dev
```

前端開發網址為 **`http://localhost:5173`**（已內建代理自動轉發請求至後端 8000 埠位）。

---

## FFmpeg 與模型配置說明

1. **FFmpeg 配置**：
   - 若系統已安裝 FFmpeg（在 PATH 中），工具會自動調用。
   - 若系統尚未安裝，只需下載 static build 的 `ffmpeg.exe` 並直接丟入 `backend/bin/` 目錄即可，無須設定環境變數。
2. **Faster-Whisper 離線快取**：
   - 首次進行語音辨識時，模型會快取至 `backend/storage/temp/models/`，後續執行完全離線，100% 免連網與零費用。

---

## 後端 REST API 規格

| 方法 | 端點 | 說明 |
| :--- | :--- | :--- |
| `GET` | `/api/health` | 伺服器健康度、Python 版本、FFmpeg 偵測與硬體狀態 |
| `POST` | `/api/video/upload` | 上傳原始視訊檔案，解析時長、尺寸與 FPS |
| `GET` | `/api/video/list` | 取得已上傳素材與已導出成品清單 |
| `POST` | `/api/subtitle/generate` | 本地 Faster-Whisper 音訊轉錄與字幕分段生成 |
| `POST` | `/api/subtitle/save` | 將微調後的字幕儲存為標準 `.srt` 檔案 |
| `POST` | `/api/video/render` | FFmpeg 精準剪輯與字幕硬編碼燒錄 |
| `GET` | `/docs` | Swagger UI 互動式 API 測試文件 |

---

## ☁️ 部署到 Vercel (網頁端託管)

本專案支援將漂亮的 React 前端介面部署到 **Vercel** 雲端：

1. **推送至 GitHub**：
   ```bash
   git remote add origin https://github.com/<您的GitHub帳號>/<專案名稱>.git
   git branch -M main
   git push -u origin main
   ```

2. **在 Vercel 建立新專案**：
   - 登入 [Vercel](https://vercel.com)，點擊 **Add New Project**。
   - 選擇匯入您在 GitHub 建立的本專案。
   - 專案已內建 `vercel.json`，Vercel 會自動辨識建置指令與產物目錄：
     - **Build Command**: `cd frontend && npm install && npm run build`
     - **Output Directory**: `frontend/dist`
   - （可選）在 Vercel 專案設定中加入環境變數：
     - `VITE_API_BASE_URL`：指定後端 API 伺服器網址（例如 `http://localhost:8000` 或雲端伺服器 IP）。
   - 點擊 **Deploy**，幾分鐘後即可透過專屬網址隨處存取剪輯工作台！


