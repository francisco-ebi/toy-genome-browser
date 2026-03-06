import * as d3 from "d3";
import { formatGenomicCoordinate } from "./utils";

export class CanvasManager {
  canvasRef;
  ctxRef;
  startMovementX = 0;
  regionStart = 0;
  regionEnd = 0;
  xScale;
  canvasScale = 0;

  constructor(canvasRef, region$) {
    if (!!canvasRef) {
      this.canvasRef = canvasRef;
      this.ctxRef = canvasRef.getContext("2d");
      this.ctxRef.webkitImageSmoothingEnabled = false;
      this.ctxRef.mozImageSmoothingEnabled = false;
      this.ctxRef.imageSmoothingEnabled = false;
      this.setupListeners();
      region$.subscribe((newRegion) => {
        this.regionStart = newRegion.start;
        this.regionEnd = newRegion.end;
        this.regenerateScale();
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
      [this.regionStart, this.regionEnd],
      // range
      [0, this.canvasRef.clientWidth],
    );
    this.ctxRef.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    this.render();
  }
  calculateResolution() {
    return (this.regionEnd - this.regionStart) / this.canvasRef.clientWidth;
  }
  updateZooming(e) {
    this.canvasScale = this.viewportTransform.scale += e.deltaY * -0.01;
  }
  updateRegion(deltaX) {
    const bpDiff = Math.round(this.calculateResolution() * deltaX);
    this.regionStart += bpDiff;
    this.regionEnd += bpDiff;
    this.regenerateScale();
  }
  onMouseMove = (e) => {
    const deltaX = e.clientX - this.startMovementX;
    this.updateRegion(deltaX);
    this.render();
  };
  onMouseWheel = (e) => {
    this.updateZooming(e);
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
      this.ctxRef.fillText(
        formatGenomicCoordinate(d),
        this.xScale(d),
        yPos + tickSize,
      );
    });
  }
  render() {
    this.drawXAxis(1, [0, this.canvasRef.clientWidth]);
  }
}
