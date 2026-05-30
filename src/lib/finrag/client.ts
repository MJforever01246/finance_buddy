/**
 * FinRAG client — chỉ Tauri/Rust (SQLite). Không có HTTP server phụ.
 */

export class FinRagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinRagError";
  }
}

export function isFinRagDesktop(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

export type FinRagHealth = {
  ok: boolean;
  ollama: boolean;
  geminiConfigured: boolean;
  backend: string;
};

export type FinRagDocument = {
  id: string;
  companyId: string | null;
  ticker: string | null;
  title: string | null;
  originalFilename: string | null;
  reportType: string | null;
  reportPeriod: string | null;
  fiscalYear: number | null;
  fiscalQuarter: number | null;
  status: string;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  totalChunks: number;
  processedChunks: number;
  createdAt: string;
  updatedAt: string;
};

export type FinRagChatSession = {
  id: string;
  title: string | null;
};

export type FinRagCitationSource = {
  chunk_id?: string;
  document_id?: string;
  section?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  fiscal_year?: number;
  fiscal_quarter?: number;
  report_period?: string;
  score?: number;
};

export type FinRagChatMessage = {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  citations: { sources?: FinRagCitationSource[] } | null;
};

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isFinRagDesktop()) {
    throw new FinRagError(
      "FinRAG chỉ chạy trong app desktop. Dùng: npm run desktop:dev rồi mở /bctc trong cửa sổ app.",
    );
  }
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(cmd, args);
}

export async function checkFinRagBackend(): Promise<{
  ready: boolean;
  health?: FinRagHealth;
}> {
  if (!isFinRagDesktop()) {
    return { ready: false };
  }
  try {
    const health = await invoke<FinRagHealth>("finrag_health");
    return { ready: health.ok, health };
  } catch {
    return { ready: false };
  }
}

export const finragApi = {
  health: () => invoke<FinRagHealth>("finrag_health"),

  listDocuments: (limit = 100) =>
    invoke<FinRagDocument[]>("finrag_list_documents", { limit }),

  uploadDocument: async (
    file: File,
    meta: {
      title?: string;
      ticker?: string;
      report_type?: string;
      fiscal_year?: string;
      fiscal_quarter?: string;
    },
  ) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return invoke<FinRagDocument>("finrag_upload_document", {
      filename: file.name,
      contentBase64: btoa(binary),
      meta: {
        title: meta.title,
        ticker: meta.ticker,
        reportType: meta.report_type ?? "BCTC",
        fiscalYear: meta.fiscal_year ? Number(meta.fiscal_year) : undefined,
        fiscalQuarter: meta.fiscal_quarter ? Number(meta.fiscal_quarter) : undefined,
      },
    });
  },

  listSessions: () => invoke<FinRagChatSession[]>("finrag_list_sessions"),

  createSession: (title?: string) =>
    invoke<FinRagChatSession>("finrag_create_session", {
      title: title ?? "Cuộc hỏi đáp mới",
    }),

  listMessages: (sessionId: string) =>
    invoke<FinRagChatMessage[]>("finrag_list_messages", { sessionId }),

  sendMessage: (sessionId: string, content: string) =>
    invoke<FinRagChatMessage>("finrag_send_message", { sessionId, content }),
};
