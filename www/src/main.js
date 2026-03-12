import "./style.css";
import { CanvasManager } from "./canvas";
import { GenomeBrowser } from "./browser";

const canvasRef = document.querySelector("#canvas");
const regionRef = document.querySelector("#region");
const canvasWidth = canvasRef.clientWidth;
const browser = new GenomeBrowser(canvasWidth);
const canvasMng = new CanvasManager(
  canvasRef,
  browser.region,
  browser.chromSize,
  browser.exons,
);
canvasMng.onViewUpdate.subscribe(({ start, end }) => {
  regionRef.innerHTML = `${start.toLocaleString("en-US")} - ${end.toLocaleString("en-US")}`;
});
canvasMng.render();
