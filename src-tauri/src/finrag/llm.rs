//! Gemini chat — port từ `apps/api/app/services/llm.py`.

use super::config::FinRagConfig;
use reqwest::blocking::Client;
use serde::Deserialize;
use std::time::Duration;

const GEMINI_BASE: &str = "https://generativelanguage.googleapis.com/v1beta";

pub const SYSTEM_PROMPT: &str = r#"Bạn là trợ lý phân tích báo cáo tài chính doanh nghiệp Việt Nam.
Trả lời DỰA TRÊN context được cung cấp. Không bịa số liệu.
Mỗi câu trả lời phải có trích dẫn nguồn [Nguồn N] (công ty, kỳ báo cáo, trang nếu có).
Nếu context không đủ, nói rõ chưa có dữ liệu và gợi ý upload thêm báo cáo.
Trả lời bằng tiếng Việt."#;

pub const NO_DATA_RESPONSE: &str = "Tôi không tìm thấy thông tin liên quan trong dữ liệu hiện có. \
Vui lòng upload thêm báo cáo tài chính (tab Báo cáo) và đợi trạng thái Sẵn sàng.";

#[derive(Debug, Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiContent>,
}

#[derive(Debug, Deserialize)]
struct GeminiContent {
    parts: Option<Vec<GeminiPart>>,
}

#[derive(Debug, Deserialize)]
struct GeminiPart {
    text: Option<String>,
}

pub fn generate_answer(cfg: &FinRagConfig, user_prompt: &str) -> Result<String, String> {
    let key = cfg
        .gemini_api_key
        .as_ref()
        .ok_or("GEMINI_API_KEY chưa cấu hình (đặt biến môi trường trước khi mở app)")?;

    let url = format!(
        "{}/models/{}:generateContent",
        GEMINI_BASE, cfg.llm_model
    );
    let body = serde_json::json!({
        "systemInstruction": { "parts": [{ "text": SYSTEM_PROMPT }] },
        "contents": [{ "role": "user", "parts": [{ "text": user_prompt }] }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        }
    });

    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("http: {e}"))?;

    let resp = client
        .post(&url)
        .query(&[("key", key.as_str())])
        .json(&body)
        .send()
        .map_err(|e| format!("Gemini: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().unwrap_or_default();
        return Err(format!("Gemini HTTP {status}: {text}"));
    }

    let data: GeminiResponse = resp.json().map_err(|e| format!("Gemini JSON: {e}"))?;
    let parts = data
        .candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.content)
        .and_then(|c| c.parts)
        .unwrap_or_default();

    let answer: String = parts
        .into_iter()
        .filter_map(|p| p.text)
        .collect::<Vec<_>>()
        .join("")
        .trim()
        .to_string();

    if answer.is_empty() {
        return Err("Gemini trả về rỗng".into());
    }
    Ok(answer)
}
