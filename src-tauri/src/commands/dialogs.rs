// Import and export through native file dialogs: the web view never gets arbitrary paths.
// Async commands run off the main thread, so the blocking dialogs are fine here.
use std::fs;

use tauri::WebviewWindow;
use tauri_plugin_dialog::DialogExt;

use crate::error::{Error, Result};

#[derive(serde::Serialize)]
pub struct Picked {
    file: String,
    text: String,
}

#[tauri::command]
pub async fn import_file(window: WebviewWindow) -> Result<Option<Picked>> {
    let picked = window
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter("Text / CSV", &["txt", "csv", "tsv"])
        .add_filter("*", &["*"])
        .blocking_pick_file();
    let Some(picked) = picked else { return Ok(None) };
    let path = picked.into_path().map_err(|e| Error::Dialog(e.to_string()))?;
    let bytes = fs::read(&path)?;
    Ok(Some(Picked { file: path.display().to_string(), text: String::from_utf8_lossy(&bytes).into_owned() }))
}

#[tauri::command]
pub async fn export_file(window: WebviewWindow, name: String, content: String) -> Result<Option<String>> {
    let picked = window
        .dialog()
        .file()
        .set_parent(&window)
        .set_file_name(&name)
        .add_filter("CSV", &["csv"])
        .blocking_save_file();
    let Some(picked) = picked else { return Ok(None) };
    let path = picked.into_path().map_err(|e| Error::Dialog(e.to_string()))?;
    fs::write(&path, content)?;
    Ok(Some(path.display().to_string()))
}
