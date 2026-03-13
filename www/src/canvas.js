import * as d3 from "d3";
import { clamp } from "./utils";
import { BehaviorSubject } from "rxjs";

const GENE_HEIGHT = 20;
const TEXT_OFFSET = 15;
const VERTICAL_PADDING = 10;
const MARGIN_TOP = 1;
const EXON_HEIGHT = 20;
const LANE_HEIGHT = GENE_HEIGHT + TEXT_OFFSET + VERTICAL_PADDING;

export class CanvasManager {
  canvasRef;
  ctxRef;
  xScale;
  genes = [];
  laneCache = new Map();
  maxSize = 0;
  startMovementX = 0;
  viewStart = 0;
  viewEnd = 0;
  zoomDirection = 0;
  view$ = new BehaviorSubject({ start: this.viewStart, end: this.viewEnd });

  constructor(canvasRef, region$, chromSize$) {
    if (!!canvasRef) {
      this.canvasRef = canvasRef;
      this.ctxRef = canvasRef.getContext("2d");
      this.setupListeners();
      this.setupRetinaScreens();
      region$.subscribe(({ start, end }) => {
        const margin = (end - start) * 0.2;
        this.updateViewValues(start - margin, end + margin);
        this.regenerateScale();
      });
      chromSize$.subscribe((maxSize) => {
        this.maxSize = maxSize;
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
        this.genes = this.assignLanes(newGenes);
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
  assignLanes(genes) {
    const lanes = [];
    return genes.map((gene) => {
      if (this.laneCache.has(gene.name)) {
        const currentLane = this.laneCache.get(gene.name);
        while (lanes.length <= currentLane) lanes.push(0);
        lanes[currentLane] = Math.max(lanes[currentLane], gene.end + 500);
        return {
          ...gene,
          lane: currentLane,
        };
      }
      let laneIndex = lanes.findIndex((end) => end < gene.start);
      let geneLane;
      if (laneIndex === -1) {
        geneLane = lanes.length + 1;
        lanes.push(gene.end + 500);
      } else {
        geneLane = laneIndex + 1;
        lanes[laneIndex] = gene.end + 500;
      }
      this.laneCache.set(gene.name, geneLane);
      return {
        ...gene,
        lane: geneLane,
      };
    });
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
  drawGeneName = (xPos, yPos, geneName) => {
    if (this.getDataResolution() < 2000) {
      this.ctxRef.beginPath();
      this.ctxRef.textAlign = "start";
      this.ctxRef.fillStyle = "black";
      const textXPos = Math.max(xPos, this.viewStart);
      this.ctxRef.fillText(geneName, this.xScale(textXPos), yPos);
    }
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
      this.genes.forEach((gene) => {
        const boxYPos = MARGIN_TOP + gene.lane * LANE_HEIGHT;
        this.ctxRef.beginPath();
        const xStart = this.xScale(gene.start);
        const width = this.xScale(gene.end) - xStart;
        this.ctxRef.rect(xStart, boxYPos, width, GENE_HEIGHT);
        this.ctxRef.fill();
        this.drawGeneName(gene.start, boxYPos + GENE_HEIGHT, gene.name);
      });
    }
  }
  drawExons() {
    if (this.xScale) {
      this.genes.forEach((gene) => {
        this.ctxRef.beginPath();
        const exonYPos = MARGIN_TOP + gene.lane * LANE_HEIGHT;
        const intronYPos = exonYPos + EXON_HEIGHT / 2;
        this.drawGeneName(gene.start, exonYPos + EXON_HEIGHT, gene.name);
        // if first exon doesn't start in start pos of gene, draw line
        if (gene.exons[0].start > gene.start) {
          this.ctxRef.moveTo(this.xScale(gene.start), intronYPos);
          this.ctxRef.lineTo(this.xScale(gene.exons[0].start), intronYPos);
          this.ctxRef.stroke();
        }
        gene.exons.forEach((exon, exonIndex) => {
          const exonStart = this.xScale(exon.start);
          const exonEnd = this.xScale(exon.end);
          const width = exonEnd - exonStart;
          this.ctxRef.rect(exonStart, exonYPos, width, EXON_HEIGHT);
          this.ctxRef.fill();
          let nextExonStart = gene.exons[exonIndex + 1]?.start;
          if (nextExonStart) {
            nextExonStart = this.xScale(nextExonStart);
            this.ctxRef.moveTo(exonEnd, intronYPos);
            this.ctxRef.lineTo(nextExonStart, intronYPos);
            this.ctxRef.stroke();
          }
        });
        // if last exon doesn't end in end pos of gene, draw line
        if (gene.exons[gene.exons.length - 1].end < gene.end) {
          const lastExonEnd = gene.exons[gene.exons.length - 1].end;
          this.ctxRef.moveTo(this.xScale(lastExonEnd), intronYPos);
          this.ctxRef.lineTo(this.xScale(gene.end), intronYPos);
          this.ctxRef.stroke();
        }
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
  }
  render() {
    this.drawXAxis(0, [0, this.canvasRef.clientWidth]);
    this.drawFeatures();
  }
}
