@echo off
chcp 65001 >nul
echo ========================================================
echo  Zero-Token Video Editor - 開發雙工模式啟動 (HMR 熱更新)
echo ========================================================

echo 正在啟動後端 FastAPI (Port 8000)...
start "FastAPI Backend" cmd /k "python backend/run.py"

echo 正在啟動前端 Vite Dev (Port 5173)...
start "Vite Frontend" cmd /k "cd frontend && npm run dev"

echo 開發伺服器已於背景啟動：
echo 前端預覽: http://localhost:5173
echo 後端 API:  http://127.0.0.1:8000/docs
pause

