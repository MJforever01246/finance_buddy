//! SQLite database — embedded, zero-install.
//! DB file lives in Tauri's app_data_dir (e.g. %APPDATA%/com.financebuddy.demo/data.db).

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Shared DB state managed by Tauri.
pub struct DbState(pub Mutex<Connection>);

// ─── Seed structs ────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedMarketIndex {
    exchange_code: String,
    index_code: String,
    index_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SeedStock {
    symbol: String,
    stock_name: String,
    en_stock_name: Option<String>,
    org_short_name: Option<String>,
    en_org_short_name: Option<String>,
    exchange_code: String,
    other_name: Option<String>,
    market_code: String,
    stock_type: String,
}

// ─── Public init ─────────────────────────────────────────────────────────────

/// Open (or create) the SQLite DB and run migrations + seed.
pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("mkdir: {e}"))?;

    let db_path: PathBuf = data_dir.join("data.db");
    let conn = Connection::open(&db_path).map_err(|e| format!("open db: {e}"))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("pragma: {e}"))?;

    migrate(&conn)?;
    crate::finrag::migrate_finrag(&conn)?;
    seed_if_empty(&conn)?;
    crate::finrag::seed_demo_if_empty(&conn)?;

    log::info!("SQLite ready at {}", db_path.display());
    Ok(conn)
}

// ─── Schema / migration ──────────────────────────────────────────────────────

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS market_indices (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            exchange_code TEXT NOT NULL,
            index_code    TEXT NOT NULL UNIQUE,
            index_name    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stocks (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol           TEXT NOT NULL UNIQUE,
            stock_name       TEXT NOT NULL,
            en_stock_name    TEXT NOT NULL DEFAULT '',
            org_short_name   TEXT NOT NULL DEFAULT '',
            en_org_short_name TEXT NOT NULL DEFAULT '',
            exchange_code    TEXT NOT NULL,
            other_name       TEXT,
            market_code      TEXT NOT NULL,
            stock_type       TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange_code);
        CREATE INDEX IF NOT EXISTS idx_stocks_market   ON stocks(market_code);
        CREATE INDEX IF NOT EXISTS idx_stocks_type     ON stocks(stock_type);

        CREATE TABLE IF NOT EXISTS stock_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol     TEXT NOT NULL,
            resolution TEXT NOT NULL,
            ts         INTEGER NOT NULL,
            open       REAL NOT NULL,
            high       REAL NOT NULL,
            low        REAL NOT NULL,
            close      REAL NOT NULL,
            volume     REAL NOT NULL DEFAULT 0,
            UNIQUE(symbol, resolution, ts)
        );

        CREATE INDEX IF NOT EXISTS idx_history_sym_res ON stock_history(symbol, resolution);
        CREATE INDEX IF NOT EXISTS idx_history_ts      ON stock_history(ts);
        ",
    )
    .map_err(|e| format!("migrate: {e}"))
}

// ─── Seed ────────────────────────────────────────────────────────────────────

const SEED_MARKET: &str = include_str!("../seed/market_indices.json");
const SEED_STOCKS: &str = include_str!("../seed/stocks.json");

fn seed_if_empty(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM stocks", [], |r| r.get(0))
        .map_err(|e| format!("count stocks: {e}"))?;

    if count > 0 {
        return Ok(());
    }

    log::info!("Seeding database…");

    // Market indices
    let indices: Vec<SeedMarketIndex> =
        serde_json::from_str(SEED_MARKET).map_err(|e| format!("parse market json: {e}"))?;

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("tx: {e}"))?;
    {
        let mut stmt = tx
            .prepare("INSERT OR IGNORE INTO market_indices (exchange_code, index_code, index_name) VALUES (?1,?2,?3)")
            .map_err(|e| format!("prepare: {e}"))?;
        for idx in &indices {
            stmt.execute(params![idx.exchange_code, idx.index_code, idx.index_name])
                .map_err(|e| format!("insert index: {e}"))?;
        }
    }

    // Stocks
    let stocks: Vec<SeedStock> =
        serde_json::from_str(SEED_STOCKS).map_err(|e| format!("parse stocks json: {e}"))?;
    {
        let mut stmt = tx
            .prepare(
                "INSERT OR IGNORE INTO stocks
                 (symbol, stock_name, en_stock_name, org_short_name, en_org_short_name, exchange_code, other_name, market_code, stock_type)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            )
            .map_err(|e| format!("prepare stocks: {e}"))?;
        for s in &stocks {
            stmt.execute(params![
                s.symbol,
                s.stock_name,
                s.en_stock_name.as_deref().unwrap_or(""),
                s.org_short_name.as_deref().unwrap_or(""),
                s.en_org_short_name.as_deref().unwrap_or(""),
                s.exchange_code,
                s.other_name,
                s.market_code,
                s.stock_type,
            ])
            .map_err(|e| format!("insert stock: {e}"))?;
        }
    }

    tx.commit().map_err(|e| format!("commit: {e}"))?;
    log::info!("Seeded {} indices, {} stocks", indices.len(), stocks.len());
    Ok(())
}

