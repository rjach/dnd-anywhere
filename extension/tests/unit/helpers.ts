import { normalizeSettings, type Settings } from "../../src/settings/schema";
import type { ResolveContext } from "../../src/core/types";

export function html(markup: string): void {
  document.body.innerHTML = markup;
}

export function context(
  overrides: Partial<Settings> = {},
  extra: Partial<ResolveContext> = {},
): ResolveContext {
  return {
    document,
    settings: normalizeSettings(overrides),
    url: "https://example.test/upload",
    getShadowRoot: (element) => element.shadowRoot,
    ...extra,
  };
}

export function makeFile(name: string, type: string, content = "x"): File {
  return new File([content], name, { type });
}

/**
 * A DataTransfer that behaves like Chrome's during an OS file drag. happy-dom lists
 * MIME types in `types`; browsers list "Files" for file drags.
 */
function browserLikeTransfer(files: File[]) {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  let dropEffect = "none";
  return {
    types: files.length > 0 ? ["Files"] : [],
    items: transfer.items,
    files: transfer.files,
    get dropEffect() {
      return dropEffect;
    },
    set dropEffect(value: string) {
      dropEffect = value;
    },
  };
}

/** A DragEvent-like event; happy-dom's DragEvent doesn't accept a dataTransfer. */
export function dragEvent(
  type: string,
  files: File[],
  init: {
    clientX?: number;
    clientY?: number;
    altKey?: boolean;
    relatedTarget?: EventTarget | null;
  } = {},
): DragEvent {
  const transfer = browserLikeTransfer(files);
  const event = new Event(type, { bubbles: true, cancelable: true, composed: true }) as DragEvent;
  Object.defineProperties(event, {
    dataTransfer: { value: transfer },
    clientX: { value: init.clientX ?? 0 },
    clientY: { value: init.clientY ?? 0 },
    altKey: { value: init.altKey ?? false },
    shiftKey: { value: false },
    relatedTarget: { value: init.relatedTarget === undefined ? document.body : init.relatedTarget },
  });
  return event;
}
