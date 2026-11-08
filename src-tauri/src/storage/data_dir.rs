// The data folder: <install folder>/data in the installed app (the uninstaller removes it);
// WINRATE_USERDATA=<dir> overrides it in development.
use std::fs;
use std::path::{Path, PathBuf};

pub struct DataDir(pub PathBuf);

pub fn resolve() -> PathBuf {
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
