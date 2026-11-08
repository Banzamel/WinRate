// Text and binary files of the data folder for the web view.
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::State;

use crate::error::{Error, Result};
use crate::storage::{files, DataDir};

#[tauri::command]
pub fn read_text(dir: State<DataDir>, path: String) -> Result<Option<String>> {
    let bytes = files::read(&files::resolve(&dir.0, &path)?)?;
    Ok(bytes.map(|b| String::from_utf8_lossy(&b).into_owned()))
}

#[tauri::command]
pub fn write_text(dir: State<DataDir>, path: String, content: String) -> Result<()> {
    files::write_atomic(&files::resolve(&dir.0, &path)?, content.as_bytes())
}

// Binary files (the filter census, ~1.7 MB) travel as raw bytes, not JSON arrays.
// A missing file comes back empty.
#[tauri::command]
pub fn read_bytes(dir: State<DataDir>, path: String) -> Result<Response> {
    let bytes = files::read(&files::resolve(&dir.0, &path)?)?;
    Ok(Response::new(bytes.unwrap_or_default()))
}

#[tauri::command]
pub fn write_bytes(dir: State<DataDir>, request: Request<'_>) -> Result<()> {
    let rel = request
        .headers()
        .get("x-path")
        .and_then(|v| v.to_str().ok())
        .ok_or(Error::BadRequest("missing x-path header"))?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(Error::BadRequest("expected a raw body"));
    };
    files::write_atomic(&files::resolve(&dir.0, rel)?, bytes)
}
