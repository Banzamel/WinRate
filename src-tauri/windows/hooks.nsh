; WinRate installer hooks (Tauri NSIS template, tauri-cli 2.12).
;
; Nothing goes under the user profile: the app and everything it writes live in one folder,
;   - an update from the Electron versions (<= 0.5.x): the folder the old app was installed in;
;   - a fresh install: <system drive>\Banzamel\WinRate (creatable without admin rights);
;   - later Tauri updates: the folder of the current install (the template restores it from
;     HKCU\Software\<manufacturer>\WinRate before these hooks run, so it is never the default).
; Data lives in <install>\data. Tauri's uninstaller removes only what it installed, so data
; survives updates; a real uninstall removes it only when "Delete the application data" is ticked.
;
; This file is included before the template defines PRODUCTNAME, so names are spelled out.

!include LogicLib.nsh
!include FileFunc.nsh

!define OLD_UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\1b39727b-3969-5593-8eba-cc072b4b0548"
!define OLD_SETTINGSKEY "Software\1b39727b-3969-5593-8eba-cc072b4b0548"
!define OLD_UNINSTALLER "Uninstall WinRate.exe"
!define OLD_MARKER "resources\app.asar" ; only an Electron install has it
!define TEMPLATE_DEFAULT "$LOCALAPPDATA\WinRate"

Var OldDir
Var Parked

; $OldDir: the folder of the old Electron install, empty when there is none. A key whose folder is
; gone (removed by hand) is dropped, so it does not linger in "Installed apps".
!macro WINRATE_FIND_OLD
  StrCpy $OldDir ""
  ReadRegStr $0 HKCU "${OLD_UNINSTKEY}" "DisplayIcon" ; "<dir>\WinRate.exe,0"
  ${If} $0 != ""
    StrCpy $0 $0 -2
    ${GetParent} $0 $1
    ${If} ${FileExists} "$1\${OLD_UNINSTALLER}"
      StrCpy $OldDir $1
    ${Else}
      DeleteRegKey HKCU "${OLD_UNINSTKEY}"
    ${EndIf}
  ${EndIf}
!macroend

; The template suggests %LOCALAPPDATA%\WinRate when there is no earlier Tauri install: use the old
; app's folder or <system drive>\Banzamel\WinRate instead, in the wizard and in silent installs.
!macro WINRATE_PICK_DIR
  ${If} $INSTDIR == "${TEMPLATE_DEFAULT}"
    !insertmacro WINRATE_FIND_OLD
    ${If} $OldDir != ""
      StrCpy $INSTDIR $OldDir
    ${Else}
      StrCpy $0 $WINDIR 3
      StrCpy $INSTDIR "$0Banzamel\WinRate"
    ${EndIf}
  ${EndIf}
!macroend

!define MUI_CUSTOMFUNCTION_GUIINIT WinRateGuiInit
Function WinRateGuiInit
  !insertmacro WINRATE_PICK_DIR
FunctionEnd

; What the old app wrote (not its Chromium profile) is parked in %TEMP%, the old app is removed,
; and only when its files are really gone is the data put into the new install.
!macro WINRATE_PARK_DATA
  StrCpy $Parked "$TEMP\winrate-migrate"
  RMDir /r $Parked
  CreateDirectory "$Parked\history"
  CreateDirectory "$Parked\combinations"
  CreateDirectory "$Parked\cache"
  CopyFiles /SILENT "$OldDir\data\settings.json" $Parked
  CopyFiles /SILENT "$OldDir\data\history\*.*" "$Parked\history"
  CopyFiles /SILENT "$OldDir\data\combinations\*.*" "$Parked\combinations"
  CopyFiles /SILENT "$OldDir\data\cache\*.*" "$Parked\cache"
!macroend

; The Electron uninstaller takes its folder from HKCU\Software\<guid>\InstallLocation, not from
; _?=; when that value is missing it falls back to %LOCALAPPDATA%\Programs\WinRate and removes
; nothing here. So the value is set first. A copy run with _?= works in place and is waited for.
!macro WINRATE_RUN_OLD_UNINSTALLER
  WriteRegStr HKCU "${OLD_SETTINGSKEY}" "InstallLocation" $OldDir
  InitPluginsDir
  CopyFiles /SILENT "$OldDir\${OLD_UNINSTALLER}" "$PLUGINSDIR\old-uninstall.exe"
  ExecWait '"$PLUGINSDIR\old-uninstall.exe" /currentuser /S _?=$OldDir'
  ; Fallback when its files are still there: remove the old app folder ourselves (data is parked).
  StrLen $0 $OldDir
  ${If} ${FileExists} "$OldDir\${OLD_MARKER}"
  ${AndIf} $0 > 3
    RMDir /r $OldDir
  ${EndIf}
!macroend

!macro WINRATE_MIGRATE
  SetOutPath $TEMP ; do not hold the old folder open
  !insertmacro WINRATE_PARK_DATA
  !insertmacro WINRATE_RUN_OLD_UNINSTALLER
  ${If} ${FileExists} "$OldDir\${OLD_MARKER}"
    ; Still there (a file in use): leave the old app as it was and stop.
    ${IfNot} ${FileExists} "$OldDir\data\settings.json"
      CreateDirectory "$OldDir\data"
      CopyFiles /SILENT "$Parked\*.*" "$OldDir\data"
    ${EndIf}
    MessageBox MB_ICONSTOP "WinRate: close the running WinRate and try again." /SD IDOK
    Abort "The previous WinRate could not be removed."
  ${EndIf}
  DeleteRegKey HKCU "${OLD_UNINSTKEY}"
  DeleteRegKey HKCU "${OLD_SETTINGSKEY}"
  ${IfNot} ${FileExists} "$INSTDIR\data\settings.json"
    CreateDirectory "$INSTDIR\data"
    CopyFiles /SILENT "$Parked\*.*" "$INSTDIR\data"
  ${EndIf}
  RMDir /r $Parked
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro WINRATE_PICK_DIR
  ; The template's SetOutPath already created its default folder in silent installs: drop it
  ; again (only when empty, i.e. never a folder the user installed into).
  ${If} $INSTDIR != "${TEMPLATE_DEFAULT}"
    SetOutPath $TEMP
    RMDir "${TEMPLATE_DEFAULT}"
  ${EndIf}
  !insertmacro WINRATE_FIND_OLD
  ${If} $OldDir != ""
    !insertmacro WINRATE_MIGRATE
  ${EndIf}
  CreateDirectory "$INSTDIR\data"
  SetOutPath $INSTDIR
!macroend

; electron-updater asks the installer to start the app when it is done.
!macro NSIS_HOOK_POSTINSTALL
  ${GetOptions} $CMDLINE "--force-run" $0
  ${IfNot} ${Errors}
    Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'
  ${EndIf}
!macroend

; Data only when the user ticked "Delete the application data"; never during updates.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    ${If} $DeleteAppDataCheckboxState = 1
      RMDir /r "$INSTDIR\data"
    ${EndIf}
    RMDir "$INSTDIR"
  ${EndIf}
!macroend
