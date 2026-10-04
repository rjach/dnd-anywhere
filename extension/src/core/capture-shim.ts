import {
  CAPTURE_CHANNEL,
  isCaptureMessage,
  type ArmMessage,
  type CaptureMessage,
} from "../shared/capture-protocol";
import { parseAccept } from "./accept";
import { selectFiles } from "./injector";

interface ArmedState {
  nonce: string;
  files: File[];
  strictAccept: boolean;
  expiresAt: number;
}

/**
 * Installs the MAIN-world capture shim. It wraps `HTMLElement.prototype.click` and
 * `HTMLInputElement.prototype.showPicker`. Both pass straight through to the
 * originals unless the isolated script has armed a capture (for at most
 * `timeoutMs`, right after a user drop). While armed, the first attempt to open a
 * file picker is answered with the dropped files instead of a dialog.
 *
 * Wrappers are Proxies, so `name`, `length` and `toString()` look native and pages
 * that inspect them keep working.
 *
 * @param win - The page window (MAIN world)
 * @returns A function that removes the shim (used by tests)
 */
export function installCaptureShim(win: Window & typeof globalThis): () => void {
  let armed: ArmedState | null = null;
  const elementProto = win.HTMLElement.prototype;
  const inputProto = win.HTMLInputElement.prototype;
  const originalClick = elementProto.click;
  const originalShowPicker = inputProto.showPicker;

  const post = (message: CaptureMessage) => win.postMessage(message, "*");

  const deliver = (input: HTMLInputElement, state: ArmedState) => {
    const selection = selectFiles(
      state.files,
      parseAccept(input.getAttribute("accept")),
      input.multiple,
      state.strictAccept,
    );
    const acceptAttribute = input.getAttribute("accept") ?? "";
    if (selection.accepted.length === 0) {
      post({ channel: CAPTURE_CHANNEL, type: "rejected", nonce: state.nonce, acceptAttribute });
      return;
    }
    const chosen = selection.tooMany ? selection.accepted.slice(0, 1) : selection.accepted;
    const transfer = new win.DataTransfer();
    for (const file of chosen) transfer.items.add(file);
    input.files = transfer.files;
    // A native picker reports its result asynchronously. Do the same, so page code
    // that attaches its change listener right after calling click() still sees it.
    win.setTimeout(() => {
      input.dispatchEvent(new win.Event("input", { bubbles: true, composed: true }));
      input.dispatchEvent(new win.Event("change", { bubbles: true }));
      post({
        channel: CAPTURE_CHANNEL,
        type: "captured",
        nonce: state.nonce,
        accepted: chosen.length,
        rejected: selection.rejected.length,
        truncated: selection.tooMany,
        acceptAttribute,
      });
    }, 0);
  };

  /** Returns true when the picker request was consumed by an armed capture. */
  const tryCapture = (target: unknown): boolean => {
    if (!armed || !(target instanceof win.HTMLInputElement) || target.type !== "file") return false;
    const state = armed;
    armed = null;
    if (Date.now() > state.expiresAt) return false;
    deliver(target, state);
    return true;
  };

  elementProto.click = new Proxy(originalClick, {
    apply(original, thisArg, args) {
      if (tryCapture(thisArg)) return undefined;
      return Reflect.apply(original, thisArg, args);
    },
  });
  if (originalShowPicker) {
    inputProto.showPicker = new Proxy(originalShowPicker, {
      apply(original, thisArg, args) {
        if (tryCapture(thisArg)) return undefined;
        return Reflect.apply(original, thisArg, args);
      },
    });
  }

  const onMessage = (event: MessageEvent) => {
    if (event.source !== win || !isCaptureMessage(event.data)) return;
    const message = event.data;
    if (message.type === "arm" && isValidArm(message, win)) {
      armed = {
        nonce: message.nonce,
        files: message.files,
        strictAccept: message.strictAccept,
        expiresAt: Date.now() + message.timeoutMs,
      };
      post({ channel: CAPTURE_CHANNEL, type: "armed", nonce: message.nonce });
    } else if (message.type === "disarm" && armed?.nonce === message.nonce) {
      armed = null;
    }
  };
  win.addEventListener("message", onMessage);

  return () => {
    win.removeEventListener("message", onMessage);
    elementProto.click = originalClick;
    if (originalShowPicker) inputProto.showPicker = originalShowPicker;
  };
}

/** Upper bound on how long a page may take to open its picker after our click. */
const MAX_ARM_MS = 5000;

function isValidArm(message: ArmMessage, win: Window & typeof globalThis): boolean {
  return (
    Array.isArray(message.files) &&
    message.files.length > 0 &&
    message.files.every((file) => file instanceof win.File) &&
    typeof message.timeoutMs === "number" &&
    message.timeoutMs > 0 &&
    message.timeoutMs <= MAX_ARM_MS
  );
}
