//! Ingestion pipeline — port rút gọn từ `worker/ingestion.py` (không Redis, chạy sync/thread).

use super::chunk::{chunk_pages, PageInput};
use super::config::FinRagConfig;
use super::embed::{embed_texts, embedding_to_blob};
use rusqlite::{params, Connection};
use std::path::Path;

pub fn extract_text_from_bytes(filename: &str, bytes: &[u8]) -> Result<Vec<PageInput>, String> {
    let lower = filename.to_lowercase();
    if lower.ends_with(".txt") || lower.ends_with(".md") {
        let text = String::from_utf8_lossy(bytes).into_owned();
        return Ok(vec![PageInput { page: 1, text }]);
    }
    if lower.ends_with(".pdf") {
        let text = pdf_extract::extract_text_from_mem(bytes)
            .map_err(|e| format!("PDF extract: {e}"))?;
        if text.trim().len() < 50 {
            return Err("PDF không trích được đủ text (có thể là scan — cần OCR)".into());
        }
        return Ok(vec![PageInput { page: 1, text }]);
    }
    Err(format!(
        "Định dạng chưa hỗ trợ: {filename}. Dùng .txt hoặc .pdf"
    ))
}

pub fn extract_text_from_path(path: &Path) -> Result<Vec<PageInput>, String> {
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let bytes = std::fs::read(path).map_err(|e| format!("read file: {e}"))?;
    extract_text_from_bytes(name, &bytes)
}

pub fn run_ingestion(conn: &Connection, cfg: &FinRagConfig, document_id: &str) -> Result<(), String> {
    update_doc_status(conn, document_id, "extracting_text", 10, None)?;

    let (title, ticker, fiscal_year, fiscal_quarter, report_period, raw_path): (
        Option<String>,
        Option<String>,
        Option<i32>,
        Option<i32>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            "SELECT title, ticker, fiscal_year, fiscal_quarter, report_period, storage_path
             FROM finrag_documents WHERE id = ?1",
            params![document_id],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                ))
            },
        )
        .map_err(|e| format!("doc: {e}"))?;

    let path = raw_path.ok_or("Không có file lưu")?;
    let pages = extract_text_from_path(Path::new(&path))?;

    update_doc_status(conn, document_id, "chunking", 40, None)?;

    let meta = serde_json::json!({
        "ticker": ticker,
        "fiscal_year": fiscal_year,
        "fiscal_quarter": fiscal_quarter,
        "report_period": report_period,
        "title": title,
    });
    let meta_str = meta.to_string();

    let chunks = chunk_pages(&pages);
    let total = chunks.len() as i32;
    conn.execute(
        "UPDATE finrag_documents SET total_chunks = ?1 WHERE id = ?2",
        params![total, document_id],
    )
    .map_err(|e| format!("update total: {e}"))?;

    update_doc_status(conn, document_id, "embedding", 60, None)?;

  conn.execute(
        "DELETE FROM finrag_document_chunks WHERE document_id = ?1",
        params![document_id],
    )
    .ok();

    let batch_size = 8usize;
    let mut processed = 0i32;

    for batch_start in (0..chunks.len()).step_by(batch_size) {
        let batch_end = (batch_start + batch_size).min(chunks.len());
        let batch = &chunks[batch_start..batch_end];
        let texts: Vec<String> = batch.iter().map(|c| c.content.clone()).collect();

        let embeddings = embed_texts(cfg, &texts)?;

        for (ch, emb) in batch.iter().zip(embeddings.iter()) {
            let chunk_id = uuid::Uuid::new_v4().to_string();
            let emb_blob = embedding_to_blob(emb);
            conn.execute(
                "INSERT INTO finrag_document_chunks
                 (id, document_id, chunk_index, content, chunk_type, section_title,
                  page_start, page_end, token_count, metadata_json, embedding)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
                params![
                    chunk_id,
                    document_id,
                    ch.chunk_index,
                    ch.content,
                    ch.chunk_type,
                    ch.section_title,
                    ch.page_start,
                    ch.page_end,
                    (ch.content.len() / 4) as i32,
                    meta_str,
                    emb_blob,
                ],
            )
            .map_err(|e| format!("insert chunk: {e}"))?;
            processed += 1;
        }

        let progress = 60 + ((processed as f64 / total.max(1) as f64) * 35.0) as i32;
        conn.execute(
            "UPDATE finrag_documents SET processed_chunks = ?1, progress = ?2 WHERE id = ?3",
            params![processed, progress, document_id],
        )
        .ok();
    }

    update_doc_status(conn, document_id, "ready", 100, None)?;
    Ok(())
}

fn update_doc_status(
    conn: &Connection,
    id: &str,
    step: &str,
    progress: i32,
    err: Option<&str>,
) -> Result<(), String> {
    let status = if err.is_some() {
        "failed"
    } else if step == "ready" {
        "ready"
    } else {
        "processing"
    };
    conn.execute(
        "UPDATE finrag_documents SET status = ?1, current_step = ?2, progress = ?3,
         error_message = ?4, updated_at = datetime('now') WHERE id = ?5",
        params![status, step, progress, err, id],
    )
    .map_err(|e| format!("status: {e}"))?;
    Ok(())
}

pub fn mark_failed(conn: &Connection, id: &str, err: &str) {
    let _ = update_doc_status(conn, id, "failed", 0, Some(err));
}
