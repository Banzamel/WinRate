// The data folder and the only file access the web view gets: paths relative to that folder
// (no "..", no absolute paths), the bundled history, and files the user picks in a dialog.
use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

pub struct DataDir(pub PathBuf);

// <install folder>/data in the installed app; WINRATE_USERDATA=<dir> overrides it (development).
pub fn resolve_dir() -> PathBuf {
    if let Some(dir) = std::env::var_os("WINRATE_USERDATA") {
        return PathBuf::from(dir);
    }
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.join("data")))
        .unwrap_or_else(|| PathBuf::from("data"))
}

pub fn writable(dir: &Path) -> bool {
    let probe = dir.join(".write-test");
    fs::create_dir_all(dir).is_ok() && fs::write(&probe, b"").is_ok() && fs::remove_file(&probe).is_ok()
}

fn resolve(dir: &Path, rel: &str) -> Result<PathBuf, String> {
    let path = Path::new(rel);
    if rel.is_empty() || path.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err(format!("invalid path: {rel}"));
    }
    Ok(dir.join(path))
}

// Written to a temporary file first, so a crash never leaves half a settings or history file.
fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_text(dir: State<DataDir>, path: String) -> Result<Option<String>, String> {
    match fs::read_to_string(resolve(&dir.0, &path)?) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn write_text(dir: State<DataDir>, path: String, content: String) -> Result<(), String> {
    write_atomic(&resolve(&dir.0, &path)?, content.as_bytes())
}

// Binary files (the filter exclusion maps, ~1.7 MB) travel as raw bytes, not JSON arrays.
// A missing file comes back empty.
#[tauri::command]
pub fn read_bytes(dir: State<DataDir>, path: String) -> Result<Response, String> {
    match fs::read(resolve(&dir.0, &path)?) {
        Ok(bytes) => Ok(Response::new(bytes)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(Response::new(Vec::<u8>::new())),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn write_bytes(dir: State<DataDir>, request: Request<'_>) -> Result<(), String> {
    let rel = request
        .headers()
        .get("x-path")
        .and_then(|v| v.to_str().ok())
        .ok_or("missing x-path header")?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected a raw body".into());
    };
    write_atomic(&resolve(&dir.0, rel)?, bytes)
}

// History shipped with the installer (resources/history/<game>.txt, fetched at build time).
#[tauri::command]
pub fn bundled_history(app: AppHandle, game: String) -> Option<String> {
    if !game.chars().all(|c| c.is_ascii_alphanumeric()) {
        return None;
    }
    let path = app.path().resolve(format!("history/{game}.txt"), BaseDirectory::Resource).ok()?;
    fs::read_to_string(path).ok()
}

#[derive(serde::Serialize)]
pub struct Picked {
    file: String,
    text: String,
}

// Async commands run off the main thread, so the blocking dialogs are fine here.
#[tauri::command]
pub async fn import_file(window: WebviewWindow) -> Result<Option<Picked>, String> {
    let picked = window
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter("Text / CSV", &["txt", "csv", "tsv"])
        .add_filter("*", &["*"])
        .blocking_pick_file();
    let Some(picked) = picked else { return Ok(None) };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(Some(Picked { file: path.display().to_string(), text: String::from_utf8_lossy(&bytes).into_owned() }))
}

#[tauri::command]
pub async fn export_file(window: WebviewWindow, name: String, content: String) -> Result<Option<String>, String> {
    let picked = window
        .dialog()
        .file()
        .set_parent(&window)
        .set_file_name(&name)
        .add_filter("CSV", &["csv"])
        .blocking_save_file();
    let Some(picked) = picked else { return Ok(None) };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}
