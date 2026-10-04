import { render } from "preact";
import "@/src/ui/pages/base.css";
import "./options.css";
import { Options } from "./Options";

document.title = browser.i18n.getMessage("optionsTitle");
render(<Options />, document.getElementById("app")!);
