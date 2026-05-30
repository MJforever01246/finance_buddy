//! Tauri IPC — thay FastAPI `apps/api`.

use super::config::FinRagConfig;
use super::embed::ollama_reachable;
use super::ingest::{mark_failed, run_ingestion};
use super::llm::{generate_answer, NO_DATA_RESPONSE, SYSTEM_PROMPT};
use super::retrieval::{build_context, retrieve_chunks};
use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinRagHealth {
    pub ok: bool,
    pub ollama: bool,
    pub gemini_configured: bool,
    pub backend: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FinRagDocument {
    pub id: String,
    pub company_id: Option<String>,
    pub ticker: Option<String>,
    pub title: Option<String>,
    pub original_filename: Option<String>,
    pub report_type: Option<String>,
    pub report_period: Option<String>,
    pub fiscal_year: Option<i32>,
    pub fiscal_quarter: Option<i32>,
    pub status: String,
    pub progress: i32,
    pub current_step: Option<String>,
    pub error_message: Option<String>,
    pub total_chunks: i32,
    pub processed_chunks: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FinRagChatSession {
    pub id: String,
    pub title: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FinRagChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub citations: Option<serde_json::Value>,
}

fn with_conn<F, T>(state: &State<'_, DbState>, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let conn = state.0.lock().map_err(|e| format!("lock: {e}"))?;
    f(&conn)
}

fn finrag_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data: {e}"))?
        .join("finrag");
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir finrag: {e}"))?;
    Ok(dir)
}

#[tauri::command]
pub fn finrag_health(state: State<'_, DbState>) -> Result<FinRagHealth, String> {
    let cfg = FinRagConfig::from_env();
    with_conn(&state, |conn| {
        conn.query_row("SELECT 1", [], |_| Ok(()))
            .map_err(|e| format!("sqlite: {e}"))?;
        Ok(FinRagHealth {
            ok: true,
            ollama: ollama_reachable(&cfg),
            gemini_configured: cfg.gemini_api_key.is_some(),
            backend: "tauri-sqlite".into(),
        })
    })
}

#[tauri::command]
pub fn finrag_list_documents(
    state: State<'_, DbState>,
    limit: Option<i32>,
) -> Result<Vec<FinRagDocument>, String> {
    let lim = limit.unwrap_or(100);
    with_conn(&state, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT id, company_id, ticker, title, original_filename, report_type, report_period,
                        fiscal_year, fiscal_quarter, status, progress, current_step, error_message,
                        total_chunks, processed_chunks, created_at, updated_at
                 FROM finrag_documents ORDER BY updated_at DESC LIMIT ?1",
            )
            .map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map(params![lim], map_document)
            .map_err(|e| format!("query: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("collect: {e}"))
    })
}

fn map_document(row: &rusqlite::Row<'_>) -> rusqlite::Result<FinRagDocument> {
    Ok(FinRagDocument {
        id: row.get(0)?,
        company_id: row.get(1)?,
        ticker: row.get(2)?,
        title: row.get(3)?,
        original_filename: row.get(4)?,
        report_type: row.get(5)?,
        report_period: row.get(6)?,
        fiscal_year: row.get(7)?,
        fiscal_quarter: row.get(8)?,
        status: row.get(9)?,
        current_step: row.get(11)?,
        progress: row.get(10)?,
        error_message: row.get(12)?,
        total_chunks: row.get(13)?,
        processed_chunks: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadMeta {
    pub title: Option<String>,
    pub ticker: Option<String>,
    pub report_type: Option<String>,
    pub fiscal_year: Option<i32>,
    pub fiscal_quarter: Option<i32>,
}

#[tauri::command]
pub fn finrag_upload_document(
    app: AppHandle,
    state: State<'_, DbState>,
    filename: String,
    content_base64: String,
    meta: UploadMeta,
) -> Result<FinRagDocument, String> {
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        content_base64.trim(),
    )
    .map_err(|e| format!("base64: {e}"))?;

    let storage = finrag_storage_dir(&app)?;
    let doc_id = uuid::Uuid::new_v4().to_string();
    let safe_name = filename
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '_' { c } else { '_' })
        .collect::<String>();
    let path = storage.join(format!("{doc_id}_{safe_name}"));
    std::fs::write(&path, &bytes).map_err(|e| format!("write file: {e}"))?;

    let ticker = meta.ticker.map(|t| t.to_uppercase());
    let report_period = meta.fiscal_year.map(|y| {
        if let Some(q) = meta.fiscal_quarter {
            format!("{y}-Q{q}")
        } else {
            y.to_string()
        }
    });

    let doc = with_conn(&state, |conn| {
        let company_id = if let Some(ref t) = ticker {
            Some(upsert_company_conn(conn, t, &meta.title)?)
        } else {
            None
        };
        conn.execute(
            "INSERT INTO finrag_documents
             (id, company_id, title, original_filename, ticker, report_type, report_period,
              fiscal_year, fiscal_quarter, status, progress, current_step, storage_path)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'queued',0,'queued',?10)",
            params![
                doc_id,
                company_id,
                meta.title,
                filename,
                ticker,
                meta.report_type.unwrap_or_else(|| "BCTC".into()),
                report_period,
                meta.fiscal_year,
                meta.fiscal_quarter,
                path.to_string_lossy(),
            ],
        )
        .map_err(|e| format!("insert doc: {e}"))?;
        fetch_document(conn, &doc_id)
    })?;

    spawn_ingestion(app, doc_id);
    Ok(doc)
}

fn upsert_company_conn(
    conn: &Connection,
    ticker: &str,
    title: &Option<String>,
) -> Result<String, String> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM finrag_companies WHERE ticker = ?1",
            params![ticker],
            |r| r.get(0),
        )
        .ok();
    if let Some(id) = existing {
        return Ok(id);
    }
    let id = uuid::Uuid::new_v4().to_string();
    let name = title.clone().unwrap_or_else(|| ticker.to_string());
    conn.execute(
        "INSERT INTO finrag_companies (id, ticker, name) VALUES (?1,?2,?3)",
        params![id, ticker, name],
    )
    .map_err(|e| format!("company: {e}"))?;
    Ok(id)
}

