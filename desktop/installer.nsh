!macro customUnInstall
  ; Remove a pasta de instalacao inteira incluindo arquivos gerados apos instalacao
  RMDir /r /REBOOTOK "$INSTDIR"
  ; Remove a pasta de dados do aplicativo em %APPDATA%
  RMDir /r /REBOOTOK "$APPDATA\amura-dashboard"
  RMDir /r /REBOOTOK "$LOCALAPPDATA\amura-dashboard"
  RMDir /r /REBOOTOK "$LOCALAPPDATA\amura-dashboard-updater"
  RMDir /r /REBOOTOK "$LOCALAPPDATA\Programs\Amura Dashboard"
!macroend
