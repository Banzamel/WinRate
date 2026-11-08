; WinRate installer hooks (Tauri NSIS template).
; The app keeps all its data in "$INSTDIR\data". Tauri's uninstaller only removes the files it
; installed, so the folder survives updates; a real uninstall removes it here.
;
; Up to 0.5.x WinRate was an Electron app (electron-builder, per-user, any folder the user chose).
; Its uninstall key is derived from the appId pl.banzamel.winrate. On the first Tauri install the
; old data is carried over and the old app removed, so electron-updater can update straight into
; this installer (it runs it with /S).

!define OLD_UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\1b39727b-3969-5593-8eba-cc072b4b0548"
!define OLD_UNINSTALLER "Uninstall WinRate.exe"

!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $R0 HKCU "${OLD_UNINSTKEY}" "DisplayIcon" ; "<dir>\WinRate.exe,0"
  ${If} $R0 != ""
    StrCpy $R0 $R0 -2
    ${GetParent} $R0 $R1
    ${If} ${FileExists} "$R1\${OLD_UNINSTALLER}"
      ; Park the data first: the old uninstaller wipes its whole folder, which may be $INSTDIR.
      ; Only what the app wrote (not the Chromium profile) is kept.
      StrCpy $R2 "$TEMP\winrate-migrate"
      RMDir /r $R2
      CreateDirectory $R2
      ${If} ${FileExists} "$R1\data\settings.json"
        CopyFiles /SILENT "$R1\data\settings.json" $R2
      ${EndIf}
      ${If} ${FileExists} "$R1\data\history\*.*"
        CreateDirectory "$R2\history"
        CopyFiles /SILENT "$R1\data\history\*.*" "$R2\history"
      ${EndIf}
      ${If} ${FileExists} "$R1\data\combinations\*.*"
        CreateDirectory "$R2\combinations"
        CopyFiles /SILENT "$R1\data\combinations\*.*" "$R2\combinations"
      ${EndIf}
      ; _?= runs the uninstaller in place and waits for it (it would copy itself to %TEMP% otherwise).
      ExecWait '"$R1\${OLD_UNINSTALLER}" /currentuser /S _?=$R1'
      Delete "$R1\${OLD_UNINSTALLER}"
      RMDir "$R1"
      DeleteRegKey HKCU "${OLD_UNINSTKEY}"
      ${IfNot} ${FileExists} "$INSTDIR\data\settings.json"
        CreateDirectory "$INSTDIR\data"
        CopyFiles /SILENT "$R2\*.*" "$INSTDIR\data"
      ${EndIf}
      RMDir /r $R2
      SetOutPath $INSTDIR
    ${EndIf}
  ${EndIf}
  CreateDirectory "$INSTDIR\data"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    RMDir /r "$INSTDIR\data"
    RMDir "$INSTDIR"
  ${EndIf}
!macroend
