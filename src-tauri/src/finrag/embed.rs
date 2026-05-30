//! Ollama embedding — port từ `apps/api/app/services/embeddings.py` + `worker/embedder.py`.

use super::config::FinRagConfig;
use reqwest::blocking::Client;
use serde::Deserialize;
use std::time::Duration;

#[derive(Debug, Deserialize)]
struct OllamaEmbedResponse {
    embeddings: Option<Vec<Vec<f32>>>,
    embedding: Option<Vec<f32>>,
}

pub fn embed_texts(cfg: &FinRagConfig, texts: &[String]) -> Result<Vec<Vec<f32>>, String> {
    if texts.is_empty() {
        return Ok(vec![]);
    }

    let url = format!(
        "{}/api/embed",
        cfg.ollama_base_url.trim_end_matches('/')
    );
    let input = if texts.len() == 1 {
        serde_json::json!(texts[0].as_str())
    } else {
        serde_json::json!(texts)
    };
    let body = serde_json::json!({
        "model": cfg.embedding_model,
        "input": input,
    });

    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("http client: {e}"))?;

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .map_err(|e| format!("Ollama embed: {e} (đã chạy ollama pull {}?)", cfg.embedding_model))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().unwrap_or_default();
        return Err(format!("Ollama HTTP {status}: {text}"));
    }

    let data: OllamaEmbedResponse = resp.json().map_err(|e| format!("Ollama JSON: {e}"))?;

    if let Some(embeddings) = data.embeddings {
        return Ok(embeddings);
    }
    if let Some(one) = data.embedding {
        return Ok(vec![one]);
    }

    Err("Ollama không trả embedding".into())
}

pub fn embedding_to_blob(vec: &[f32]) -> Vec<u8> {
    let mut out = Vec::with_capacity(vec.len() * 4);
    for v in vec {
        out.extend_from_slice(&v.to_le_bytes());
    }
    out
}

pub fn blob_to_embedding(blob: &[u8]) -> Vec<f32> {
    blob.chunks_exact(4)
        .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
        .collect()
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let mut dot = 0.0f32;
    let mut na = 0.0f32;
    let mut nb = 0.0f32;
    for i in 0..a.len() {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    let denom = na.sqrt() * nb.sqrt();
    if denom < 1e-8 {
        0.0
    } else {
        dot / denom
    }
}

pub fn ollama_reachable(cfg: &FinRagConfig) -> bool {
    let url = format!("{}/api/tags", cfg.ollama_base_url.trim_end_matches('/'));
    Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .ok()
        .and_then(|c| c.get(&url).send().ok())
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
