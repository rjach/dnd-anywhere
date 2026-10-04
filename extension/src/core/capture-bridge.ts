import {
  CAPTURE_CHANNEL,
  isCaptureMessage,
  type CaptureMessage,
  type CapturedMessage,
  type RejectedMessage,
} from "../shared/capture-protocol";

/** How long a page gets to open its picker after we click the trigger. */
export const CAPTURE_TIMEOUT_MS = 1000;
/** The shim answers `arm` within a task; longer means it isn't installed in this frame. */
const HANDSHAKE_TIMEOUT_MS = 250;

export type CaptureOutcome =
  | {
      status: "captured";
      accepted: number;
      rejected: number;
      truncated: boolean;
      acceptAttribute: string;
    }
  | { status: "rejected"; acceptAttribute: string }
  | { status: "timeout" }
  | { status: "unavailable" };

export interface CapturePort {
  capture(trigger: Element, files: File[], strictAccept: boolean): Promise<CaptureOutcome>;
}

/**
 * Isolated-world side of the capture protocol (see shared/capture-protocol.ts).
 * Arms the MAIN-world shim, clicks the trigger, and waits for the shim to report.
 */
export class CaptureBridge implements CapturePort {
  constructor(
    private readonly win: Window,
    private readonly createNonce: () => string = () => crypto.randomUUID(),
    private readonly timeoutMs = CAPTURE_TIMEOUT_MS,
  ) {}

  async capture(trigger: Element, files: File[], strictAccept: boolean): Promise<CaptureOutcome> {
    const nonce = this.createNonce();
    const armed = this.waitFor(nonce, ["armed"], HANDSHAKE_TIMEOUT_MS);
    this.post({
      channel: CAPTURE_CHANNEL,
      type: "arm",
      nonce,
      files,
      strictAccept,
      timeoutMs: this.timeoutMs,
    });
    if (!(await armed)) return { status: "unavailable" };

    const result = this.waitFor(nonce, ["captured", "rejected"], this.timeoutMs);
    (trigger as HTMLElement).click();
    const message = (await result) as CapturedMessage | RejectedMessage | null;
    if (!message) {
      this.post({ channel: CAPTURE_CHANNEL, type: "disarm", nonce });
      return { status: "timeout" };
    }
    if (message.type === "rejected") {
      return { status: "rejected", acceptAttribute: message.acceptAttribute };
    }
    return {
      status: "captured",
      accepted: message.accepted,
      rejected: message.rejected,
      truncated: message.truncated,
      acceptAttribute: message.acceptAttribute,
    };
  }

  private post(message: CaptureMessage): void {
    this.win.postMessage(message, "*");
  }

  private waitFor(
    nonce: string,
    types: CaptureMessage["type"][],
    timeoutMs: number,
  ): Promise<CaptureMessage | null> {
    return new Promise((resolve) => {
      const finish = (value: CaptureMessage | null) => {
        this.win.removeEventListener("message", onMessage);
        clearTimeout(timer);
        resolve(value);
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== this.win || !isCaptureMessage(event.data)) return;
        if (event.data.nonce === nonce && types.includes(event.data.type)) finish(event.data);
      };
      const timer = setTimeout(() => finish(null), timeoutMs);
      this.win.addEventListener("message", onMessage);
    });
  }
}
