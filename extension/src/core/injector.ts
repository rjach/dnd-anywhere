import { fileMatchesAccept } from "./accept";
import type { AcceptRule } from "./types";

/**
 * Puts files into a file input exactly the way a native file dialog does: set
 * `files`, then fire bubbling `input` and `change`. Frameworks such as React listen
 * for these at the document root, so both must bubble and cross shadow boundaries.
 *
 * @param input - Target file input
 * @param files - Files to assign (replaces any existing selection, like the native picker)
 */
export function injectFiles(input: HTMLInputElement, files: readonly File[]): void {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export interface FileSelection {
  accepted: File[];
  rejected: File[];
  /** True when several files were accepted but the input takes only one. */
  tooMany: boolean;
}

/**
 * Splits dropped files into the ones a target accepts and the ones it doesn't.
 *
 * @param files - Dropped files
 * @param accept - The target's accept rules
 * @param multiple - Whether the target takes more than one file
 * @param strict - When false, `accept` is ignored
 */
export function selectFiles(
  files: readonly File[],
  accept: AcceptRule[],
  multiple: boolean,
  strict: boolean,
): FileSelection {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (!strict || fileMatchesAccept(file, accept)) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected, tooMany: !multiple && accepted.length > 1 };
}
