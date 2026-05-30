//! Financial-aware chunker — port rút gọn từ `worker/chunker.py` (không dùng tiktoken).

use regex::Regex;
use std::sync::LazyLock;

const MAX_CHUNK_CHARS: usize = 3200;
const MIN_CHUNK_CHARS: usize = 30;
const OVERLAP_CHARS: usize = 400;

static SECTION_PATTERNS: LazyLock<Vec<(Regex, &'static str)>> = LazyLock::new(|| {
    vec![
        (Regex::new(r"(?i)BẢNG\s*CÂN\s*ĐỐI\s*KẾ\s*TOÁN").unwrap(), "Bảng cân đối kế toán"),
        (Regex::new(r"(?i)BÁO\s*CÁO\s*KẾT\s*QUẢ\s*HOẠT\s*ĐỘNG\s*KINH\s*DOANH").unwrap(), "Báo cáo kết quả kinh doanh"),
        (Regex::new(r"(?i)BÁO\s*CÁO\s*LƯU\s*CHUYỂN\s*TIỀN\s*TỆ").unwrap(), "Báo cáo lưu chuyển tiền tệ"),
        (Regex::new(r"(?i)THUYẾT\s*MINH\s*BÁO\s*CÁO\s*TÀI\s*CHÍNH").unwrap(), "Thuyết minh BCTC"),
        (Regex::new(r"(?i)Ý\s*KIẾN\s*(CỦA\s*)?KIỂM\s*TOÁN").unwrap(), "Ý kiến kiểm toán"),
        (Regex::new(r"(?i)THÔNG\s*TIN\s*CHUNG").unwrap(), "Thông tin chung"),
    ]
});

#[derive(Clone, Debug)]
pub struct PageInput {
    pub page: i32,
    pub text: String,
}

#[derive(Clone, Debug)]
pub struct ChunkOutput {
    pub chunk_index: i32,
    pub content: String,
    pub chunk_type: String,
    pub section_title: Option<String>,
    pub page_start: i32,
    pub page_end: i32,
}

pub fn detect_section(text: &str) -> Option<&'static str> {
    let snippet = &text[..text.len().min(600)];
    for (re, name) in SECTION_PATTERNS.iter() {
        if re.is_match(snippet) {
            return Some(*name);
        }
    }
    None
}

pub fn chunk_pages(pages: &[PageInput]) -> Vec<ChunkOutput> {
    let mut chunks: Vec<ChunkOutput> = Vec::new();
    let mut current_section: Option<String> = None;
    let mut current_text = String::new();
    let mut page_start = 1i32;
    let mut page_end = 1i32;
    let mut chunk_index = 0i32;

    for page in pages {
        let section = detect_section(&page.text);
        if let Some(s) = section {
            if current_section.as_deref() != Some(s) {
                if !current_text.trim().is_empty() {
                    let new = split_section_text(
                        &current_text,
                        chunk_index,
                        current_section.as_deref(),
                        page_start,
                        page_end,
                    );
                    chunk_index += new.len() as i32;
                    chunks.extend(new);
                    current_text.clear();
                }
                current_section = Some(s.to_string());
                page_start = page.page;
            }
        }
        current_text.push('\n');
        current_text.push_str(&page.text);
        page_end = page.page;
    }

    if !current_text.trim().is_empty() {
        let new = split_section_text(
            &current_text,
            chunk_index,
            current_section.as_deref(),
            page_start,
            page_end,
        );
        chunks.extend(new);
    }

    chunks
}

fn split_section_text(
    text: &str,
    start_index: i32,
    section: Option<&str>,
    page_start: i32,
    page_end: i32,
) -> Vec<ChunkOutput> {
    let text = text.trim();
    if text.len() < MIN_CHUNK_CHARS {
        return vec![];
    }
    if text.len() <= MAX_CHUNK_CHARS {
        return vec![ChunkOutput {
            chunk_index: start_index,
            content: text.to_string(),
            chunk_type: "text".into(),
            section_title: section.map(String::from),
            page_start,
            page_end,
        }];
    }

    let mut results = Vec::new();
    let mut idx = start_index;
    let mut pos = 0usize;
    let chars: Vec<char> = text.chars().collect();

    while pos < chars.len() {
        let end = (pos + MAX_CHUNK_CHARS).min(chars.len());
        let mut chunk: String = chars[pos..end].iter().collect();
        if end < chars.len() {
            chunk = find_break_point(&chunk);
        }
        let chunk = chunk.trim();
        if chunk.len() >= MIN_CHUNK_CHARS {
            results.push(ChunkOutput {
                chunk_index: idx,
                content: chunk.to_string(),
                chunk_type: "text".into(),
                section_title: section.map(String::from),
                page_start,
                page_end,
            });
            idx += 1;
        }
        if end >= chars.len() {
            break;
        }
        let used = chunk.chars().count();
        pos += used.saturating_sub(OVERLAP_CHARS).max(1);
    }

    results
}

fn find_break_point(text: &str) -> String {
    let search_start = (text.len() as f64 * 0.75) as usize;
    let tail = &text[search_start..];
    if let Some(p) = tail.rfind("\n\n") {
        return text[..search_start + p].to_string();
    }
    for sep in [". ", ".\n"] {
        if let Some(p) = tail.rfind(sep) {
            return text[..search_start + p + sep.len()].to_string();
        }
    }
    if let Some(p) = tail.rfind('\n') {
        return text[..search_start + p].to_string();
    }
    text.to_string()
}
