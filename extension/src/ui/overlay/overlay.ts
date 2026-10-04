import { t } from "../../shared/i18n";
import { OVERLAY_CSS } from "./styles";
import type {
  OverlayPort,
  OverlayTheme,
  OverlayView,
  ToastHandle,
  ToastSpec,
  ZoneView,
} from "./types";

const HOST_TAG = "dnd-anywhere-overlay";
const DEFAULT_TOAST_MS = 4000;
const ERROR_TOAST_MS = 8000;
/** Zones smaller than this put their chip above the element instead of on it. */
const CHIP_INSIDE_MIN_WIDTH = 150;
const CHIP_INSIDE_MIN_HEIGHT = 34;
/** Room needed to the right of a small zone to put its chip there instead of above. */
const CHIP_SIDE_SPACE = 240;

/** Host styles that page CSS (including `[popover]` UA styles) must not override. */
const HOST_STYLE: Record<string, string> = {
  all: "initial",
  position: "fixed",
  inset: "0",
  width: "100vw",
  height: "100vh",
  margin: "0",
  padding: "0",
  border: "0",
  background: "transparent",
  overflow: "visible",
  "z-index": "2147483647",
  "pointer-events": "none",
  display: "block",
};

/**
 * Draws drop zones and toasts inside a closed shadow root. The host is shown as a
 * manual popover when supported, which puts it in the top layer above the page's
 * own modal dialogs. Everything is `pointer-events: none` except toasts, so the
 * overlay never steals drag events from the page; hit testing happens in the session.
 */
export class Overlay implements OverlayPort {
  private host: HTMLElement | null = null;
  private root: HTMLDivElement | null = null;
  private zoneLayer: HTMLDivElement | null = null;
  private toastLayer: HTMLDivElement | null = null;
  private zoneNodes = new Map<string, HTMLDivElement>();
  private edgeNodes = new Map<"top" | "bottom", HTMLDivElement>();
  private theme: OverlayTheme = { accent: "#2563eb", reduceMotion: false };

  constructor(private readonly doc: Document) {}

  setTheme(theme: OverlayTheme): void {
    this.theme = theme;
    this.applyTheme();
  }

  showZones(view: OverlayView): void {
    this.mount();
    const seen = new Set<string>();
    for (const zone of view.zones) {
      seen.add(zone.id);
      this.renderZone(zone);
    }
    for (const [id, node] of this.zoneNodes) {
      if (seen.has(id)) continue;
      node.remove();
      this.zoneNodes.delete(id);
    }
    this.renderEdge("top", view.offscreenAbove, "offscreenAbove");
    this.renderEdge("bottom", view.offscreenBelow, "offscreenBelow");
  }

  clearZones(): void {
    for (const node of this.zoneNodes.values()) node.remove();
    for (const node of this.edgeNodes.values()) node.remove();
    this.zoneNodes.clear();
    this.edgeNodes.clear();
    this.unmountIfIdle();
  }

  toast(spec: ToastSpec): ToastHandle {
    this.mount();
    const node = this.doc.createElement("div");
    node.className = "toast";
    let current = spec;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;

    const dismiss = () => {
      clearTimeout(timer);
      node.remove();
      this.unmountIfIdle();
    };
    const schedule = () => {
      clearTimeout(timer);
      const duration =
        current.durationMs ?? (current.tone === "error" ? ERROR_TOAST_MS : DEFAULT_TOAST_MS);
      if (duration > 0 && !paused) timer = setTimeout(dismiss, duration);
    };
    const render = () => {
      node.dataset.tone = current.tone;
      node.replaceChildren(...this.buildToastContent(current, dismiss));
    };

    node.addEventListener("pointerenter", () => {
      paused = true;
      clearTimeout(timer);
    });
    node.addEventListener("pointerleave", () => {
      paused = false;
      schedule();
    });
    node.addEventListener("focusin", () => {
      paused = true;
      clearTimeout(timer);
    });

    render();
    this.toastLayer!.append(node);
    schedule();
    return {
      update: (patch) => {
        if (!node.isConnected) return;
        current = { ...current, ...patch };
        render();
        schedule();
      },
      dismiss,
    };
  }

