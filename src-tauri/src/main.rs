// WinRate — Tauri shell: wiring only. Everything else (history, statistics, simulations) runs in
// the web view and its workers.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod storage;
mod window;

use storage::DataDir;

fn main() {
    let dir = storage::data_dir::resolve();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(DataDir(dir.clone()))
        .invoke_handler(tauri::generate_handler![
            commands::data::read_text,
            commands::data::write_text,
            commands::data::read_bytes,
            commands::data::write_bytes,
            commands::history::bundled_history,
            commands::dialogs::import_file,
            commands::dialogs::export_file,
        ])
        .setup(move |app| {
            if storage::data_dir::writable(&dir) {
                window::create_main(app, &dir)?;
            } else {
                window::show_not_writable(app, &dir);
            }
            Ok(())
        })
        .run(tauri::generate_context!());
    if let Err(e) = result {
        eprintln!("WinRate failed to start: {e}");
        std::process::exit(1);
    }
}
