use tauri::State;

#[derive(Default)]
pub struct DesktopState;

#[tauri::command]
pub fn desktop_ping(_state: State<'_, DesktopState>) -> Result<String, String> {
  Ok("pong".to_string())
}

