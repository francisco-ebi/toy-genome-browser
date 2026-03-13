import {
  BehaviorSubject,
  Subject,
  debounceTime,
  concatMap,
  concat,
} from "rxjs";
import chromSizes from "./mm39-chrom-sizes.json";
import { find_gene_pos, get_genes_by_pos } from "genome_browser_wasm";

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

  constructor(canvasWidth) {
    this.canvasWidth = canvasWidth;
    this.setupChrSelector();
    this.getGenePos();
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
      this.chromSize$.next(
        chromSizes.find((chr) => chr.name === this.selectedChrom).size,
      );
    });
  }
  async getGenePos() {
    const { start, end } = await find_gene_pos(
      this.selectedChrom,
      this.selectedGene,
    );
    this.startPos = start;
    this.endPos = end;
    this.region$.next({ start, end });
  }
  async getGenesByPos(start, end) {
    const genes = await get_genes_by_pos(this.selectedChrom, start, end);
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
          debounceTime(200),
          concatMap(({ start, end }) => this.getGenesByPos(start, end)),
        ),
        this.genes$,
      );
    }
  }
}
