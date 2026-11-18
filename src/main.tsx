import { render } from "@solidjs/web";
// Dockview's stylesheet ships only in the `dockview` package (it has no React dependency); dockview-core 8.x has none
import "dockview/dist/styles/dockview.css";
import DockviewDemo from "./demo/App";

render(() => <DockviewDemo />, document.getElementById("root")!);
