import { render } from "preact";
import "@/src/ui/pages/base.css";
import "./popup.css";
import { Popup } from "./Popup";

render(<Popup />, document.getElementById("app")!);
