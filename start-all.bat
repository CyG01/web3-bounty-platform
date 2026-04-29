@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set "RPC_PORT=8545"
set "WEB_PORT=5173"
set "MAX_WAIT_SECONDS=60"

echo [1/5] Checking local chain port !RPC_PORT!...
call :is_listening !RPC_PORT!
if !errorlevel! EQU 0 (
  echo Local chain already running on port !RPC_PORT!. Skipping node startup.
) else (
  echo Local chain not detected. Starting Hardhat node...
  start "Web3Bounty - Hardhat Node" /D "%~dp0" cmd /k "npm run node"
  echo Waiting for Hardhat node TCP port to be ready...
  call :wait_for_port !RPC_PORT! !MAX_WAIT_SECONDS!
  if !errorlevel! NEQ 0 (
    echo ERROR: Hardhat node did not become ready on port !RPC_PORT! within !MAX_WAIT_SECONDS! seconds.
    echo Please check the "Web3Bounty - Hardhat Node" window for errors.
    pause
    exit /b 1
  )
)

echo [2/5] Verifying JSON-RPC health on localhost:!RPC_PORT!...
call :wait_for_rpc !RPC_PORT! 20
if !errorlevel! NEQ 0 (
  echo ERROR: TCP port !RPC_PORT! is open but JSON-RPC is not responding.
  echo Please check the "Web3Bounty - Hardhat Node" window.
  pause
  exit /b 1
)

echo [3/5] Deploying contracts and syncing ABI...
call npm run deploy:local:sync
if errorlevel 1 (
  echo Deployment failed. Check the Hardhat node window and try again.
  pause
  exit /b 1
)

echo [4/5] Checking frontend port !WEB_PORT!...
call :is_listening !WEB_PORT!
if !errorlevel! EQU 0 (
  echo Frontend dev server already running on port !WEB_PORT!. Skipping duplicate startup.
) else (
  echo [5/5] Starting frontend dev server...
  start "Web3Bounty - Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port !WEB_PORT! --strictPort"
)

echo [Done] Startup complete.
echo.
echo Services:
echo - Hardhat node:  http://127.0.0.1:!RPC_PORT!
echo - Frontend dev : http://127.0.0.1:!WEB_PORT!
echo.
echo If WalletConnect QR login is unavailable, set VITE_WALLETCONNECT_PROJECT_ID in frontend/.env
pause
exit /b 0

:is_listening
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=%~1; $c=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if($c){exit 0}else{exit 1}"
exit /b %errorlevel%

:wait_for_port
set "WAIT_PORT=%~1"
set "WAIT_RETRIES=%~2"
for /L %%i in (1,1,!WAIT_RETRIES!) do (
  call :is_listening !WAIT_PORT!
  if !errorlevel! EQU 0 exit /b 0
  timeout /t 1 /nobreak >nul
)
exit /b 1

:rpc_ready
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=%~1; $body='{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}';" ^
  "try { $r=Invoke-RestMethod -Uri ('http://127.0.0.1:'+$port) -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2; if($r.result){exit 0}else{exit 1} } catch { exit 1 }"
exit /b %errorlevel%

:wait_for_rpc
set "WAIT_RPC_PORT=%~1"
set "WAIT_RPC_RETRIES=%~2"
for /L %%i in (1,1,!WAIT_RPC_RETRIES!) do (
  call :rpc_ready !WAIT_RPC_PORT!
  if !errorlevel! EQU 0 exit /b 0
  timeout /t 1 /nobreak >nul
)
exit /b 1
