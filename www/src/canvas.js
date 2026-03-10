import * as d3 from "d3";
import { formatGenomicCoordinate, clamp } from "./utils";

export class CanvasManager {
  canvasRef;
  ctxRef;
  startMovementX = 0;
  viewStart = 0;
  viewEnd = 0;
  geneRegionStart = 0;
  geneRegionEnd = 0;
  xScale;
  canvasScale = 0;
  maxSize = 0;
  geneExons = [];

  constructor(canvasRef, region$, chromSize$, exons$) {
    if (!!canvasRef) {
      this.canvasRef = canvasRef;
      this.ctxRef = canvasRef.getContext("2d");
      this.ctxRef.webkitImageSmoothingEnabled = false;
      this.ctxRef.mozImageSmoothingEnabled = false;
      this.ctxRef.imageSmoothingEnabled = false;
      this.setupListeners();
      region$.subscribe(({ start, end }) => {
        const margin = (end - start) * 0.2;
        this.viewStart = start - margin;
        this.viewEnd = end + margin;
        this.geneRegionStart = start;
        this.geneRegionEnd = end;
        this.regenerateScale();
      });
      chromSize$.subscribe((maxSize) => {
        this.maxSize = maxSize;
      });
      exons$.subscribe((exons) => {
        this.geneExons = exons;
      });
    } else {
      throw new Error("Invalid canvas ref");
    }
  }
  setupListeners() {
    this.canvasRef.addEventListener("mousedown", (e) => {
      this.startMovementX = e.clientX;
      this.canvasRef.addEventListener("mousemove", this.onMouseMove);
    });

    this.canvasRef.addEventListener("mouseup", (e) => {
      this.canvasRef.removeEventListener("mousemove", this.onMouseMove);
    });

    this.canvasRef.addEventListener("wheel", this.onMouseWheel);
  }
  regenerateScale() {
    this.xScale = d3.scaleLinear(
      // domain
      [this.viewStart, this.viewEnd],
      // range
      [0, this.canvasRef.clientWidth],
    );
    this.ctxRef.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    this.render();
  }
  getDataResolution() {
    return (this.viewEnd - this.viewStart) / this.canvasRef.clientWidth;
  }
  updateZooming(e) {
    this.canvasScale += e.deltaY * -0.01;
  }
  moveRegion(deltaX) {
    const bpDiff = Math.round(this.getDataResolution() * deltaX);
    this.viewStart = clamp(this.viewStart + bpDiff, 0, this.maxSize);
    this.viewEnd = clamp(this.viewEnd + bpDiff, 0, this.maxSize);
    this.regenerateScale();
  }
  updateRegionValues() {
    this.ctxRef.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    const currentBpWidth = this.viewEnd - this.viewStart;
    const diff = currentBpWidth * 0.1;
    if (this.canvasScale > 0) {
      this.viewStart = clamp(this.viewStart + diff, 0, this.maxSize);
      this.viewEnd = clamp(this.viewEnd - diff, 0, this.maxSize);
    } else {
      this.viewStart = clamp(this.viewStart - diff, 0, this.maxSize);
      this.viewEnd = clamp(this.viewEnd + diff, 0, this.maxSize);
    }
    this.regenerateScale();
  }
  onMouseMove = (e) => {
    const deltaX = e.clientX - this.startMovementX;
    this.moveRegion(deltaX);
    this.render();
  };
  onMouseWheel = (e) => {
    this.updateZooming(e);
    this.updateRegionValues();
    this.render();
  };
  drawXAxis(yPos, xExtent) {
    if (!this.xScale) {
      return;
    }
    const [startX, endX] = xExtent;
    const tickSize = 6;
    const xTicks = this.xScale.ticks(10);

    this.ctxRef.strokeStyle = "black";
    this.ctxRef.beginPath();
    xTicks.forEach((t) => {
      this.ctxRef.moveTo(this.xScale(t), yPos);
      this.ctxRef.lineTo(this.xScale(t), yPos + tickSize);
    });
    this.ctxRef.stroke();

    this.ctxRef.beginPath();
    this.ctxRef.moveTo(startX, yPos + tickSize);
    this.ctxRef.lineTo(startX, yPos);
    this.ctxRef.lineTo(endX, yPos);
    this.ctxRef.lineTo(endX, yPos + tickSize);
    this.ctxRef.stroke();

    this.ctxRef.textAlign = "center";
    this.ctxRef.textBaseline = "top";
    this.ctxRef.fillStyle = "black";
    xTicks.forEach((d) => {
      this.ctxRef.beginPath();
      this.ctxRef.fillText(d, this.xScale(d), yPos + tickSize);
    });
  }
  drawGenePositionLineBoundaries() {
    const canvasHeight = this.canvasRef.height;
    this.ctxRef.beginPath();
    this.ctxRef.setLineDash([20, 5]);
    this.ctxRef.moveTo(this.xScale(this.geneRegionStart), 0);
    this.ctxRef.lineTo(this.xScale(this.geneRegionStart), canvasHeight);
    this.ctxRef.stroke();
    this.ctxRef.moveTo(this.xScale(this.geneRegionEnd), 0);
    this.ctxRef.lineTo(this.xScale(this.geneRegionEnd), canvasHeight);
    this.ctxRef.stroke();
    this.ctxRef.setLineDash([]);
  }
  drawGene() {
    console.log(this.getDataResolution());
  }
  render() {
    this.drawXAxis(1, [0, this.canvasRef.clientWidth]);
    if (this.geneRegionStart !== 0 && this.geneRegionEnd !== 0) {
      this.drawGenePositionLineBoundaries();
    }
    this.drawGene();
  }
}
