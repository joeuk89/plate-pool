import type { Changes } from "./changes.js";
import type { ReverseRequest } from "./reverse.js";
import type { Display } from "./weight.js";

export type CurrentLoading = Pick<ReverseRequest, "positions" | "hardware" | "hardwareOn">;

export interface TargetRequest {
  implement: string;
  target: string;
  pair?: boolean;
  current?: CurrentLoading;
}

export interface LoadRequest {
  targets: TargetRequest[];
  /** A fixed hardware choice per implement id: a hardware id from its options, or "none". */
  hardware?: Record<string, string>;
  uneven?: boolean;
}

export interface LoadedPosition {
  name: string;
  plates: number[];
  ids: string[];
}

export interface Loading {
  total: Display;
  hardware: { id: string; count: number }[];
  positions: LoadedPosition[];
  uneven: boolean;
  heavier?: string;
  changes?: Changes;
}

export interface LoadResult {
  implement: string;
  pair?: boolean;
  target: Display;
  exact: boolean;
  loading?: Loading;
  recommended?: "below" | "above";
  below?: Loading;
  above?: Loading;
  refused?: { limit: Display };
  alternatives: Loading[];
  warnings: string[];
  unverified: string[];
}

export interface Leftover {
  plates: Record<string, number>;
  hardware: Record<string, number>;
}

export interface LoadResponse {
  results: LoadResult[];
  leftover: Leftover;
}
