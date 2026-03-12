import * as d3 from "d3";
import { clamp } from "./utils";
import { BehaviorSubject } from "rxjs";

const GENE_Y_POS = 20;
const GENE_HEIGHT = 20;
const INTRON_Y_POS = 40;
const EXON_Y_POS = 30;
const EXON_HEIGHT = 20;
const MARKER_SYMBOL_Y_POS = 52;

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
  genes = [];

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
  setupGeneListener(geneObs$) {
    if (geneObs$) {
      geneObs$.subscribe((newGenes) => {
        this.genes = newGenes;
        this.ctxRef.clearRect(
          0,
          0,
          this.canvasRef.width,
          this.canvasRef.height,
        );
        this.render();
      });
    }
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
  drawGenesBoxes() {
    if (this.xScale) {
      this.genes.forEach((gene, index) => {
        this.ctxRef.beginPath();
        const xStart = this.xScale(gene.start);
        const width = this.xScale(gene.end) - xStart;
        this.ctxRef.rect(xStart, GENE_Y_POS * (index + 1), width, GENE_HEIGHT);
        this.ctxRef.fill();
      });
    }
  }
  drawExons() {
    if (this.xScale) {
      this.genes.forEach((gene, index) => {
        this.ctxRef.beginPath();
        // if first exon doesn't start in start pos of gene, draw line
        if (gene.exons[0].start > gene.start) {
          this.ctxRef.moveTo(
            this.xScale(gene.start),
            INTRON_Y_POS * (index + 1),
          );
          this.ctxRef.lineTo(
            this.xScale(gene.exons[0].start),
            INTRON_Y_POS * (index + 1),
          );
          this.ctxRef.stroke();
        }
        gene.exons.forEach((exon, exonIndex) => {
          const exonStart = this.xScale(exon.start);
          const exonEnd = this.xScale(exon.end);
          const width = exonEnd - exonStart;
          this.ctxRef.rect(
            exonStart,
            EXON_Y_POS * (index + 1),
            width,
            EXON_HEIGHT,
          );
          this.ctxRef.fill();
          let nextExonStart = gene.exons[exonIndex + 1]?.start;
          if (nextExonStart) {
            nextExonStart = this.xScale(nextExonStart);
            this.ctxRef.moveTo(exonEnd, INTRON_Y_POS * (index + 1));
            this.ctxRef.lineTo(nextExonStart, INTRON_Y_POS * (index + 1));
            this.ctxRef.stroke();
          }
        });
        // if last exon doesn't end in end pos of gene, draw line
        if (gene.exons[gene.exons.length - 1].end < gene.end) {
          const lastExonEnd = gene.exons[gene.exons.length - 1].end;
          this.ctxRef.moveTo(
            this.xScale(lastExonEnd),
            INTRON_Y_POS * (index + 1),
          );
          this.ctxRef.lineTo(this.xScale(gene.end), INTRON_Y_POS * (index + 1));
          this.ctxRef.stroke();
        }
      });
    }
  }
  drawGeneNames() {
    if (this.xScale) {
      this.genes.forEach((gene, index) => {
        this.ctxRef.beginPath();
        this.ctxRef.textAlign = "start";
        this.ctxRef.textBaseline = "top";
        this.ctxRef.fillStyle = "black";
        const textXPos = Math.max(gene.start, this.viewStart);
        this.ctxRef.fillText(
          gene.name,
          this.xScale(textXPos),
          MARKER_SYMBOL_Y_POS * (index + 1),
        );
      });
    }
  }
  drawFeatures() {
    const currentRes = this.getDataResolution();
    if (currentRes >= 400) {
      this.drawGenesBoxes();
    } else {
      this.drawExons();
    }
    this.drawGeneNames();
  }
  render() {
    this.drawXAxis(1, [0, this.canvasRef.clientWidth]);
    this.drawFeatures();
  }
}
