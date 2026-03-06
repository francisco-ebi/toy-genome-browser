import * as d3 from "d3";
import { formatGenomicCoordinate } from "./utils";

export class CanvasManager {
  canvasRef;
  ctxRef;
  previousX = 0;
  startMovementX = 0;
  regionStart = 0;
  regionEnd = 0;
  viewportTransform = {
    x: 0,
    scale: 1,
  };
  xScale;

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
      this.previousX = e.clientX;
      this.startMovementX = e.clientX;
      this.canvasRef.addEventListener("mousemove", this.onMouseMove);
    });

    this.canvasRef.addEventListener("mouseup", (e) => {
      const deltaX = e.clientX - this.startMovementX;
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
    this.render();
  }

  updatePanning(e) {
    const { clientX: localX } = e;
    this.viewportTransform.x += localX - this.previousX;
    this.previousX = localX;
  }
  updateZooming(e) {
    const { scale: oldScale, x: oldX } = this.viewportTransform;
    const { clientX: localX } = e;

    const newScale = (this.viewportTransform.scale += e.deltaY * -0.01);
    const newX = localX - (localX - oldX) * (newScale / oldScale);
    this.viewportTransform = {
      x: newX,
      scale: newScale,
    };
  }
  onMouseMove = (e) => {
    this.updatePanning(e);
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
  drawRect(x, y, width, height, color) {
    this.ctxRef.fillStyle = color;
    this.ctxRef.fillRect(x, y, width, height);
  }
  render() {
    const { scale, x } = this.viewportTransform;
    this.ctxRef.setTransform(1, 0, 0, 1, 0, 0);
    this.ctxRef.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    this.ctxRef.setTransform(scale, 0, 0, scale, x, 0);

    this.drawRect(200, 200, 100, 100, "blue");
    this.drawXAxis(1, [0, this.canvasRef.clientWidth]);
  }
}
