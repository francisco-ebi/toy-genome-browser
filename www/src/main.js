import * as d3 from "d3";
import "./style.css";
import { CanvasManager } from "./canvas";
import { GenomeBrowser } from "./browser";
import { drawXAxis } from "./utils";
import chromSizes from "./mm39-chrom-sizes.json";

const canvasRef = document.querySelector("#canvas");
const ctxRef = canvasRef.getContext("2d");
const canvasWidth = canvasRef.clientWidth;
const browser = new GenomeBrowser(canvasWidth);

let selectedChrom = "chr1";
const selectedChromSize = chromSizes.find(
  (chr) => chr.name === selectedChrom,
).size;

const onPosChange = (x) => {
  console.log(x);
};

const canvasMng = new CanvasManager(canvasRef, onPosChange);
canvasMng.render();

console.log({ selectedChromSize, canvasWidth });
const xScale = d3.scaleLinear([0, selectedChromSize], [0, canvasWidth]);
drawXAxis(ctxRef, xScale, 1, [0, canvasWidth]);
