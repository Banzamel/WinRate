// History shipped with the installer (resources/history/<game>.txt, fetched at build time).
use std::fs;

use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn bundled_history(app: AppHandle, game: String) -> Option<String> {
    if game.is_empty() || !game.chars().all(|c| c.is_ascii_alphanumeric()) {
        return None;
    }
    let path = app.path().resolve(format!("history/{game}.txt"), BaseDirectory::Resource).ok()?;
    fs::read_to_string(path).ok()
}
