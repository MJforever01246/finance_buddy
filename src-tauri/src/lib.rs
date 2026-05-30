mod crawl;
mod db;
mod finrag;
mod vps;

use std::sync::Mutex;
use tauri::Manager;

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

      // Initialize SQLite database
      let conn = db::init_db(app.handle())
        .expect("failed to initialize SQLite database");
      app.manage(db::DbState(Mutex::new(conn)));

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      app_ping,
      vps::vps_get_list_all_stock,
      vps::vps_get_stock_data,
      vps::vps_get_tradingview_history,
      db::db_get_tradingview_history,
      db::db_get_market_indices,
      db::db_get_stocks,
      db::db_get_stock_by_symbol,
      db::db_count_stocks,
      crawl::crawl_parse_curl,
      crawl::crawl_fetch_and_save,
      crawl::crawl_get_all_symbols,
      crawl::crawl_get_stats,
      finrag::finrag_health,
      finrag::finrag_list_documents,
      finrag::finrag_upload_document,
      finrag::finrag_list_sessions,
      finrag::finrag_create_session,
      finrag::finrag_list_messages,
      finrag::finrag_send_message,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn app_ping() -> String {
  format!(
    "pong · {} / {}",
    std::env::consts::OS,
    std::env::consts::ARCH
  )
}