// ─── Tauri commands (query) ──────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketIndex {
    pub id: i64,
    pub exchange_code: String,
    pub index_code: String,
    pub index_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stock {
    pub id: i64,
    pub symbol: String,
    pub stock_name: String,
    pub en_stock_name: String,
    pub org_short_name: String,
    pub en_org_short_name: String,
    pub exchange_code: String,
    pub other_name: Option<String>,
    pub market_code: String,
    pub stock_type: String,
}

#[tauri::command]
pub fn db_get_market_indices(state: tauri::State<'_, DbState>) -> Result<Vec<MarketIndex>, String> {
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, exchange_code, index_code, index_name FROM market_indices ORDER BY id")
        .map_err(|e| format!("prepare: {e}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(MarketIndex {
                id: row.get(0)?,
                exchange_code: row.get(1)?,
                index_code: row.get(2)?,
                index_name: row.get(3)?,
            })
        })
        .map_err(|e| format!("query: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("collect: {e}"))
}

#[tauri::command]
pub fn db_get_stocks(
    state: tauri::State<'_, DbState>,
    exchange: Option<String>,
    stock_type: Option<String>,
    search: Option<String>,
) -> Result<Vec<Stock>, String> {
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;

    let mut sql = String::from(
        "SELECT id, symbol, stock_name, en_stock_name, org_short_name, en_org_short_name, exchange_code, other_name, market_code, stock_type FROM stocks WHERE 1=1",
    );
    let mut bindings: Vec<String> = Vec::new();

    if let Some(ref ex) = exchange {
        bindings.push(ex.clone());
        sql.push_str(&format!(" AND exchange_code = ?{}", bindings.len()));
    }
    if let Some(ref st) = stock_type {
        bindings.push(st.clone());
        sql.push_str(&format!(" AND stock_type = ?{}", bindings.len()));
    }
    if let Some(ref q) = search {
        let like = format!("%{}%", q);
        bindings.push(like);
        sql.push_str(&format!(
            " AND (symbol LIKE ?{n} OR stock_name LIKE ?{n} OR org_short_name LIKE ?{n})",
            n = bindings.len()
        ));
    }
    sql.push_str(" ORDER BY symbol LIMIT 500");

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("prepare: {e}"))?;
    let params: Vec<&dyn rusqlite::ToSql> = bindings.iter().map(|b| b as &dyn rusqlite::ToSql).collect();
    let rows = stmt
        .query_map(params.as_slice(), |row| {
            Ok(Stock {
                id: row.get(0)?,
                symbol: row.get(1)?,
                stock_name: row.get(2)?,
                en_stock_name: row.get(3)?,
                org_short_name: row.get(4)?,
                en_org_short_name: row.get(5)?,
                exchange_code: row.get(6)?,
                other_name: row.get(7)?,
                market_code: row.get(8)?,
                stock_type: row.get(9)?,
            })
        })
        .map_err(|e| format!("query: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("collect: {e}"))
}

#[tauri::command]
pub fn db_get_stock_by_symbol(
    state: tauri::State<'_, DbState>,
    symbol: String,
) -> Result<Option<Stock>, String> {
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    let mut stmt = conn
        .prepare("SELECT id, symbol, stock_name, en_stock_name, org_short_name, en_org_short_name, exchange_code, other_name, market_code, stock_type FROM stocks WHERE symbol = ?1")
        .map_err(|e| format!("prepare: {e}"))?;
    let result = stmt
        .query_row(params![symbol.to_uppercase()], |row| {
            Ok(Stock {
                id: row.get(0)?,
                symbol: row.get(1)?,
                stock_name: row.get(2)?,
                en_stock_name: row.get(3)?,
                org_short_name: row.get(4)?,
                en_org_short_name: row.get(5)?,
                exchange_code: row.get(6)?,
                other_name: row.get(7)?,
                market_code: row.get(8)?,
                stock_type: row.get(9)?,
            })
        });
    match result {
        Ok(stock) => Ok(Some(stock)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("query: {e}")),
    }
}

#[tauri::command]
pub fn db_count_stocks(state: tauri::State<'_, DbState>) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    conn.query_row("SELECT COUNT(*) FROM stocks", [], |r| r.get(0))
        .map_err(|e| format!("count: {e}"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvHistoryResponse {
    pub s: String,
    pub t: Vec<i64>,
    pub o: Vec<f64>,
    pub h: Vec<f64>,
    pub l: Vec<f64>,
    pub c: Vec<f64>,
    pub v: Vec<f64>,
}

fn resolution_aliases(resolution: &str) -> Vec<String> {
    let r = resolution.trim().to_uppercase();
    match r.as_str() {
        "D" | "1D" => vec!["D".into(), "1D".into()],
        "W" | "1W" => vec!["W".into(), "1W".into()],
        "M" | "1M" => vec!["M".into(), "1M".into()],
        _ => vec![r],
    }
}

/// Get TradingView history from local SQLite (data that was already crawled).
///
/// Returns JSON string in the same shape as `vps_get_tradingview_history`.
#[tauri::command]
pub fn db_get_tradingview_history(
    state: tauri::State<'_, DbState>,
    symbol: String,
    resolution: String,
    from_sec: i64,
    to_sec: i64,
) -> Result<TvHistoryResponse, String> {
    let sym = symbol.trim().to_uppercase();
    let res = resolution.trim().to_string();
    if sym.is_empty() {
        return Err("symbol rỗng".into());
    }
    if res.is_empty() {
        return Err("resolution rỗng".into());
    }
    let (from_sec, to_sec) = if from_sec <= to_sec {
        (from_sec, to_sec)
    } else {
        (to_sec, from_sec)
    };
    let aliases = resolution_aliases(&res);
    let res1 = aliases.first().cloned().unwrap_or_default();
    let res2 = aliases.get(1).cloned().unwrap_or_else(|| res1.clone());

    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT ts, open, high, low, close, volume
             FROM stock_history
             WHERE symbol = ?1
               AND resolution IN (?2, ?3)
               AND ts >= ?4
               AND ts <= ?5
             ORDER BY ts ASC",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map(params![sym, res1, res2, from_sec, to_sec], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, f64>(5)?,
            ))
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut t = Vec::<i64>::new();
    let mut o = Vec::<f64>::new();
    let mut h = Vec::<f64>::new();
    let mut l = Vec::<f64>::new();
    let mut c = Vec::<f64>::new();
    let mut v = Vec::<f64>::new();

    for row in rows {
        let (ts, open, high, low, close, volume) = row.map_err(|e| format!("row: {e}"))?;
        t.push(ts);
        o.push(open);
        h.push(high);
        l.push(low);
        c.push(close);
        v.push(volume);
    }

    // If TradingView requested a range outside local data,
    // return recent crawled bars so chart can still render.
    if t.is_empty() {
        let mut stmt_recent = conn
            .prepare(
                "SELECT ts, open, high, low, close, volume
                 FROM stock_history
                 WHERE symbol = ?1
                   AND resolution IN (?2, ?3)
                 ORDER BY ts DESC
                 LIMIT 500",
            )
            .map_err(|e| format!("prepare recent: {e}"))?;
        let rows_recent = stmt_recent
            .query_map(params![sym, res1, res2], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, f64>(4)?,
                    row.get::<_, f64>(5)?,
                ))
            })
            .map_err(|e| format!("query recent: {e}"))?;

        let mut recent = Vec::<(i64, f64, f64, f64, f64, f64)>::new();
        for row in rows_recent {
            recent.push(row.map_err(|e| format!("row recent: {e}"))?);
        }
        recent.reverse();
        for (ts, open, high, low, close, volume) in recent {
            t.push(ts);
            o.push(open);
            h.push(high);
            l.push(low);
            c.push(close);
            v.push(volume);
        }
    }

    let resp = TvHistoryResponse {
        s: if t.is_empty() { "no_data".into() } else { "ok".into() },
        t,
        o,
        h,
        l,
        c,
        v,
    };

    Ok(resp)
}
