mod commands;
mod state;

use commands::{
    connection::{delete_connection, list_connections, save_connection},
    explorer::{get_table_metadata, get_table_preview, list_namespaces, list_tables},
    overview::{get_overview, refresh_overview},
    query::run_query,
    settings::{
        check_for_updates, clear_cache, clear_logs, get_app_info, load_settings, open_logs_folder,
        save_settings,
    },
};
use icescope_core::db::AppDb;
use state::AppState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let db_path = app_data_dir.join("icescope.db");
            let db = AppDb::open(&db_path)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(AppState::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_connections,
            save_connection,
            delete_connection,
            list_namespaces,
            list_tables,
            get_table_metadata,
            get_table_preview,
            run_query,
            get_overview,
            refresh_overview,
            load_settings,
            save_settings,
            clear_cache,
            open_logs_folder,
            clear_logs,
            get_app_info,
            check_for_updates
        ])
        .run(tauri::generate_context!())
        .expect("failed to run IceScope");
}
