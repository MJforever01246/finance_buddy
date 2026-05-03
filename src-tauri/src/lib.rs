#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![app_ping])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

/// IPC demo: UI gọi `invoke('app_ping')` — sau thay bằng đọc file, notification, v.v.
#[tauri::command]
fn app_ping() -> String {
  format!(
    "pong · {} / {}",
    std::env::consts::OS,
    std::env::consts::ARCH
  )
}
