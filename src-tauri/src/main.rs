// WinRate — Tauri shell: one frameless window, the data folder and a few file commands.
// Everything else (history, statistics, simulations) runs in the web view and its workers.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod data;

use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

const NOT_WRITABLE: &str = "The app keeps its data in its own folder, but it cannot write to:\n{dir}\n\nReinstall it into a folder you can write to (the default one is), or run it as administrator.\n\nAplikacja przechowuje dane we własnym folderze, ale nie może zapisywać w:\n{dir}\n\nZainstaluj ją ponownie w folderze z prawem zapisu (domyślny je ma) lub uruchom jako administrator.";

fn main() {
    let dir = data::resolve_dir();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(data::DataDir(dir.clone()))
        .invoke_handler(tauri::generate_handler![
            data::read_text,
            data::write_text,
            data::read_bytes,
            data::write_bytes,
            data::bundled_history,
            data::import_file,
            data::export_file,
        ])
        .setup(move |app| {
            // All data stays in one folder (the uninstaller removes it): if it cannot be written,
            // say so and quit instead of scattering files elsewhere.
            if !data::writable(&dir) {
                let text = NOT_WRITABLE.replace("{dir}", &dir.display().to_string());
                app.dialog()
                    .message(text)
                    .title("WinRate")
                    .kind(MessageDialogKind::Error)
                    .show(|_| std::process::exit(1));
                return Ok(());
            }
            // The web view profile (WebView2 caches) lives in the data folder too.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("WinRate")
                .inner_size(1360.0, 880.0)
                .min_inner_size(1100.0, 700.0)
                .decorations(false)
                .visible(false)
                .background_color(tauri::window::Color(0xee, 0xf2, 0xf8, 0xff))
                .data_directory(dir.join("webview"))
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running WinRate");
}
