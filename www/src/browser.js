import { Subject } from "rxjs";
import chromSizes from "./mm39-chrom-sizes.json";
import { find_gene_pos } from "genome_browser_wasm";

export class GenomeBrowser {
  canvasWidth;
  startPos;
  endPos;
  region$ = new Subject();
  selectedChrom = "chr1";
  selectedGene = "Agap1";

  constructor(canvasWidth) {
    this.canvasWidth = canvasWidth;
    this.setupChrSelector();
    this.getGenePos();
  }

  get region() {
    return this.region$;
  }
  setupChrSelector() {
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
      this.selectedChrom = e.target.value;
    });
  }
  calculateRes() {
    return (this.endPos - this.startPos) / this.canvasWidth;
  }
  async getGenePos() {
    const { start, end } = await find_gene_pos(
      this.selectedChrom,
      this.selectedGene,
    );
    this.startPos = start;
    this.endPos = end;
    this.region$.next({ start, end });
    console.log({ start, end });
  }
}
