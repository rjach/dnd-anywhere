export type ZoneState = "idle" | "active" | "rejected";

export interface ZoneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ZoneView {
  id: string;
  rect: ZoneRect;
  /** CSS border-radius copied from the page element so the outline hugs it. */
  radius: string;
  state: ZoneState;
  label: string;
  detail: string;
  heuristic: boolean;
  fullPage: boolean;
}

export interface OverlayView {
  zones: ZoneView[];
  offscreenAbove: number;
  offscreenBelow: number;
}

export interface OverlayTheme {
  accent: string;
  reduceMotion: boolean;
}

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  run: () => void;
  secondary?: boolean;
}

export interface ToastSpec {
  tone: ToastTone;
  message: string;
  detail?: string;
  actions?: ToastAction[];
  /** Auto-dismiss delay. 0 keeps the toast until dismissed. */
  durationMs?: number;
}

export interface ToastHandle {
  update(patch: Partial<ToastSpec>): void;
  dismiss(): void;
}

/** What the drag session needs from the UI. Lets the session be tested with a fake. */
export interface OverlayPort {
  setTheme(theme: OverlayTheme): void;
  showZones(view: OverlayView): void;
  clearZones(): void;
  toast(spec: ToastSpec): ToastHandle;
}
