//! FinRAG — BCTC RAG trong Tauri (SQLite + Ollama HTTP + Gemini).
//! Port logic từ `test_news_service` Python; không Postgres/Redis/Docker.

mod chunk;
mod commands;
mod config;
mod embed;
mod ingest;
mod llm;
mod retrieval;

pub use commands::*;

use rusqlite::Connection;

const DEMO_BCTC_TEXT: &str = r#"CTCP FPT — Báo cáo tài chính quý 1 năm 2026 (demo)

BẢNG CÂN ĐỐI KẾ TOÁN (rút gọn)
Tài sản ngắn hạn: 45.200 tỷ VND
Tiền và tương đương tiền: 12.500 tỷ VND
Tài sản dài hạn: 18.300 tỷ VND

BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH
Doanh thu thuần quý 1/2026: 15.840 tỷ VND
Lợi nhuận sau thuế: 2.150 tỷ VND
Lợi nhuận gộp: 4.120 tỷ VND

BÁO CÁO LƯU CHUYỂN TIỀN TỆ
Lưu chuyển tiền từ HĐKD: 1.890 tỷ VND

THUYẾT MINH BCTC
Công ty ghi nhận doanh thu theo chuẩn mực kế toán Việt Nam.
Rủi ro tỷ giá: một phần doanh thu từ thị trường quốc tế.
"#;

pub fn migrate_finrag(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS finrag_companies (
            id TEXT PRIMARY KEY,
            ticker TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            exchange TEXT,
            industry TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS finrag_documents (
            id TEXT PRIMARY KEY,
            company_id TEXT REFERENCES finrag_companies(id),
            title TEXT,
            original_filename TEXT,
            ticker TEXT,
            report_type TEXT,
            report_period TEXT,
            fiscal_year INTEGER,
            fiscal_quarter INTEGER,
            status TEXT NOT NULL DEFAULT 'uploaded',
            progress INTEGER NOT NULL DEFAULT 0,
            current_step TEXT,
            error_message TEXT,
            total_chunks INTEGER NOT NULL DEFAULT 0,
            processed_chunks INTEGER NOT NULL DEFAULT 0,
            storage_path TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_finrag_documents_status ON finrag_documents(status);

        CREATE TABLE IF NOT EXISTS finrag_document_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL REFERENCES finrag_documents(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            chunk_type TEXT,
            section_title TEXT,
            page_start INTEGER,
            page_end INTEGER,
            token_count INTEGER,
            metadata_json TEXT,
            embedding BLOB,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_finrag_chunks_doc ON finrag_document_chunks(document_id);

        CREATE TABLE IF NOT EXISTS finrag_chat_sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS finrag_chat_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES finrag_chat_sessions(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )
    .map_err(|e| format!("finrag migrate: {e}"))
}

/// Seed một báo cáo demo (FPT Q1/2026) nếu DB trống — chạy ingest nền khi có Ollama.
pub fn seed_demo_if_empty(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM finrag_documents", [], |r| r.get(0))
        .map_err(|e| format!("count: {e}"))?;
    if count > 0 {
        return Ok(());
    }

    log::info!("FinRAG: seeding demo document FPT Q1/2026");
    let doc_id = uuid::Uuid::new_v4().to_string();
    let company_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO finrag_companies (id, ticker, name, exchange) VALUES (?1,'FPT','CTCP FPT','HOSE')",
        rusqlite::params![company_id],
    )
    .map_err(|e| format!("seed company: {e}"))?;

    let storage_dir = std::env::temp_dir().join("finance_buddy_finrag");
    std::fs::create_dir_all(&storage_dir).ok();
    let path = storage_dir.join(format!("{doc_id}_demo_fpt_q1_2026.txt"));
    std::fs::write(&path, DEMO_BCTC_TEXT).map_err(|e| format!("write demo: {e}"))?;

    conn.execute(
        "INSERT INTO finrag_documents
         (id, company_id, title, original_filename, ticker, report_type, report_period,
          fiscal_year, fiscal_quarter, status, storage_path)
         VALUES (?1,?2,'BCTC FPT Q1/2026 (demo)','demo_fpt_q1_2026.txt','FPT','BCTC','2026-Q1',2026,1,'queued',?3)",
        rusqlite::params![doc_id, company_id, path.to_string_lossy().to_string()],
    )
    .map_err(|e| format!("seed doc: {e}"))?;

    // Ingest sync on startup so demo works without manual upload
    let cfg = config::FinRagConfig::from_env();
    if let Err(e) = ingest::run_ingestion(conn, &cfg, &doc_id) {
        log::warn!("FinRAG demo ingest failed (Ollama/Gemini?): {e}");
        ingest::mark_failed(conn, &doc_id, &e);
    }

    Ok(())
}
