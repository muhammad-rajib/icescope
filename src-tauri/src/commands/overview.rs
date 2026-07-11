use crate::state::AppState;
use icescope_core::{overview, OverviewSummary};
use tauri::State;

#[tauri::command]
pub fn get_overview(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<OverviewSummary, String> {
    {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        if let Some(summary) = db
            .get_overview_cache(&connection_id)
            .map_err(|error| error.to_string())?
        {
            if summary.table_count > 0 || !summary.tables.is_empty() {
                return Ok(summary);
            }
        }
    }

    refresh_overview(state, connection_id)
}

#[tauri::command]
pub fn refresh_overview(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<OverviewSummary, String> {
    let profile = {
        let db = state.db.lock().map_err(|error| error.to_string())?;
        db.get_connection(&connection_id)
            .map_err(|error| error.to_string())?
            .ok_or_else(|| format!("Connection not found: {connection_id}"))?
    };

    let summary = overview::refresh_overview(&profile).map_err(|error| error.to_string())?;

    state
        .db
        .lock()
        .map_err(|error| error.to_string())?
        .put_overview_cache(&connection_id, &summary)
        .map_err(|error| error.to_string())?;

    Ok(summary)
}
