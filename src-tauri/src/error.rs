// The one error type of the commands: serialized as its message, which the web view shows.
use std::fmt;

#[derive(Debug)]
pub enum Error {
    Io(std::io::Error),
    InvalidPath(String),
    BadRequest(&'static str),
    Dialog(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Io(e) => write!(f, "{e}"),
            Error::InvalidPath(p) => write!(f, "invalid path: {p}"),
            Error::BadRequest(what) => write!(f, "bad request: {what}"),
            Error::Dialog(e) => write!(f, "dialog: {e}"),
        }
    }
}

impl std::error::Error for Error {}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Error::Io(e)
    }
}

impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
