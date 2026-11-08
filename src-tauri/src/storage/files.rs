// Files inside the data folder: only relative paths without "..", written atomically.
use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

use crate::error::{Error, Result};

pub fn resolve(dir: &Path, rel: &str) -> Result<PathBuf> {
    let path = Path::new(rel);
    if rel.is_empty() || path.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err(Error::InvalidPath(rel.to_string()));
    }
    Ok(dir.join(path))
}

// A missing file is None, not an error.
pub fn read(path: &Path) -> Result<Option<Vec<u8>>> {
    match fs::read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

// Written to a temporary file first, so a crash never leaves half a settings or history file.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_relative_paths_inside_the_folder() {
        let dir = Path::new("data");
        assert!(resolve(dir, "history/lotto.json").is_ok());
        assert!(resolve(dir, "../secret").is_err());
        assert!(resolve(dir, "").is_err());
        assert!(resolve(dir, "/etc/passwd").is_err());
    }

    #[test]
    fn atomic_write_and_missing_read() {
        let dir = std::env::temp_dir().join("winrate-files-test");
        let file = dir.join("sub").join("a.txt");
        write_atomic(&file, b"hello").unwrap();
        assert_eq!(read(&file).unwrap(), Some(b"hello".to_vec()));
        assert_eq!(read(&dir.join("missing")).unwrap(), None);
        let _ = fs::remove_dir_all(dir);
    }
}
