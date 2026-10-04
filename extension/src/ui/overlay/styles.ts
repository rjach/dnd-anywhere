/**
 * Overlay CSS, injected into a closed shadow root so page styles can't reach it.
 * Chips and toasts are dark with a light outline so they read on both light and
 * dark pages (3:1 non-text contrast either way).
 */
export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.root {
  --accent: #2563eb;
  --ink: #0b1220;
  --ink-2: #1f2937;
  --paper: #ffffff;
  --muted: #6b7280;
  --ok: #16a34a;
  --err: #dc2626;
  --ring: rgba(255, 255, 255, 0.85);
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  position: fixed;
  inset: 0;
  pointer-events: none;
  font: 500 13px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--paper);
  -webkit-font-smoothing: antialiased;
}
.zone {
  position: fixed;
  left: 0;
  top: 0;
  border: 2px dashed var(--accent);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  box-shadow: 0 0 0 1px var(--ring) inset;
  transition: background-color 120ms var(--ease), border-color 120ms var(--ease), box-shadow 120ms var(--ease);
}
.zone[data-heuristic] { border-style: dotted; }
.zone[data-state="active"] {
  border-style: solid;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  box-shadow: 0 0 0 1px var(--ring) inset, 0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent);
}
.zone[data-state="rejected"] {
  border-color: var(--muted);
  background: rgba(107, 114, 128, 0.1);
}
.zone[data-full] {
  border-width: 3px;
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}
.chip {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: min(320px, calc(100vw - 24px));
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--ink);
  box-shadow: 0 0 0 1px var(--ring), 0 4px 14px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
.chip[data-outside="above"] { top: -6px; transform: translate(-50%, -100%); }
.chip[data-outside="right"] { left: calc(100% + 8px); top: 50%; transform: translateY(-50%); text-align: left; }
.zone[data-state="active"] .chip { background: var(--accent); }
.zone[data-state="rejected"] .chip { background: var(--ink-2); color: #e5e7eb; }
.chip small { display: block; font-weight: 400; font-size: 11px; opacity: 0.85; }
.edge {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--ink);
  box-shadow: 0 0 0 1px var(--ring), 0 4px 14px rgba(0, 0, 0, 0.25);
}
.edge[data-edge="top"] { top: 10px; }
.edge[data-edge="bottom"] { bottom: 10px; }
.toasts {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: min(380px, calc(100vw - 32px));
}
.toast {
  pointer-events: auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 4px 10px;
  align-items: start;
  width: 100%;
  padding: 12px 12px 12px 14px;
  border-radius: 12px;
  background: var(--ink);
  box-shadow: 0 0 0 1px var(--ring), 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: toast-in 180ms var(--ease);
}
.dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--accent); }
.toast[data-tone="success"] .dot { background: var(--ok); }
.toast[data-tone="error"] .dot { background: var(--err); }
.msg { font-weight: 600; word-break: break-word; }
.detail { grid-column: 2; color: #d1d5db; font-weight: 400; }
.actions { grid-column: 2; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
button {
  all: unset;
  cursor: pointer;
  font: inherit;
  border-radius: 8px;
}
button:focus-visible { outline: 2px solid var(--paper); outline-offset: 2px; }
.action {
  padding: 5px 10px;
  background: var(--paper);
  color: var(--ink);
  font-weight: 600;
}
.action:hover { background: #e5e7eb; }
.action[data-secondary] { background: transparent; color: var(--paper); box-shadow: 0 0 0 1px rgba(255,255,255,0.4) inset; }
.close {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: #9ca3af;
  font-size: 18px;
  line-height: 1;
}
.close:hover { color: var(--paper); }
.sr-only {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap;
}
@keyframes toast-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
.root[data-reduce-motion] *, .root[data-reduce-motion] { transition: none !important; animation: none !important; }
`;
