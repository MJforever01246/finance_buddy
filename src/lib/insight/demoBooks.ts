import type { Position } from "@/lib/layers/types";

/** Một “sổ” danh mục — cùng mô hình cho NĐT cá nhân, khách môi giới, kịch bản giả định. */
export type DemoBook = {
  id: string;
  label: string;
  /** own = danh mục chính (đồng bộ Redux); client | scenario = demo đa danh mục */
  role: "own" | "client" | "scenario";
  positions: Position[];
  scenarioNote?: string;
};

export const DEMO_BOOKS: DemoBook[] = [
  {
    id: "own",
    label: "Danh mục của tôi",
    role: "own",
    positions: [{ symbol: "VNM", qty: 100, avgCost: 62 }],
  },
  {
    id: "client-a",
    label: "Khách · Nguyễn A",
    role: "client",
    positions: [
      { symbol: "FPT", qty: 200, avgCost: 95 },
      { symbol: "VCB", qty: 150, avgCost: 88 },
    ],
  },
  {
    id: "client-b",
    label: "Khách · Trần B",
    role: "client",
    positions: [
      { symbol: "HPG", qty: 500, avgCost: 24 },
      { symbol: "MWG", qty: 80, avgCost: 72 },
    ],
  },
  {
    id: "scenario-hpg",
    label: "Giả định · HPG −30%",
    role: "scenario",
    scenarioNote:
      "Stress: HPG giảm 30% so với giá hiện tại — xem ảnh hưởng tổng danh mục khách B.",
    positions: [
      { symbol: "HPG", qty: 500, avgCost: 24 },
      { symbol: "MWG", qty: 80, avgCost: 72 },
    ],
  },
];

export function findDemoBook(id: string): DemoBook {
  return DEMO_BOOKS.find((b) => b.id === id) ?? DEMO_BOOKS[0]!;
}

export function isDemoBookId(id: string): boolean {
  return DEMO_BOOKS.some((b) => b.id === id);
}