fn fetch_document(conn: &Connection, id: &str) -> Result<FinRagDocument, String> {
    conn.query_row(
        "SELECT id, company_id, ticker, title, original_filename, report_type, report_period,
                fiscal_year, fiscal_quarter, status, progress, current_step, error_message,
                total_chunks, processed_chunks, created_at, updated_at
         FROM finrag_documents WHERE id = ?1",
        params![id],
        map_document,
    )
    .map_err(|e| format!("fetch doc: {e}"))
}

fn spawn_ingestion(app: AppHandle, document_id: String) {
    std::thread::spawn(move || {
        let cfg = FinRagConfig::from_env();
        let db_path = match app.path().app_data_dir() {
            Ok(d) => d.join("data.db"),
            Err(e) => {
                log::error!("finrag ingest path: {e}");
                return;
            }
        };
        let conn = match Connection::open(&db_path) {
            Ok(c) => c,
            Err(e) => {
                log::error!("finrag ingest db: {e}");
                return;
            }
        };
        if let Err(e) = run_ingestion(&conn, &cfg, &document_id) {
            log::error!("finrag ingest failed: {e}");
            mark_failed(&conn, &document_id, &e);
        }
    });
}

#[tauri::command]
pub fn finrag_list_sessions(state: State<'_, DbState>) -> Result<Vec<FinRagChatSession>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn
            .prepare("SELECT id, title FROM finrag_chat_sessions ORDER BY updated_at DESC")
            .map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map([], |row| {
                Ok(FinRagChatSession {
                    id: row.get(0)?,
                    title: row.get(1)?,
                })
            })
            .map_err(|e| format!("query: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("collect: {e}"))
    })
}

