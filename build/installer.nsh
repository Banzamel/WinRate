; PrimeWinRate installer additions.
; The app keeps all its data in "$INSTDIR\data". An update (the uninstaller runs with --updated)
; must keep that folder; a real uninstall removes everything the app ever wrote.

!macro customInstall
  CreateDirectory "$INSTDIR\data"
!macroend

!macro customRemoveFiles
  ${if} ${isUpdated}
    ; Park the data next to the install folder (same drive), wipe the old version, put it back.
    RMDir /r "$INSTDIR.data-update"
    Rename "$INSTDIR\data" "$INSTDIR.data-update"
    RMDir /r $INSTDIR
    CreateDirectory $INSTDIR
    Rename "$INSTDIR.data-update" "$INSTDIR\data"
  ${else}
    RMDir /r $INSTDIR
  ${endif}
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; Downloaded updates (electron-updater cache) and any leftovers of older versions.
    RMDir /r "$LOCALAPPDATA\primewinrate-updater"
    RMDir /r "$APPDATA\PrimeWinRate"
    RMDir /r "$APPDATA\primewinrate"
  ${endif}
!macroend
