import { isActiveFor, type Settings } from "../settings/schema";
import { fileCount, t } from "../shared/i18n";
import type { Logger } from "../shared/logger";
import type {
  OverlayPort,
  OverlayView,
  ToastHandle,
  ZoneRect,
  ZoneState,
  ZoneView,
} from "../ui/overlay/types";
import { describeAccept, dragMatchesAccept, parseAccept } from "./accept";
import type { CapturePort } from "./capture-bridge";
import { injectFiles as defaultInjectFiles, selectFiles } from "./injector";
import type { ResolverChain } from "./resolvers/chain";
import type { DropTarget, ResolverName } from "./types";

/** A drag that goes this long without a dragover event has ended outside our view. */
const WATCHDOG_MS = 1000;
/** dragleave with no related target means "left the window" unless a dragover follows quickly. */
const LEAVE_GRACE_MS = 100;
/** Small controls get a hit area at least this big (WCAG 2.2 target size, doubled). */
const MIN_HIT_SIZE = 48;
/** How long to wait for the page to visibly react after filling a hidden input. */
const REACTION_WINDOW_MS = 1500;

type SessionState = "idle" | "inert" | "active";
type DropDecision = "ours" | "native" | "none";

export interface SessionDependencies {
  win: Window;
  doc: Document;
  chain: ResolverChain;
  overlay: OverlayPort;
  capture: CapturePort;
  getSettings: () => Settings;
  /** Origin of the top-level page, used for the per-site on/off switch. */
  topOrigin: string;
  getShadowRoot: (element: Element) => ShadowRoot | null;
  logger: Logger;
  injectFiles?: (input: HTMLInputElement, files: readonly File[]) => void;
  watchForReaction?: (doc: Document, timeoutMs: number) => Promise<boolean>;
  prefersReducedMotion?: () => boolean;
}

export interface ResolveSummary {
  targetCount: number;
  durationMs: number;
  bySource: Partial<Record<ResolverName, number>>;
}

/**
 * Resolves after `timeoutMs`: true if the page changed its DOM in the meantime.
 * Used as a cheap signal that a site noticed files we put into a hidden input.
 */
export function watchForPageReaction(doc: Document, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const target = doc.body ?? doc.documentElement;
    const observer = new MutationObserver(() => finish(true));
    const timer = setTimeout(() => finish(false), timeoutMs);
    function finish(reacted: boolean) {
      observer.disconnect();
      clearTimeout(timer);
      resolve(reacted);
    }
    observer.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
}

function hasFiles(event: DragEvent): boolean {
  return [...(event.dataTransfer?.types ?? [])].includes("Files");
}

function expand(rect: ZoneRect): ZoneRect {
  const width = Math.max(rect.width, MIN_HIT_SIZE);
  const height = Math.max(rect.height, MIN_HIT_SIZE);
  return {
    x: rect.x - (width - rect.width) / 2,
    y: rect.y - (height - rect.height) / 2,
    width,
    height,
  };
}