  private buildToastContent(spec: ToastSpec, dismiss: () => void): Node[] {
    const dot = this.el("span", "dot");
    const message = this.el("div", "msg", spec.message);
    const close = this.el("button", "close", "×");
    close.setAttribute("aria-label", t("actionDismiss"));
    close.addEventListener("click", dismiss);
    const nodes: Node[] = [dot, message, close];
    if (spec.detail) nodes.push(this.el("div", "detail", spec.detail));
    if (spec.actions?.length) {
      const actions = this.el("div", "actions");
      for (const action of spec.actions) {
        const button = this.el("button", "action", action.label);
        if (action.secondary) button.dataset.secondary = "";
        button.addEventListener("click", () => {
          dismiss();
          action.run();
        });
        actions.append(button);
      }
      nodes.push(actions);
    }
    return nodes;
  }

  private renderZone(zone: ZoneView): void {
    let node = this.zoneNodes.get(zone.id);
    if (!node) {
      node = this.el("div", "zone");
      node.append(this.el("div", "chip"));
      this.zoneLayer!.append(node);
      this.zoneNodes.set(zone.id, node);
    }
    const { rect } = zone;
    node.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
    node.style.borderRadius = zone.radius;
    node.dataset.state = zone.state;
    toggleData(node, "heuristic", zone.heuristic);
    toggleData(node, "full", zone.fullPage);

    const chip = node.firstElementChild as HTMLDivElement;
    const outside =
      !zone.fullPage &&
      (rect.width < CHIP_INSIDE_MIN_WIDTH || rect.height < CHIP_INSIDE_MIN_HEIGHT);
    // Beside the zone covers less of the page's own labels than above it.
    const viewportWidth = this.doc.defaultView?.innerWidth ?? 0;
    const side = rect.x + rect.width + CHIP_SIDE_SPACE <= viewportWidth ? "right" : "above";
    if (outside) chip.dataset.outside = side;
    else delete chip.dataset.outside;
    const text = `${zone.label}\u0000${zone.detail}`;
    if (chip.dataset.text !== text) {
      chip.dataset.text = text;
      chip.replaceChildren(zone.label);
      if (zone.detail) chip.append(this.el("small", "", zone.detail));
    }
  }

  private renderEdge(
    edge: "top" | "bottom",
    count: number,
    key: "offscreenAbove" | "offscreenBelow",
  ): void {
    let node = this.edgeNodes.get(edge);
    if (count === 0) {
      node?.remove();
      this.edgeNodes.delete(edge);
      return;
    }
    if (!node) {
      node = this.el("div", "edge");
      node.dataset.edge = edge;
      this.zoneLayer!.append(node);
      this.edgeNodes.set(edge, node);
    }
    node.textContent = `${edge === "top" ? "↑" : "↓"} ${t(key, String(count))}`;
  }

  private mount(): void {
    if (this.host?.isConnected) return;
    const host = this.doc.createElement(HOST_TAG);
    for (const [property, value] of Object.entries(HOST_STYLE)) {
      host.style.setProperty(property, value, "important");
    }
    const shadow = host.attachShadow({ mode: "closed" });
    const style = this.doc.createElement("style");
    style.textContent = OVERLAY_CSS;
    const root = this.el("div", "root");
    const zoneLayer = this.el("div", "zones");
    const toastLayer = this.el("div", "toasts");
    toastLayer.setAttribute("role", "status");
    toastLayer.setAttribute("aria-live", "polite");
    root.append(zoneLayer, toastLayer);
    shadow.append(style, root);
    (this.doc.documentElement ?? this.doc.body).append(host);
    this.showInTopLayer(host);
    this.host = host;
    this.root = root;
    this.zoneLayer = zoneLayer;
    this.toastLayer = toastLayer;
    this.applyTheme();
  }

  private showInTopLayer(host: HTMLElement): void {
    if (typeof host.showPopover !== "function") return;
    try {
      host.popover = "manual";
      host.showPopover();
    } catch {
      // Older engines or a page that blocks popovers: a max z-index is the fallback.
    }
  }

  private unmountIfIdle(): void {
    if (!this.host) return;
    if (this.zoneNodes.size > 0 || (this.toastLayer?.childElementCount ?? 0) > 0) return;
    this.host.remove();
    this.host = null;
    this.root = null;
    this.zoneLayer = null;
    this.toastLayer = null;
    this.edgeNodes.clear();
  }

  private applyTheme(): void {
    if (!this.root) return;
    this.root.style.setProperty("--accent", this.theme.accent);
    toggleData(this.root, "reduceMotion", this.theme.reduceMotion);
  }

  private el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const node = this.doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
}

function toggleData(node: HTMLElement, key: string, on: boolean): void {
  if (on) node.dataset[key] = "";
  else delete node.dataset[key];
}
