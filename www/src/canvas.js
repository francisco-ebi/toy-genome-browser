import * as d3 from "d3";
import { clamp } from "./utils";
import { BehaviorSubject } from "rxjs";

export class CanvasManager {
  canvasRef;
  ctxRef;
  startMovementX = 0;
  viewStart = 0;
  viewEnd = 0;
  geneRegionStart = 0;
  geneRegionEnd = 0;
  xScale;
  zoomDirection = 0;
  maxSize = 0;
  geneExons = [];
  view$ = new BehaviorSubject({ start: this.viewStart, end: this.viewEnd });

  constructor(canvasRef, region$, chromSize$, exons$) {
    if (!!canvasRef) {
      this.canvasRef = canvasRef;
      this.ctxRef = canvasRef.getContext("2d");
      this.setupListeners();
      this.setupRetinaScreens();
      region$.subscribe(({ start, end }) => {
        const margin = (end - start) * 0.2;
        this.updateViewValues(start - margin, end + margin);
        this.geneRegionStart = start;
        this.geneRegionEnd = end;
        this.regenerateScale();
      });
      chromSize$.subscribe((maxSize) => {
        this.maxSize = maxSize;
      });
      exons$.subscribe((exons) => {
        this.geneExons = exons.toSorted((e1, e2) => e1.start - e2.start);
        this.render();
      });
    } else {
      throw new Error("Invalid canvas ref");
    }
  }
  get onViewUpdate() {
    return this.view$;
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
  setupRetinaScreens() {
    this.ctxRef.webkitImageSmoothingEnabled = false;
    this.ctxRef.mozImageSmoothingEnabled = false;
    this.ctxRef.imageSmoothingEnabled = false;
    const ratio = window.devicePixelRatio || 1;
    this.canvasRef.style.width = `${this.canvasRef.width}px`;
    this.canvasRef.style.height = `${this.canvasRef.height}px`;
    this.canvasRef.width *= ratio;
    this.canvasRef.height *= ratio;
    this.ctxRef.scale(ratio, ratio);
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
  updateViewValues(newStart, newEnd) {
    this.viewStart = Math.trunc(newStart);
    this.viewEnd = Math.trunc(newEnd);
    this.view$.next({ start: this.viewStart, end: this.viewEnd });
  }
  updateZooming(e) {
    this.zoomDirection = e.deltaY > 0 ? 1 : -1;
  }
  moveRegion(deltaX) {
    const bpDiff = Math.round(this.getDataResolution() * deltaX);
    this.updateViewValues(
      clamp(this.viewStart + bpDiff, 0, this.maxSize),
      clamp(this.viewEnd + bpDiff, 0, this.maxSize),
    );
    this.regenerateScale();
  }
  updateRegionValues(xPos) {
    const cursorPosPercentage = xPos / this.canvasRef.clientWidth;
    const currentBpWidth = this.viewEnd - this.viewStart;
    const targetPos = this.viewStart + currentBpWidth * cursorPosPercentage;
    this.ctxRef.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
    const diff = currentBpWidth * 0.01;
    let newWindowSize;
    if (this.zoomDirection > 0) {
      newWindowSize = currentBpWidth - diff;
    } else {
      newWindowSize = currentBpWidth + diff;
    }
    const newStart = clamp(
      targetPos - newWindowSize * cursorPosPercentage,
      0,
      this.maxSize,
    );
    const newEnd = clamp(newStart + newWindowSize, 0, this.maxSize);
    this.updateViewValues(newStart, newEnd);
    this.regenerateScale();
  }
  onMouseMove = (e) => {
    const deltaX = e.clientX - this.startMovementX;
    this.moveRegion(deltaX * 0.1);
    this.render();
  };
  onMouseWheel = (e) => {
    this.updateZooming(e);
    this.updateRegionValues(e.clientX);
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

    this.ctxRef.textAlign = "start";
    this.ctxRef.textBaseline = "top";
    this.ctxRef.fillStyle = "black";
    xTicks.forEach((d) => {
      this.ctxRef.beginPath();
      this.ctxRef.fillText(
        d.toLocaleString("en-US"),
        this.xScale(d) + 5,
        yPos + tickSize,
      );
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
  drawGenePosition() {
    this.ctxRef.beginPath();
    const xStart = this.xScale(this.geneRegionStart);
    const width = this.xScale(this.geneRegionEnd) - xStart;
    this.ctxRef.rect(xStart, 30, width, 10);
    this.ctxRef.fill();
  }
  drawExons() {
    if (this.geneExons.length && this.xScale) {
      this.ctxRef.beginPath();
      // if first exon doesn't start in start pos of gene, draw line
      if (this.geneExons?.[0].start > this.geneRegionStart) {
        this.ctxRef.moveTo(this.xScale(this.geneRegionStart), 45);
        this.ctxRef.lineTo(this.xScale(this.geneExons?.[0].start), 45);
        this.ctxRef.stroke();
      }
      this.geneExons.forEach((exon, index) => {
        const exonStart = this.xScale(exon.start);
        const exonEnd = this.xScale(exon.end);
        const width = exonEnd - exonStart;
        this.ctxRef.rect(exonStart, 30, width, 20);
        this.ctxRef.fill();
        let nextExonStart = this.geneExons[index + 1]?.start;
        if (nextExonStart) {
          nextExonStart = this.xScale(nextExonStart);
          this.ctxRef.moveTo(exonEnd, 40);
          this.ctxRef.lineTo(nextExonStart, 40);
          this.ctxRef.stroke();
        }
      });
      // if last exon doesn't end in end pos of gene, draw line
      if (this.geneExons[this.geneExons.length - 1].end < this.geneRegionEnd) {
        const lastExonEnd = this.geneExons[this.geneExons.length - 1].end;
        this.ctxRef.moveTo(this.xScale(lastExonEnd), 40);
        this.ctxRef.lineTo(this.xScale(this.geneRegionEnd), 40);
        this.ctxRef.stroke();
      }
    }
  }
  drawGeneName() {
    if (this.xScale) {
      this.ctxRef.beginPath();
      this.ctxRef.textAlign = "start";
      this.ctxRef.textBaseline = "top";
      this.ctxRef.fillStyle = "black";
      const textXPos = Math.max(this.geneRegionStart, this.viewStart);
      this.ctxRef.fillText("Agap1", this.xScale(textXPos), 52);
    }
  }
  drawFeatures() {
    const currentRes = this.getDataResolution();
    if (currentRes >= 400) {
      this.drawGenePosition();
    } else {
      this.drawExons();
    }
    this.drawGeneName();
  }
  render() {
    this.drawXAxis(1, [0, this.canvasRef.clientWidth]);
    if (this.geneRegionStart !== 0 && this.geneRegionEnd !== 0) {
      this.drawGenePositionLineBoundaries();
    }
    this.drawFeatures();
  }
}
