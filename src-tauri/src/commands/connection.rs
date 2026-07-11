use crate::state::AppState;
use icescope_core::ConnectionProfile;
use tauri::State;

#[tauri::command]
pub fn list_connections(state: State<'_, AppState>) -> Result<Vec<ConnectionProfile>, String> {
    state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .list_connections()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_connection(
    state: State<'_, AppState>,
    profile: ConnectionProfile,
) -> Result<ConnectionProfile, String> {
    state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .save_connection(&profile)
        .map_err(|error| error.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_connection(state: State<'_, AppState>, connection_id: String) -> Result<(), String> {
    state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .delete_connection(&connection_id)
        .map_err(|error| error.to_string())
}
