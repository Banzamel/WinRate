// The main window, and the message shown instead when the data folder cannot be written.
use std::path::Path;

use tauri::{App, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

const NOT_WRITABLE: &str = "The app keeps its data in its own folder, but it cannot write to:\n{dir}\n\nReinstall it into a folder you can write to (the default one is), or run it as administrator.\n\nAplikacja przechowuje dane we własnym folderze, ale nie może zapisywać w:\n{dir}\n\nZainstaluj ją ponownie w folderze z prawem zapisu (domyślny je ma) lub uruchom jako administrator.";

// Frameless (the UI draws its own title bar) and hidden until the UI has rendered its first frame.
// The web view profile (WebView2 caches) lives in the data folder too.
pub fn create_main(app: &App, data_dir: &Path) -> tauri::Result<()> {
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("WinRate")
        .inner_size(1360.0, 880.0)
        .min_inner_size(1100.0, 700.0)
        .decorations(false)
        .shadow(native_frame())
        .visible(false)
        .background_color(tauri::window::Color(0xee, 0xf2, 0xf8, 0xff))
        .data_directory(data_dir.join("webview"))
        .build()?;
    Ok(())
}

// Windows 11 gives the frameless window its border, shadow and rounded corners through Tauri's
// window shadow. On Windows 10 that frame has no top edge, so it stays off and the page draws a
// 1px border on all four sides instead (src/shared/ui/titlebar).
#[cfg(windows)]
fn native_frame() -> bool {
    windows_version::OsVersion::current().build >= 22000
}

#[cfg(not(windows))]
fn native_frame() -> bool {
    false
}

// All data stays in one folder: if it cannot be written, say so and quit instead of scattering
// files elsewhere.
pub fn show_not_writable(app: &App, data_dir: &Path) {
    app.dialog()
        .message(NOT_WRITABLE.replace("{dir}", &data_dir.display().to_string()))
        .title("WinRate")
        .kind(MessageDialogKind::Error)
        .show(|_| std::process::exit(1));
}
