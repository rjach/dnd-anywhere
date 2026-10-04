import { installCaptureShim } from "@/src/core/capture-shim";

/**
 * Runs in the page's own JavaScript world, before page scripts, so it can wrap
 * the APIs pages use to open file pickers. It has no extension API access and
 * does nothing until the isolated content script arms it after a user drop.
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  allFrames: true,
  matchOriginAsFallback: true,
  world: "MAIN",
  noScriptStartedPostMessage: true,
  main() {
    installCaptureShim(window);
  },
});
