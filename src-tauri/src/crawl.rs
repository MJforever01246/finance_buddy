//! Crawl dữ liệu lịch sử giá từ VPS → lưu SQLite.
//! Parse curl string để trích symbol/resolution/from/to, rồi fetch + insert.

use crate::db::DbState;
use crate::vps;
use rusqlite::params;
use serde::{Deserialize, Serialize};

// ─── Parse curl ──────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParsedCurl {
    pub url: String,
    pub symbol: String,
    pub resolution: String,
    pub from_sec: i64,
    pub to_sec: i64,
    pub countback: Option<u32>,
}

/// Parse a curl command string and extract tradingview history params.
#[tauri::command]
pub fn crawl_parse_curl(curl_text: String) -> Result<ParsedCurl, String> {
    let text = curl_text.replace('\n', " ").replace('\r', " ");

    // Extract URL (between quotes after 'curl')
    let url = extract_url(&text)?;

    // Parse query params from URL
    let symbol = extract_param(&url, "symbol")
        .ok_or_else(|| "Không tìm thấy param 'symbol' trong URL".to_string())?;
    let resolution = extract_param(&url, "resolution").unwrap_or_else(|| "D".to_string());
    let from_str = extract_param(&url, "from")
        .ok_or_else(|| "Không tìm thấy param 'from' trong URL".to_string())?;
    let to_str = extract_param(&url, "to")
        .ok_or_else(|| "Không tìm thấy param 'to' trong URL".to_string())?;
    let countback = extract_param(&url, "countback")
        .and_then(|s| s.parse::<u32>().ok());

    let from_sec: i64 = from_str.parse().map_err(|_| "from không phải số".to_string())?;
    let to_sec: i64 = to_str.parse().map_err(|_| "to không phải số".to_string())?;

    Ok(ParsedCurl {
        url,
        symbol,
        resolution,
        from_sec,
        to_sec,
        countback,
    })
}

fn extract_url(text: &str) -> Result<String, String> {
    // Try single quotes first, then double quotes, then bare URL
    if let Some(start) = text.find('\'') {
        if let Some(end) = text[start + 1..].find('\'') {
            return Ok(text[start + 1..start + 1 + end].to_string());
        }
    }
    if let Some(start) = text.find('"') {
        if let Some(end) = text[start + 1..].find('"') {
            return Ok(text[start + 1..start + 1 + end].to_string());
        }
    }
    // Try to find URL pattern
    for word in text.split_whitespace() {
        if word.starts_with("http") {
            return Ok(word.trim_matches(&['\'', '"'][..]).to_string());
        }
    }
    Err("Không tìm thấy URL trong curl command".to_string())
}

fn extract_param(url: &str, key: &str) -> Option<String> {
    let query = url.split('?').nth(1)?;
    for pair in query.split('&') {
        let mut parts = pair.splitn(2, '=');
        if parts.next()? == key {
            return parts.next().map(|s| s.to_string());
        }
    }
    None
}

// ─── Fetch + Save single symbol ──────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlResult {
    pub symbol: String,
    pub resolution: String,
    pub bars_fetched: usize,
    pub bars_inserted: usize,
    pub error: Option<String>,
}

#[derive(Deserialize)]
struct TvHistoryResponse {
    #[serde(default)]
    s: String,
    #[serde(default)]
    t: Vec<i64>,
    #[serde(default)]
    o: Vec<f64>,
    #[serde(default)]
    h: Vec<f64>,
    #[serde(default)]
    l: Vec<f64>,
    #[serde(default)]
    c: Vec<f64>,
    #[serde(default)]
    v: Vec<f64>,
}

/// Crawl one symbol: fetch from VPS, save to SQLite.
#[tauri::command]
pub fn crawl_fetch_and_save(
    state: tauri::State<'_, DbState>,
    symbol: String,
    resolution: String,
    from_sec: i64,
    to_sec: i64,
    countback: Option<u32>,
) -> Result<CrawlResult, String> {
    let sym = symbol.trim().to_uppercase();
    let res = resolution.trim().to_string();

    // Fetch from VPS
    let json_str = vps::vps_get_tradingview_history(
        sym.clone(),
        res.clone(),
        from_sec,
        to_sec,
        countback,
    )?;

    let data: TvHistoryResponse =
        serde_json::from_str(&json_str).map_err(|e| format!("parse json: {e}"))?;

    if data.s == "no_data" || data.t.is_empty() {
        return Ok(CrawlResult {
            symbol: sym,
            resolution: res,
            bars_fetched: 0,
            bars_inserted: 0,
            error: None,
        });
    }

    let bars_fetched = data.t.len();

    // Save to SQLite
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    let mut inserted = 0usize;

    let mut stmt = conn
        .prepare(
            "INSERT OR IGNORE INTO stock_history (symbol, resolution, ts, open, high, low, close, volume)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    for i in 0..data.t.len() {
        let v = if i < data.v.len() { data.v[i] } else { 0.0 };
        let rows = stmt
            .execute(params![
                sym,
                res,
                data.t[i],
                data.o[i],
                data.h[i],
                data.l[i],
                data.c[i],
                v,
            ])
            .map_err(|e| format!("insert: {e}"))?;
        if rows > 0 {
            inserted += 1;
        }
    }

    Ok(CrawlResult {
        symbol: sym,
        resolution: res,
        bars_fetched,
        bars_inserted: inserted,
        error: None,
    })
}

/// Get all stock symbols from DB (for batch crawl).
#[tauri::command]
pub fn crawl_get_all_symbols(state: tauri::State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT symbol FROM stocks WHERE stock_type = 'ST' ORDER BY symbol")
        .map_err(|e| format!("prepare: {e}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("query: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("collect: {e}"))
}

/// Get crawl stats: how many bars per symbol exist.
#[tauri::command]
pub fn crawl_get_stats(
    state: tauri::State<'_, DbState>,
    resolution: Option<String>,
) -> Result<Vec<(String, i64)>, String> {
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    let res = resolution.unwrap_or_else(|| "D".to_string());
    let mut stmt = conn
        .prepare(
            "SELECT symbol, COUNT(*) as cnt FROM stock_history WHERE resolution = ?1 GROUP BY symbol ORDER BY symbol",
        )
        .map_err(|e| format!("prepare: {e}"))?;
    let rows = stmt
        .query_map(params![res], |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)))
        .map_err(|e| format!("query: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("collect: {e}"))
}
