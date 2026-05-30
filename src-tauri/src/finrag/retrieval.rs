//! Retrieval — cosine trên SQLite BLOB (thay pgvector), fallback ILIKE.

use super::config::FinRagConfig;
use super::embed::{blob_to_embedding, cosine_similarity, embed_texts};
use rusqlite::{params, Connection};

#[derive(Clone, Debug)]
pub struct RetrievedChunk {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub section_title: Option<String>,
    pub page_start: Option<i32>,
    pub page_end: Option<i32>,
    pub doc_title: Option<String>,
    pub score: f32,
    pub metadata_json: Option<String>,
}

pub fn retrieve_chunks(
    conn: &Connection,
    cfg: &FinRagConfig,
    query: &str,
) -> Result<Vec<RetrievedChunk>, String> {
    let query_emb = match embed_texts(cfg, &[query.to_string()]) {
        Ok(v) if !v.is_empty() => v[0].clone(),
        Ok(_) => return text_search(conn, query),
        Err(e) => {
            log::warn!("embed query failed: {e}, fallback text search");
            return text_search(conn, query);
        }
    };

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.document_id, c.content, c.section_title, c.page_start, c.page_end,
                    c.metadata_json, c.embedding, d.title
             FROM finrag_document_chunks c
             JOIN finrag_documents d ON d.id = c.document_id
             WHERE c.embedding IS NOT NULL AND d.status = 'ready'",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<i32>>(4)?,
                row.get::<_, Option<i32>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Vec<u8>>(7)?,
                row.get::<_, Option<String>>(8)?,
            ))
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut scored: Vec<RetrievedChunk> = Vec::new();
    for row in rows {
        let (
            id,
            document_id,
            content,
            section_title,
            page_start,
            page_end,
            metadata_json,
            emb_blob,
            doc_title,
        ) = row.map_err(|e| format!("row: {e}"))?;
        let emb = blob_to_embedding(&emb_blob);
        let score = cosine_similarity(&query_emb, &emb);
        if score > 0.25 {
            scored.push(RetrievedChunk {
                id,
                document_id,
                content,
                section_title,
                page_start,
                page_end,
                doc_title,
                score,
                metadata_json,
            });
        }
    }

    scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(20);

    if scored.is_empty() {
        return text_search(conn, query);
    }

    Ok(scored)
}

fn text_search(conn: &Connection, query: &str) -> Result<Vec<RetrievedChunk>, String> {
    let pattern = format!("%{}%", query.replace('%', ""));
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.document_id, c.content, c.section_title, c.page_start, c.page_end,
                    c.metadata_json, d.title
             FROM finrag_document_chunks c
             JOIN finrag_documents d ON d.id = c.document_id
             WHERE c.content LIKE ?1 AND d.status = 'ready'
             LIMIT 15",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map(params![pattern], |row| {
            Ok(RetrievedChunk {
                id: row.get(0)?,
                document_id: row.get(1)?,
                content: row.get(2)?,
                section_title: row.get(3)?,
                page_start: row.get(4)?,
                page_end: row.get(5)?,
                metadata_json: row.get(6)?,
                doc_title: row.get(7)?,
                score: 0.0,
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("collect: {e}"))
}

pub fn build_context(chunks: &[RetrievedChunk]) -> (String, serde_json::Value) {
    let mut parts = Vec::new();
    let mut sources = Vec::new();

    for (i, ch) in chunks.iter().enumerate() {
        let n = i + 1;
        let mut header = format!("[Nguồn {n}]");
        if let Some(t) = &ch.doc_title {
            header.push(' ');
            header.push_str(t);
        }
        if let Some(s) = &ch.section_title {
            header.push_str(" · ");
            header.push_str(s);
        }
        if let Some(p) = ch.page_start {
            header.push_str(&format!(" · trang {p}"));
        }
        parts.push(format!("{header}\n{}", ch.content));

        let meta: serde_json::Value = ch
            .metadata_json
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or(serde_json::json!({}));

        sources.push(serde_json::json!({
            "chunk_id": ch.id,
            "document_id": ch.document_id,
            "section": ch.section_title,
            "page_start": ch.page_start,
            "page_end": ch.page_end,
            "score": ch.score,
            "fiscal_year": meta.get("fiscal_year"),
            "fiscal_quarter": meta.get("fiscal_quarter"),
            "report_period": meta.get("report_period"),
        }));
    }

    let context = parts.join("\n\n---\n\n");
    let citations = serde_json::json!({ "sources": sources });
    (context, citations)
}