function contains(rect: ZoneRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/**
 * One drag-and-drop interaction per frame, as a small state machine:
 *
 *   idle ──dragenter(Files)──▶ active (targets found) or inert (none / turned off)
 *   active ──drop on zone──▶ deliver files ──▶ idle
 *   any ──leave window / drop elsewhere / watchdog──▶ idle
 *
 * Nothing is scanned or observed until files are dragged into the window.
 */
export class DragSession {
  private state: SessionState = "idle";
  private targets: DropTarget[] = [];
  private rects = new Map<string, ZoneRect>();
  private radii = new Map<string, string>();
  private hovered: DropTarget | null = null;
  private decision: DropDecision = "none";
  private dragTypes: string[] = [];
  private draggedCount = 0;
  private leaveTimer: ReturnType<typeof setTimeout> | undefined;
  private watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  private frame = 0;
  private lastSummary: ResolveSummary | null = null;
  private readonly injectFiles: NonNullable<SessionDependencies["injectFiles"]>;
  private readonly watchForReaction: NonNullable<SessionDependencies["watchForReaction"]>;

  constructor(private readonly deps: SessionDependencies) {
    this.injectFiles = deps.injectFiles ?? defaultInjectFiles;
    this.watchForReaction = deps.watchForReaction ?? watchForPageReaction;
  }

  /**
   * Starts listening for drags on the window.
   *
   * @returns A function that stops listening and clears the overlay
   */
  attach(): () => void {
    const { win } = this.deps;
    const listeners: [string, (event: DragEvent) => void, boolean][] = [
      ["dragenter", (event) => this.onDragEnter(event), true],
      ["dragover", (event) => this.onDragOverCapture(event), true],
      ["dragover", (event) => this.onDragOverBubble(event), false],
      ["dragleave", (event) => this.onDragLeave(event), true],
      ["drop", (event) => this.onDropCapture(event), true],
      ["drop", () => this.end(), false],
    ];
    for (const [type, listener, capture] of listeners) {
      win.addEventListener(type, listener as EventListener, capture);
    }
    return () => {
      for (const [type, listener, capture] of listeners) {
        win.removeEventListener(type, listener as EventListener, capture);
      }
      this.end();
    };
  }

  /** Resolves targets on demand (for the popup), outside of any drag. */
  inspect(): ResolveSummary {
    this.resolveTargets();
    const summary = this.lastSummary!;
    if (this.state === "idle") this.targets = [];
    return summary;
  }

  /** Last resolve summary, for the diagnostic report. */
  get summary(): ResolveSummary | null {
    return this.lastSummary;
  }

  private onDragEnter(event: DragEvent): void {
    if (!hasFiles(event)) return;
    this.touch();
    if (this.state === "idle") this.begin(event);
  }

  private onDragOverCapture(event: DragEvent): void {
    if (!hasFiles(event)) return;
    if (this.state === "idle") this.begin(event);
    this.touch();
    // Assume the page handles this event. The bubble-phase listener corrects this
    // if it runs; if the page stopped propagation, the page owns the drop.
    this.decision = "native";
  }

  private onDragOverBubble(event: DragEvent): void {
    if (this.state !== "active" || !hasFiles(event)) return;
    const forced = this.isForced(event);
    if (event.defaultPrevented && !forced) {
      this.decision = "native";
      this.hovered = null;
      this.render();
      return;
    }
    const hit = this.hitTest(event.clientX, event.clientY);
    this.hovered = hit;
    // Cancelling dragover is what allows a drop. With no usable zone we still cancel
    // it but set dropEffect "none", so a stray drop can't navigate away from a form.
    event.preventDefault();
    const usable = hit !== null && !this.isRejected(hit);
    if (event.dataTransfer) event.dataTransfer.dropEffect = usable ? "copy" : "none";
    this.decision = usable ? "ours" : "none";
    this.render();
  }

  private onDragLeave(event: DragEvent): void {
    if (this.state === "idle" || event.relatedTarget !== null) return;
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(() => this.end(), LEAVE_GRACE_MS);
  }

  private onDropCapture(event: DragEvent): void {
    if (this.state !== "active") return;
    const forced = this.isForced(event);
    if (this.decision === "native" && !forced) return;
    this.refreshRects();
    const hit = this.hitTest(event.clientX, event.clientY);
    if (!hit || this.isRejected(hit)) {
      event.preventDefault();
      this.end();
      return;
    }
    // From here the drop is ours: stop the page from also handling it.
    event.preventDefault();
    event.stopImmediatePropagation();
    const files = [...(event.dataTransfer?.files ?? [])];
    this.end();
    void this.deliver(hit, files);
  }

  private begin(event: DragEvent): void {
    const settings = this.deps.getSettings();
    if (!isActiveFor(settings, this.deps.topOrigin)) {
      this.state = "inert";
      return;
    }
    const items = [...(event.dataTransfer?.items ?? [])].filter((item) => item.kind === "file");
    this.dragTypes = items.map((item) => item.type);
    this.draggedCount = items.length;
    this.resolveTargets();
    if (this.targets.length === 0) {
      this.state = "inert";
      return;
    }
    this.state = "active";
    this.deps.overlay.setTheme({
      accent: settings.accentColor,
      reduceMotion: this.shouldReduceMotion(settings),
    });
    this.loop();
  }

  private resolveTargets(): void {
    const { doc, win, chain, getShadowRoot, logger } = this.deps;
    const settings = this.deps.getSettings();
    const result = chain.resolve({
      document: doc,
      settings,
      url: win.location.href,
      getShadowRoot: settings.closedShadowRoots ? getShadowRoot : (element) => element.shadowRoot,
    });
    this.targets = result.targets;
    this.radii.clear();
    for (const target of this.targets) {
      const style = win.getComputedStyle(target.anchor);
      this.radii.set(target.id, target.fullPage ? "0" : style.borderRadius || "4px");
    }
    const bySource: ResolveSummary["bySource"] = {};
    for (const target of this.targets) bySource[target.source] = (bySource[target.source] ?? 0) + 1;
    this.lastSummary = {
      targetCount: this.targets.length,
      durationMs: Math.round(result.durationMs * 10) / 10,
      bySource,
    };
    logger.debug("resolved upload targets", { ...this.lastSummary });
  }

  private loop = (): void => {
    if (this.state !== "active") return;
    this.refreshRects();
    this.render();
    this.frame = this.deps.win.requestAnimationFrame(this.loop);
  };

  private refreshRects(): void {
    const { win } = this.deps;
    this.targets = this.targets.filter((target) => target.anchor.isConnected);
    for (const target of this.targets) {
      if (target.fullPage) {
        this.rects.set(target.id, { x: 0, y: 0, width: win.innerWidth, height: win.innerHeight });
        continue;
      }
      const rect = target.anchor.getBoundingClientRect();
      this.rects.set(target.id, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }
  }

  private hitTest(x: number, y: number): DropTarget | null {
    let best: DropTarget | null = null;
    let bestArea = Infinity;
    let fullPage: DropTarget | null = null;
    for (const target of this.targets) {
      if (target.fullPage) {
        fullPage = target;
        continue;
      }
      const rect = this.rects.get(target.id);
      if (!rect || rect.width === 0 || rect.height === 0) continue;
      const hitRect = expand(rect);
      if (!contains(hitRect, x, y)) continue;
      // The smallest zone under the pointer is the most specific one.
      const area = hitRect.width * hitRect.height;
      if (area < bestArea) {
        best = target;
        bestArea = area;
      }
    }
    return best ?? fullPage;
  }

  private isRejected(target: DropTarget): boolean {
    if (!this.deps.getSettings().strictAccept) return false;
    return dragMatchesAccept(this.dragTypes, target.accept) === "rejected";
  }

  private zoneState(target: DropTarget): ZoneState {
    if (this.isRejected(target)) return "rejected";
    return target === this.hovered ? "active" : "idle";
  }

  private render(): void {
    if (this.state !== "active") return;
    const view: OverlayView = { zones: [], offscreenAbove: 0, offscreenBelow: 0 };
    const viewportHeight = this.deps.win.innerHeight;
    for (const target of this.targets) {
      const rect = this.rects.get(target.id);
      if (!rect || rect.width === 0 || rect.height === 0) continue;
      if (rect.y + rect.height < 0) {
        view.offscreenAbove += 1;
        continue;
      }
      if (rect.y > viewportHeight) {
        view.offscreenBelow += 1;
        continue;
      }
      view.zones.push(this.zoneView(target, target.fullPage ? rect : expand(rect)));
    }
    this.deps.overlay.showZones(view);
  }

  private zoneView(target: DropTarget, rect: ZoneRect): ZoneView {
    const state = this.zoneState(target);
    const accepts = describeAccept(target.accept);
    const acceptsText = accepts ? t("zoneAccepts", accepts) : "";
    let label = t("zoneDrop");
    let detail = [target.label, acceptsText].filter(Boolean).join(" · ");
    if (state === "rejected") {
      label = t("zoneNotAccepted");
      detail = acceptsText;
    } else if (target.fullPage) {
      label = t("zonePageWide", target.label);
      detail = acceptsText;
    } else if (state === "active") {
      detail = [target.label, fileCount(Math.max(this.draggedCount, 1))].join(" · ");
    } else if (target.heuristic) {
      label = t("zoneTry");
      detail = target.label;
    }
    return {
      id: target.id,
      rect,
      radius: this.radii.get(target.id) ?? "4px",
      state,
      label,
      detail,
      heuristic: target.heuristic,
      fullPage: !!target.fullPage,
    };
  }

  private isForced(event: DragEvent): boolean {
    const modifier = this.deps.getSettings().forceModifier;
    if (modifier === "Alt") return event.altKey;
    if (modifier === "Shift") return event.shiftKey;
    return false;
  }

  private shouldReduceMotion(settings: Settings): boolean {
    if (settings.reducedMotion === "reduce") return true;
    if (settings.reducedMotion === "allow") return false;
    return this.deps.prefersReducedMotion?.() ?? false;
  }

  private touch(): void {
    clearTimeout(this.leaveTimer);
    clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => this.end(), WATCHDOG_MS);
  }

  private end(): void {
    if (this.state === "idle") return;
    clearTimeout(this.leaveTimer);
    clearTimeout(this.watchdogTimer);
    if (this.frame) this.deps.win.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.state = "idle";
    this.targets = [];
    this.rects.clear();
    this.hovered = null;
    this.decision = "none";
    this.deps.overlay.clearZones();
  }

  /** Hands dropped files to the target. Public for the welcome page demo and tests. */
  async deliver(target: DropTarget, files: File[]): Promise<void> {
    if (files.length === 0) return;
    this.deps.logger.debug("drop", {
      source: target.source,
      kind: target.kind,
      files: files.length,
    });
    if (target.kind === "trigger") {
      await this.deliverToTrigger(target, files);
      return;
    }
    const settings = this.deps.getSettings();
    const selection = selectFiles(files, target.accept, target.multiple, settings.strictAccept);
    if (selection.accepted.length === 0) {
      this.toastNotAccepted(target, describeAccept(target.accept));
      return;
    }
    if (selection.tooMany) {
      this.deps.overlay.toast({
        tone: "info",
        message: t("toastOneFileOnly", target.label),
        durationMs: 0,
        actions: [
          {
            label: t("actionUseFirst"),
            run: () =>
              this.fillInput(target, selection.accepted.slice(0, 1), selection.rejected.length),
          },
          { label: t("actionCancel"), run: () => undefined, secondary: true },
        ],
      });
      return;
    }
    this.fillInput(target, selection.accepted, selection.rejected.length);
  }

  private fillInput(target: DropTarget, files: File[], rejectedCount: number): void {
    const input = target.input!;
    this.injectFiles(input, files);
    const toast = this.toastAdded(target.label, files.length, rejectedCount);
    // A visible native input shows the file name itself. For hidden inputs the page
    // is responsible for feedback; if it shows none, offer the real picker.
    if (target.anchor === input) return;
    void this.watchForReaction(this.deps.doc, REACTION_WINDOW_MS).then((reacted) => {
      if (reacted) return;
      toast.update({
        tone: "info",
        detail: t("toastNoReaction"),
        durationMs: 0,
        actions: [{ label: t("actionOpenPicker"), run: () => input.click() }],
      });
    });
  }

  private async deliverToTrigger(target: DropTarget, files: File[]): Promise<void> {
    const strict = this.deps.getSettings().strictAccept;
    const outcome = await this.deps.capture.capture(target.anchor, files, strict);
    this.deps.logger.debug("trigger capture", { status: outcome.status });
    const clickForMe = {
      label: t("actionClickForMe"),
      run: () => (target.anchor as HTMLElement).click(),
    };
    switch (outcome.status) {
      case "captured": {
        const toast = this.toastAdded(target.label, outcome.accepted, outcome.rejected);
        if (outcome.truncated) toast.update({ detail: t("toastOneFileOnly", target.label) });
        return;
      }
      case "rejected":
        this.toastNotAccepted(
          target,
          describeAccept(parseAccept(outcome.acceptAttribute)),
          clickForMe,
        );
        return;
      case "timeout":
        this.deps.overlay.toast({
          tone: "error",
          message: t("toastTriggerFailed"),
          actions: [clickForMe],
        });
        return;
      case "unavailable":
        this.deps.overlay.toast({
          tone: "error",
          message: t("toastTriggerUnavailable"),
          actions: [clickForMe],
        });
    }
  }

  private toastAdded(label: string, accepted: number, rejected: number): ToastHandle {
    return this.deps.overlay.toast({
      tone: "success",
      message: t("toastAdded", [fileCount(accepted), label]),
      detail: rejected > 0 ? t("toastSkipped", fileCount(rejected)) : undefined,
    });
  }

  private toastNotAccepted(
    target: DropTarget,
    acceptedTypes: string,
    action = { label: t("actionOpenPicker"), run: () => target.input?.click() },
  ): void {
    this.deps.overlay.toast({
      tone: "error",
      message: t("toastNoneAccepted"),
      detail: acceptedTypes ? t("toastAcceptedTypes", acceptedTypes) : undefined,
      actions: [action],
    });
  }
}
