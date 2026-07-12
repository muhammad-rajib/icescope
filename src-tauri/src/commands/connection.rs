use crate::state::AppState;
use icescope_core::ConnectionProfile;
use std::process::Command;
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

#[tauri::command]
pub fn select_warehouse_folder(default_path: Option<String>) -> Result<Option<String>, String> {
    open_folder_picker(default_path.as_deref())
}

#[cfg(target_os = "macos")]
fn open_folder_picker(default_path: Option<&str>) -> Result<Option<String>, String> {
    let prompt = "Select Iceberg warehouse folder";
    let script = if let Some(path) = default_path.filter(|path| !path.trim().is_empty()) {
        format!(
            "POSIX path of (choose folder with prompt \"{}\" default location POSIX file \"{}\")",
            escape_applescript(prompt),
            escape_applescript(path)
        )
    } else {
        format!(
            "POSIX path of (choose folder with prompt \"{}\")",
            escape_applescript(prompt)
        )
    };

    run_picker_command(Command::new("osascript").arg("-e").arg(script))
}

#[cfg(target_os = "windows")]
fn open_folder_picker(default_path: Option<&str>) -> Result<Option<String>, String> {
    let initial_directory = default_path.unwrap_or("").replace('\'', "''");
    let script = format!(
        r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Iceberg warehouse folder'
$dialog.ShowNewFolderButton = $false
if ('{initial_directory}' -ne '') {{ $dialog.SelectedPath = '{initial_directory}' }}
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ Write-Output $dialog.SelectedPath }}
"#
    );

    run_picker_command(
        Command::new("powershell")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-Command")
            .arg(script),
    )
}

#[cfg(target_os = "linux")]
fn open_folder_picker(default_path: Option<&str>) -> Result<Option<String>, String> {
    let mut zenity = Command::new("zenity");
    zenity
        .arg("--file-selection")
        .arg("--directory")
        .arg("--title=Select Iceberg warehouse folder");
    if let Some(path) = default_path.filter(|path| !path.trim().is_empty()) {
        zenity.arg(format!("--filename={path}/"));
    }

    match run_picker_command(&mut zenity) {
        Ok(path) => Ok(path),
        Err(_) => {
            let mut kdialog = Command::new("kdialog");
            kdialog.arg("--getexistingdirectory");
            if let Some(path) = default_path.filter(|path| !path.trim().is_empty()) {
                kdialog.arg(path);
            }
            run_picker_command(&mut kdialog)
        }
    }
}

fn run_picker_command(command: &mut Command) -> Result<Option<String>, String> {
    let output = command.output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Ok(None);
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        Ok(None)
    } else {
        Ok(Some(path))
    }
}

#[cfg(target_os = "macos")]
fn escape_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
