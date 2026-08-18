@echo off
title EPR Dashboard - Servidor Local
color 0A
cls

echo ==============================================================================
echo                      EPR DASHBOARD - SERVIDOR LOCAL
echo ==============================================================================
echo.
echo  Iniciando o servidor backend e o dashboard gerencial...
echo.

cd /d "%~dp0\server"

if not exist "node_modules" (
    echo [Instalando dependencias necessarias pela primeira vez...]
    call npm install
    echo.
)

echo [Iniciando servico na porta 3001...]
echo Acesse no navegador: http://localhost:3001
echo.
call npm run dev

pause
