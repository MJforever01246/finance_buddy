/** Drawdown từ đỉnh NAV — port từ rust-finance `drawdown_monitor.rs`. */

export function drawdownFromPeak(peakEquity: number, currentEquity: number): number {
  if (peakEquity <= 0) return 0;
  return Math.max(0, ((peakEquity - currentEquity) / peakEquity) * 100);
}

export function isDrawdownBreached(
  peakEquity: number,
  currentEquity: number,
  maxDrawdownPct: number,
): boolean {
  return drawdownFromPeak(peakEquity, currentEquity) > maxDrawdownPct;
}

export class DrawdownMonitor {
  private peakEquity: number;
  private currentEquity: number;
  private maxDrawdownPct: number;

  constructor(initialEquity: number, maxDrawdownPct: number) {
    this.peakEquity = initialEquity;
    this.currentEquity = initialEquity;
    this.maxDrawdownPct = maxDrawdownPct;
  }

  updateEquity(equity: number): void {
    if (equity > this.peakEquity) this.peakEquity = equity;
    this.currentEquity = equity;
  }

  get peak(): number {
    return this.peakEquity;
  }

  drawdownPct(): number {
    return drawdownFromPeak(this.peakEquity, this.currentEquity);
  }

  isBreached(): boolean {
    return this.drawdownPct() > this.maxDrawdownPct;
  }
}
