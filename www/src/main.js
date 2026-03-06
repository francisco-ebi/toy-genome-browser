import "./style.css";
import { greet } from "genome_browser_wasm";
import { CanvasManager } from "./canvas";

document.querySelector("#title").innerHTML = `${greet("dev")}`;

const canvasMng = new CanvasManager(document.querySelector("#canvas"));
canvasMng.render();
