@echo off
echo ============================================
echo  MultiCam Live - LiveKit Server v1.12.0
echo ============================================
echo.

REM Verifica se o executável existe na pasta atual
if not exist "%~dp0livekit-server.exe" (
    echo [ERRO] livekit-server.exe nao encontrado nesta pasta.
    echo Verifique se o download foi concluido corretamente.
    pause
    exit /b 1
)

echo Iniciando LiveKit Server em ws://0.0.0.0:7880
echo Pressione Ctrl+C para parar.
echo.

"%~dp0livekit-server.exe" --config "%~dp0livekit.yaml"

pause
