import "./style.css";
import { CanvasManager } from "./canvas";
import { GenomeBrowser } from "./browser";

const canvasRef = document.querySelector("#canvas");
const canvasWidth = canvasRef.clientWidth;
const browser = new GenomeBrowser(canvasWidth);
const canvasMng = new CanvasManager(
  canvasRef,
  browser.region,
  browser.chromSize,
);
canvasMng.render();
