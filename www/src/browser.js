import {
  BehaviorSubject,
  Subject,
  debounceTime,
  concatMap,
  concat,
} from "rxjs";
import chromSizes from "./mm39-chrom-sizes.json";
import { BrowserEngine } from "genome_browser_wasm";
const exampleGenesByChr = {
  chr1: "Ugt1a10",
  chr2: "Cwc22",
  chr3: "Ctsk",
  chr4: "Col9a2",
  chr5: "Ttc28",
  chr6: "Edem1",
  chr7: "Myo7a",
  chr8: "Syce2",
  chr9: "Elovl5",
  chr10: "Lrig3",
  chr11: "Wnt3a",
  chr12: "Twist1",
  chr13: "Pitx1",
  chr14: "Cpap",
  chr15: "Myo10",
  chr16: "Ahsg",
  chr17: "Runx2",
  chr18: "Fbn2",
  chr19: "Uhrf2",
  chrM: "mt-Nd1",
  chrX: "Hdac8",
  chrY: "Sry",
};

export class GenomeBrowser {
  canvasWidth;
  startPos;
  endPos;
  region$ = new Subject();
  chromSize$ = new BehaviorSubject(
    chromSizes.find((chr) => chr.name === "chr1").size,
  );
  exons$ = new Subject();
  selectedChrom = "chr1";
  selectedGene = "Ugt1a10";
  onPosChange$;
  genes$ = new Subject();
  browserEngine;

  constructor(canvasWidth) {
    this.canvasWidth = canvasWidth;
    this.setupChrSelector();
    this.browserEngine = new BrowserEngine();
    this.loadEngineData();
  }

  get region() {
    return this.region$;
  }
  get chromSize() {
    return this.chromSize$;
  }
  get onNewGenes() {
    return this.genes$;
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
      this.selectedGene = exampleGenesByChr[this.selectedChrom];
      this.chromSize$.next(
        chromSizes.find((chr) => chr.name === this.selectedChrom).size,
      );
      this.loadEngineData();
    });
  }
  async loadEngineData() {
    await this.browserEngine.load_chromosome_data(this.selectedChrom);
    console.log("Loaded data for", this.selectedChrom);
    this.getGenePos();
  }
  getGenePos() {
    const { start, end } = this.browserEngine.find_gene_pos(this.selectedGene);
    this.startPos = start;
    this.endPos = end;
    this.region$.next({ start, end });
  }
  async getGenesByPos(start, end) {
    const genes = this.browserEngine.get_genes_by_pos(start, end);
    return genes
      .map((g) => {
        return {
          name: g.name,
          start: g.start,
          end: g.end,
          strand: g.strand,
          exons: g.transcripts.flatMap((t) =>
            t.exons.map(([start, end]) => ({ start, end })),
          ),
        };
      })
      .sort((g1, g2) => g1.start - g2.start);
  }
  setupPosListener(obs$) {
    if (obs$) {
      return concat(
        obs$.pipe(
          debounceTime(50),
          concatMap(({ start, end }) => this.getGenesByPos(start, end)),
        ),
        this.genes$,
      );
    }
  }
}
