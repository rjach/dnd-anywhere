import { render } from "preact";
import { startContentRuntime } from "@/src/content/runtime";
import { normalizeSettings, type Settings } from "@/src/settings/schema";
import { createBrowserSettingsStore } from "@/src/settings/store";
import "@/src/ui/pages/base.css";
import "./welcome.css";
import { Welcome } from "./Welcome";

render(<Welcome />, document.getElementById("app")!);

// Content scripts don't run on extension pages, so the demo runs the same
// runtime directly. The origin is fixed so per-site switches don't apply here.
const store = createBrowserSettingsStore();
let settings: Settings = normalizeSettings({});
void store.load().then((loaded) => (settings = loaded));
store.watch((next) => (settings = next));
startContentRuntime({
  win: window,
  doc: document,
  getSettings: () => ({ ...settings, enabled: true, disabledOrigins: [] }),
  topOrigin: location.origin,
});
