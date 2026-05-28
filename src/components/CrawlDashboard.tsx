"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ParsedCurl {
  url: string;
  symbol: string;
  resolution: string;
  fromSec: number;
  toSec: number;
  countback: number | null;
}

interface CrawlResult {
  symbol: string;
  resolution: string;
  barsFetched: number;
  barsInserted: number;
  error: string | null;
}

type LogEntry = {
  time: string;
  symbol: string;
  status: "ok" | "error" | "skip";
  message: string;
};

const RESOLUTION_LABELS: Record<string, string> = {
  "1": "1 phút",
  "5": "5 phút",
  "15": "15 phút",
  "30": "30 phút",
  "60": "1 giờ",
  D: "Ngày",
  "1D": "Ngày",
  W: "Tuần",
  "1W": "Tuần",
  M: "Tháng",
  "1M": "Tháng",
};

export default function CrawlDashboard() {
  const [curlText, setCurlText] = useState("");
  const [parsed, setParsed] = useState<ParsedCurl | null>(null);
  const [parseError, setParseError] = useState("");

  // Auto crawl state
  const [isRunning, setIsRunning] = useState(false);
  const [allSymbols, setAllSymbols] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [delayMs, setDelayMs] = useState(2000);
  const [batchSize, setBatchSize] = useState(10);
  const [pauseBetweenBatch, setPauseBetweenBatch] = useState(5000);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<[string, number][]>([]);

  const abortRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = useCallback((symbol: string, status: LogEntry["status"], message: string) => {
    const time = new Date().toLocaleTimeString("vi-VN");
    setLogs((prev) => [...prev.slice(-500), { time, symbol, status, message }]);
  }, []);

  // Parse curl on change
  const handleParse = async () => {
    if (!curlText.trim()) return;
    setParseError("");
    setParsed(null);
    try {
      const result = await invoke<ParsedCurl>("crawl_parse_curl", { curlText });
      setParsed(result);
    } catch (e: unknown) {
      setParseError(String(e));
    }
  };

  // Single symbol fetch
  const handleFetchSingle = async () => {
    if (!parsed) return;
    try {
      const result = await invoke<CrawlResult>("crawl_fetch_and_save", {
        symbol: parsed.symbol,
        resolution: parsed.resolution,
        fromSec: parsed.fromSec,
        toSec: parsed.toSec,
        countback: parsed.countback,
      });
      addLog(
        result.symbol,
        result.barsFetched > 0 ? "ok" : "skip",
        `Fetched ${result.barsFetched}, inserted ${result.barsInserted}`
      );
    } catch (e: unknown) {
      addLog(parsed.symbol, "error", String(e));
    }
  };

  // Load all symbols for batch
  const loadSymbols = async () => {
    try {
      const syms = await invoke<string[]>("crawl_get_all_symbols");
      setAllSymbols(syms);
      return syms;
    } catch (e) {
      addLog("SYSTEM", "error", `Load symbols failed: ${e}`);
      return [];
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const s = await invoke<[string, number][]>("crawl_get_stats", {
        resolution: parsed?.resolution || "D",
      });
      setStats(s);
    } catch (e) {
      console.error(e);
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Auto crawl all symbols
  const startAutoCrawl = async () => {
    if (!parsed) {
      setParseError("Hãy paste curl trước để xác định resolution và khoảng thời gian");
      return;
    }
    abortRef.current = false;
    setIsRunning(true);
    setLogs([]);

    let syms = allSymbols;
    if (syms.length === 0) {
      syms = await loadSymbols();
    }
    if (syms.length === 0) {
      addLog("SYSTEM", "error", "Không có mã nào trong DB");
      setIsRunning(false);
      return;
    }

    setProgress({ current: 0, total: syms.length });
    addLog("SYSTEM", "ok", `Bắt đầu crawl ${syms.length} mã, resolution=${parsed.resolution}`);

    for (let i = 0; i < syms.length; i++) {
      if (abortRef.current) {
        addLog("SYSTEM", "skip", "Đã dừng bởi người dùng");
        break;
      }

      const sym = syms[i];
      setProgress({ current: i + 1, total: syms.length });

      try {
        const result = await invoke<CrawlResult>("crawl_fetch_and_save", {
          symbol: sym,
          resolution: parsed.resolution,
          fromSec: parsed.fromSec,
          toSec: parsed.toSec,
          countback: parsed.countback,
        });

        if (result.barsFetched === 0) {
          addLog(sym, "skip", "no_data");
        } else {
          addLog(sym, "ok", `+${result.barsInserted} bars (fetched ${result.barsFetched})`);
        }
      } catch (e: unknown) {
        addLog(sym, "error", String(e));
      }

      // Delay between requests
      if (i < syms.length - 1) {
        const isBatchEnd = (i + 1) % batchSize === 0;
        const waitMs = isBatchEnd ? pauseBetweenBatch : delayMs;
        if (isBatchEnd) {
          addLog("SYSTEM", "ok", `Nghỉ ${waitMs / 1000}s sau batch ${Math.floor((i + 1) / batchSize)}...`);
        }
        await sleep(waitMs);
      }
    }

    setIsRunning(false);
    addLog("SYSTEM", "ok", "Hoàn tất crawl");
    loadStats();
  };

  const stopCrawl = () => {
    abortRef.current = true;
  };

  const formatTs = (ts: number) => {
    return new Date(ts * 1000).toLocaleDateString("vi-VN");
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
      {/* Left panel: Config */}
      <div className="lg:w-[420px] flex flex-col gap-4 overflow-y-auto shrink-0">
        {/* Paste curl */}
        <section className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
          <h2 className="text-sm font-semibold mb-2">1. Paste cURL command</h2>
          <textarea
            className="w-full h-32 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            placeholder={`curl 'https://histdatafeed.vps.com.vn/tradingview/history?symbol=ACB&resolution=1D&from=...'`}
            value={curlText}
            onChange={(e) => setCurlText(e.target.value)}
          />
          <button
            onClick={handleParse}
            className="mt-2 px-4 py-1.5 text-xs rounded bg-[var(--accent-color)] text-white hover:opacity-90 transition"
          >
            Parse
          </button>
          {parseError && <p className="text-red-400 text-xs mt-2">{parseError}</p>}
          {parsed && (
            <div className="mt-3 text-xs space-y-1 bg-[var(--bg-primary)] rounded p-3 border border-[var(--border-color)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Symbol:</span>
                <span className="font-semibold text-[var(--accent-color)]">{parsed.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Resolution:</span>
                <span>{RESOLUTION_LABELS[parsed.resolution] || parsed.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Từ:</span>
                <span>{formatTs(parsed.fromSec)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Đến:</span>
                <span>{formatTs(parsed.toSec)}</span>
              </div>
              {parsed.countback && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Countback:</span>
                  <span>{parsed.countback}</span>
                </div>
              )}
              <button
                onClick={handleFetchSingle}
                className="mt-2 w-full px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition"
              >
                Crawl mã {parsed.symbol}
              </button>
            </div>
          )}
        </section>

        {/* Auto crawl config */}
        <section className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
          <h2 className="text-sm font-semibold mb-2">2. Auto Crawl tất cả mã</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Sử dụng resolution & thời gian từ curl đã parse, crawl tất cả {allSymbols.length || "?"} mã cổ phiếu.
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-[var(--text-secondary)]">Delay giữa request (ms)</span>
              <input
                type="number"
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[var(--text-secondary)]">Batch size</span>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-[var(--text-secondary)]">Nghỉ giữa batch (ms)</span>
              <input
                type="number"
                value={pauseBetweenBatch}
                onChange={(e) => setPauseBetweenBatch(Number(e.target.value))}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1"
              />
            </label>
          </div>

          <div className="flex gap-2 mt-3">
            {!isRunning ? (
              <button
                onClick={startAutoCrawl}
                disabled={!parsed}
                className="flex-1 px-3 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶ Bắt đầu Crawl
              </button>
            ) : (
              <button
                onClick={stopCrawl}
                className="flex-1 px-3 py-2 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition"
              >
                ⏹ Dừng
              </button>
            )}
            <button
              onClick={loadStats}
              className="px-3 py-2 text-xs rounded bg-[var(--bg-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition"
            >
              Thống kê
            </button>
          </div>

          {isRunning && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                <span>
                  {progress.current}/{progress.total}
                </span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-[var(--bg-primary)] rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Stats */}
        {stats.length > 0 && (
          <section className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
            <h2 className="text-sm font-semibold mb-2">
              Thống kê ({stats.length} mã đã crawl)
            </h2>
            <div className="max-h-40 overflow-y-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-[var(--text-secondary)]">
                    <th className="text-left py-1">Mã</th>
                    <th className="text-right py-1">Bars</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(([sym, cnt]) => (
                    <tr key={sym} className="border-t border-[var(--border-color)]">
                      <td className="py-0.5">{sym}</td>
                      <td className="text-right">{cnt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Right panel: Logs */}
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold">Logs ({logs.length})</h2>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
          {logs.length === 0 && (
            <p className="text-[var(--text-secondary)] italic">Chưa có log. Paste curl và bấm crawl để bắt đầu.</p>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[var(--text-secondary)] shrink-0">{log.time}</span>
              <span
                className={`shrink-0 w-14 text-center rounded px-1 ${
                  log.status === "ok"
                    ? "text-green-400 bg-green-400/10"
                    : log.status === "error"
                    ? "text-red-400 bg-red-400/10"
                    : "text-yellow-400 bg-yellow-400/10"
                }`}
              >
                {log.status === "ok" ? "OK" : log.status === "error" ? "ERR" : "SKIP"}
              </span>
              <span className="text-[var(--accent-color)] shrink-0 w-16 text-right">{log.symbol}</span>
              <span className="text-[var(--text-primary)] truncate">{log.message}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