#[tauri::command]
pub fn finrag_create_session(
    state: State<'_, DbState>,
    title: Option<String>,
) -> Result<FinRagChatSession, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let t = title.unwrap_or_else(|| "Cuộc hỏi đáp mới".into());
    with_conn(&state, |conn| {
        conn.execute(
            "INSERT INTO finrag_chat_sessions (id, title) VALUES (?1,?2)",
            params![id, t],
        )
        .map_err(|e| format!("insert: {e}"))?;
        Ok(FinRagChatSession { id, title: Some(t) })
    })
}

#[tauri::command]
pub fn finrag_list_messages(
    state: State<'_, DbState>,
    session_id: String,
) -> Result<Vec<FinRagChatMessage>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT id, session_id, role, content, citations_json
                 FROM finrag_chat_messages WHERE session_id = ?1 ORDER BY created_at",
            )
            .map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map(params![session_id], |row| {
                let citations_str: Option<String> = row.get(4)?;
                let citations = citations_str
                    .as_ref()
                    .and_then(|s| serde_json::from_str(s).ok());
                Ok(FinRagChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    citations,
                })
            })
            .map_err(|e| format!("query: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("collect: {e}"))
    })
}

#[tauri::command]
pub fn finrag_send_message(
    state: State<'_, DbState>,
    session_id: String,
    content: String,
) -> Result<FinRagChatMessage, String> {
    let cfg = FinRagConfig::from_env();
    let user_id = uuid::Uuid::new_v4().to_string();

    with_conn(&state, |conn| {
        conn.execute(
            "INSERT INTO finrag_chat_messages (id, session_id, role, content) VALUES (?1,?2,'user',?3)",
            params![user_id, session_id, content],
        )
        .map_err(|e| format!("insert user: {e}"))?;
        Ok(())
    })?;

    let chunks = with_conn(&state, |conn| retrieve_chunks(conn, &cfg, &content))?;

    let assistant_id = uuid::Uuid::new_v4().to_string();

    if chunks.is_empty() {
        with_conn(&state, |conn| {
            conn.execute(
                "INSERT INTO finrag_chat_messages (id, session_id, role, content) VALUES (?1,?2,'assistant',?3)",
                params![assistant_id, session_id, NO_DATA_RESPONSE],
            )
            .map_err(|e| format!("insert: {e}"))?;
            conn.execute(
                "UPDATE finrag_chat_sessions SET updated_at = datetime('now') WHERE id = ?1",
                params![session_id],
            )
            .ok();
            Ok(FinRagChatMessage {
                id: assistant_id,
                session_id,
                role: "assistant".into(),
                content: NO_DATA_RESPONSE.into(),
                citations: None,
            })
        })
    } else {
        let (ctx, citations) = build_context(&chunks);
        let user_prompt = format!("Context:\n{ctx}\n\nCâu hỏi: {content}");
        let answer = match generate_answer(&cfg, &user_prompt) {
            Ok(a) => a,
            Err(e) => format!(
                "[Lỗi Gemini: {e}]\n\nĐã tìm thấy ngữ cảnh (trích đoạn):\n{}",
                &ctx[..ctx.len().min(1500)]
            ),
        };
        let citations_str = citations.to_string();
        with_conn(&state, |conn| {
            conn.execute(
                "INSERT INTO finrag_chat_messages (id, session_id, role, content, citations_json)
                 VALUES (?1,?2,'assistant',?3,?4)",
                params![assistant_id, session_id, answer, citations_str],
            )
            .map_err(|e| format!("insert: {e}"))?;
            conn.execute(
                "UPDATE finrag_chat_sessions SET updated_at = datetime('now') WHERE id = ?1",
                params![session_id],
            )
            .ok();
            Ok(FinRagChatMessage {
                id: assistant_id,
                session_id,
                role: "assistant".into(),
                content: answer,
                citations: Some(citations),
            })
        })
    }
}

// silence unused import warning for SYSTEM_PROMPT re-export if needed
#[allow(dead_code)]
const _: &str = SYSTEM_PROMPT;
