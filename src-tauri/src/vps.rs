//! Gọi API công khai VPS từ Rust (không CORS) — trả JSON string cho Next.js parse.
//! Đối chiếu header / URL với `docs/vps-api-curl.md` (curl bắt từ DevTools).

use reqwest::blocking::Client;
use reqwest::header::{HeaderMap, HeaderValue};
use std::time::Duration;

/// Giống curl bạn cung cấp (Chrome 147 / Windows).
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(25))
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| e.to_string())
}

fn hv(s: &str) -> Result<HeaderValue, String> {
    HeaderValue::from_str(s).map_err(|e| format!("header `{s}`: {e}"))
}

/// Header giống curl tới `bgapidatafeed` (Origin banggia.vps.com.vn).
fn headers_banggia() -> Result<HeaderMap, String> {
    let mut h = HeaderMap::new();
    h.insert("Accept", hv("application/json, text/plain, */*")?);
    h.insert(
        "Accept-Language",
        hv("en-US,en;q=0.9,vi;q=0.8")?,
    );
    h.insert("Cache-Control", hv("no-cache")?);
    h.insert("Pragma", hv("no-cache")?);
    h.insert(
        "Origin",
        HeaderValue::from_static("https://banggia.vps.com.vn"),
    );
    h.insert(
        "Referer",
        HeaderValue::from_static("https://banggia.vps.com.vn/"),
    );
    h.insert("Sec-Fetch-Dest", hv("empty")?);
    h.insert("Sec-Fetch-Mode", hv("cors")?);
    h.insert("Sec-Fetch-Site", hv("same-site")?);
    h.insert(
        "sec-ch-ua",
        hv(r#""Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147""#)?,
    );
    h.insert("sec-ch-ua-mobile", hv("?0")?);
    h.insert("sec-ch-ua-platform", hv("\"Windows\"")?);
    Ok(h)
}

/// Header giống curl tới `histdatafeed` (Origin chart.vps.com.vn).
fn headers_chart() -> Result<HeaderMap, String> {
    let mut h = HeaderMap::new();
    h.insert("Accept", hv("*/*")?);
    h.insert(
        "Accept-Language",
        hv("en-US,en;q=0.9,vi;q=0.8")?,
    );
    h.insert("Cache-Control", hv("no-cache")?);
    h.insert("Pragma", hv("no-cache")?);
    h.insert(
        "Origin",
        HeaderValue::from_static("https://chart.vps.com.vn"),
    );
    h.insert(
        "Referer",
        HeaderValue::from_static("https://chart.vps.com.vn/"),
    );
    h.insert("Sec-Fetch-Dest", hv("empty")?);
    h.insert("Sec-Fetch-Mode", hv("cors")?);
    h.insert("Sec-Fetch-Site", hv("same-site")?);
    h.insert(
        "sec-ch-ua",
        hv(r#""Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147""#)?,
    );
    h.insert("sec-ch-ua-mobile", hv("?0")?);
    h.insert("sec-ch-ua-platform", hv("\"Windows\"")?);
    Ok(h)
}

#[tauri::command]
pub fn vps_get_list_all_stock() -> Result<String, String> {
    let url = "https://bgapidatafeed.vps.com.vn/getlistallstock";
    client()?
        .get(url)
        .headers(headers_banggia()?)
        .send()
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vps_get_stock_data(symbols: String) -> Result<String, String> {
    let sym = symbols.trim().replace(' ', "");
    if sym.is_empty() {
        return Err("symbols rỗng".into());
    }
    let url = format!("https://bgapidatafeed.vps.com.vn/getliststockdata/{sym}");
    client()?
        .get(&url)
        .headers(headers_banggia()?)
        .send()
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .map_err(|e| e.to_string())
}

/// `countback`: giống curl (mặc định 330 nếu `None`).
#[tauri::command]
pub fn vps_get_tradingview_history(
    symbol: String,
    resolution: String,
    from_sec: i64,
    to_sec: i64,
    countback: Option<u32>,
) -> Result<String, String> {
    let sym = symbol.trim();
    if sym.is_empty() {
        return Err("symbol rỗng".into());
    }
    let res = resolution.trim();
    if res.is_empty() {
        return Err("resolution rỗng".into());
    }
    let cb = countback.unwrap_or(330);
    client()?
        .get("https://histdatafeed.vps.com.vn/tradingview/history")
        .headers(headers_chart()?)
        .query(&[
            ("symbol", sym),
            ("resolution", res),
            ("from", &from_sec.to_string()),
            ("to", &to_sec.to_string()),
            ("countback", &cb.to_string()),
        ])
        .send()
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?
        .text()
        .map_err(|e| e.to_string())
}
