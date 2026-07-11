use icescope_core::db::AppDb;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<AppDb>,
}

impl AppState {
    pub fn new(db: AppDb) -> Self {
        Self { db: Mutex::new(db) }
    }
}
