/**
 * Messages between the isolated content script and the MAIN-world capture shim.
 * They travel over `window.postMessage`, which both worlds share and which can
 * structured-clone `File` objects.
 *
 * Sequence: isolated → `arm` (files) → shim replies `armed` → isolated clicks the
 * trigger → page code calls `input.click()` → shim injects files and replies
 * `captured` (or `rejected`). If nothing happens in time, isolated sends `disarm`.
 */
export const CAPTURE_CHANNEL = "dnd-anywhere:capture";

export interface ArmMessage {
  channel: typeof CAPTURE_CHANNEL;
  type: "arm";
  nonce: string;
  files: File[];
  strictAccept: boolean;
  timeoutMs: number;
}

export interface ArmedMessage {
  channel: typeof CAPTURE_CHANNEL;
  type: "armed";
  nonce: string;
}

export interface CapturedMessage {
  channel: typeof CAPTURE_CHANNEL;
  type: "captured";
  nonce: string;
  accepted: number;
  rejected: number;
  /** The input took one file but more were dropped; only the first was used. */
  truncated: boolean;
  acceptAttribute: string;
}

export interface RejectedMessage {
  channel: typeof CAPTURE_CHANNEL;
  type: "rejected";
  nonce: string;
  acceptAttribute: string;
}

export interface DisarmMessage {
  channel: typeof CAPTURE_CHANNEL;
  type: "disarm";
  nonce: string;
}

export type CaptureMessage =
  ArmMessage | ArmedMessage | CapturedMessage | RejectedMessage | DisarmMessage;

/** Narrow an unknown `message` event payload to our protocol. */
export function isCaptureMessage(data: unknown): data is CaptureMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { channel?: unknown }).channel === CAPTURE_CHANNEL &&
    typeof (data as { nonce?: unknown }).nonce === "string"
  );
}
