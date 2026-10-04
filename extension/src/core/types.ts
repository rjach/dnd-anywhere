import type { Settings } from "../settings/schema";

/** Which resolver produced a target. Shown in debug logs and diagnostic reports. */
export type ResolverName =
  "adapter" | "visible-input" | "labelled-input" | "shadow-input" | "trigger" | "page-fallback";

export type AcceptRule =
  | { kind: "mime"; value: string }
  | { kind: "wildcard"; value: string }
  | { kind: "extension"; value: string };

export interface DropTarget {
  id: string;
  /** Element the overlay highlights. Hit testing uses its bounding rect. */
  anchor: Element;
  /** `input`: files go straight into `input`. `trigger`: click the anchor and capture the input it opens. */
  kind: "input" | "trigger";
  input?: HTMLInputElement;
  accept: AcceptRule[];
  multiple: boolean;
  /** Human-readable name of the field, e.g. "Attachments". */
  label: string;
  source: ResolverName;
  /** True when found by guesswork (button text), so the UI can style it as "try dropping here". */
  heuristic: boolean;
  /** Covers the whole viewport and only wins when nothing else is under the pointer. */
  fullPage?: boolean;
}

export interface ResolveContext {
  document: Document;
  settings: Settings;
  /** Page URL used for adapter matching. */
  url: string;
  /** Returns open or closed shadow roots for an element; injected so tests can run without Chrome APIs. */
  getShadowRoot: (element: Element) => ShadowRoot | null;
}

/** One strategy for finding upload targets. Resolvers must only read the DOM, never change it. */
export interface Resolver {
  readonly name: ResolverName;
  resolve(context: ResolveContext, collected: CollectedInputs): DropTarget[];
}

/** File inputs gathered once per drag and shared by every resolver. */
export interface CollectedInputs {
  /** Eligible inputs in the main document tree. */
  light: HTMLInputElement[];
  /** Eligible inputs inside shadow roots. */
  shadow: HTMLInputElement[];
}
