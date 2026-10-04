import type { ResolverName } from "../core/types";

/** Popup → content script (top frame): report this page's status. */
export interface StatusRequest {
  type: "dnda:status";
}

/** Content script → background: show or clear the "off" badge for this tab. */
export interface BadgeRequest {
  type: "dnda:badge";
  active: boolean;
}

export type RuntimeMessage = StatusRequest | BadgeRequest;

export interface StatusResponse {
  origin: string;
  active: boolean;
  enabledGlobally: boolean;
  targetCount: number;
  durationMs: number;
  bySource: Partial<Record<ResolverName, number>>;
  adapters: string[];
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  const type = (value as { type?: unknown } | null)?.type;
  return type === "dnda:status" || type === "dnda:badge";
}
