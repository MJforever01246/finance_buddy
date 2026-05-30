//! FinRAG config — đọc từ biến môi trường (giống `.env` Python).

pub struct FinRagConfig {
    pub ollama_base_url: String,
    pub embedding_model: String,
    pub embedding_dims: usize,
    pub gemini_api_key: Option<String>,
    pub llm_model: String,
}

impl FinRagConfig {
    pub fn from_env() -> Self {
        Self {
            ollama_base_url: std::env::var("OLLAMA_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:11434".into()),
            embedding_model: std::env::var("EMBEDDING_MODEL")
                .unwrap_or_else(|_| "nomic-embed-text".into()),
            embedding_dims: std::env::var("EMBEDDING_DIMENSIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(768),
            gemini_api_key: std::env::var("GEMINI_API_KEY")
                .ok()
                .filter(|k| !k.is_empty() && k != "your_key_here"),
            llm_model: std::env::var("LLM_MODEL")
                .unwrap_or_else(|_| "gemini-2.0-flash".into()),
        }
    }
}
