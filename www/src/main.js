import * as d3 from "d3";
import "./style.css";
import { greet } from "genome_browser_wasm";
import { CanvasManager } from "./canvas";
import { formatGenomicCoordinate } from "./utils";
import chromSizes from "./mm39-chrom-sizes.json";

const canvasRef = document.querySelector("#canvas");
document.querySelector("#title").innerHTML = `${greet("dev")}`;
const selectedChrom = "chr1";
const selectedChromSize = chromSizes.find(
  (chr) => chr.name === selectedChrom,
).size;

const calculateRes = (startPos, endPos, canvasWidth) =>
  (endPos - startPos) / canvasWidth;
const onPosChange = (x) => {
  console.log(x);
};

const canvasMng = new CanvasManager(canvasRef, onPosChange);
canvasMng.render();

const chromosomeSelector = document.querySelector("#chromosome-selector");
chromSizes.forEach((chrm) => {
  const opt = document.createElement("option");
  opt.value = chrm.name;
  opt.text = chrm.name;
  if (chrm.name === "chr1") {
    opt.defaultSelected = true;
  }
  chromosomeSelector.add(opt, null);
});

chromosomeSelector.addEventListener("change", (e) => {
  selectedChrom = e.target.value;
});
const xScale = d3
  .scaleLinear()
  .domain([0, selectedChromSize])
  .range(0, canvasRef.clientWidth);
console.log({ ticks: xScale.ticks(20).map(formatGenomicCoordinate) });
console.log({
  selectedChromSize,
  res: calculateRes(0, selectedChromSize, canvasRef.clientWidth),
});
