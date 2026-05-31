/** Ngưỡng mặc định — tham chiếu rust-finance `RiskConfig` / `gate.rs`. */
export type RiskLimits = {
  /** Drawdown từ đỉnh NAV — halt khi vượt (mặc định 8%). */
  maxDrawdownPct: number;
  /** VaR 1 ngày 95% tối đa so với NAV (mặc định 2%). */
  maxDailyVarPct: number;
  /** Một mã chiếm quá % danh mục → cảnh báo (mặc định 38%). */
  maxConcentrationPct: number;
  /** Gợi ý rebalance khi vượt ngưỡng này (mặc định 25%). */
  targetMaxWeightPct: number;
  /** P/L phiên (demo) — daily loss limit (mặc định 3%). */
  maxDailyLossPct: number;
};

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxDrawdownPct: 8,
  maxDailyVarPct: 2,
  maxConcentrationPct: 38,
  targetMaxWeightPct: 25,
  maxDailyLossPct: 3,
};

export type RiskAlert = {
  code: "drawdown" | "concentration" | "var" | "correlation" | "daily_loss";
  severity: "info" | "warn" | "risk";
  title: string;
  detail: string;
};

export type RebalanceHint = {
  symbol: string;
  currentPct: number;
  targetPct: number;
  trimValue: number;
};

export type PortfolioRiskReport = {
  market: number;
  invested: number;
  pnlPct: number;
  peakEquity: number;
  drawdownPct: number;
  drawdownBreached: boolean;
  var95_1d: number | null;
  var99_1d: number | null;
  var95_1dPct: number | null;
  cvar95: number | null;
  avgCorrelation: number | null;
  riskScore: number;
  status: "ok" | "warn" | "halt";
  alerts: RiskAlert[];
  rebalanceHints: RebalanceHint[];
  componentVar: Record<string, number>;
  /** Nguồn VaR: parametric | historical | none */
  varSource: "parametric" | "historical" | "none";
};
