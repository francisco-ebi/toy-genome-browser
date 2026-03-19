# Toy Mice Genome Browser

## Description

This project consist of 3 parts:

- Rust data pipeline, that takes a GENCODE GTF Mice file (version vM38), and preprocess data in a hierarchy way so each gene contains its transcripts and each transcript contains its exons. The transcripts are filtered so only the Ensembl_canonical and protein coding ones are saved. After processing the file, the data gets splited by chromosome in binary form.
- Rust WASM package that exposes the BrowserEngine struct. It fetches and deserializes the binary data for a specific chromosome and exposes 2 functions, one for getting the genomic positions given a gene symbol and another one to get all the matching genes given a genomic window (start and end).
- Webapp that implements a minimal genome browser and gets the data required from the Rust WASM package. It displays data on gene and exon levels, depending on the zoom level. It uses Vite as bundler.

## How to run

Pre-requisites:

- `yarn` installed
- Rust and `wasm-pack` installed

### Webapp steps

1. Clone the repository.
2. Run `cargo build` and `wasm-pack build` in the root directory.
3. Run `yarn install` and `yarn dev` in the www directory.
4. Navigate to `http://localhost:5173/`.

### Data pipeline steps

1. Clone the repository.
2. Place the GENCODE GTF file (`gencode.vM38.basic.annotation.gtf`) in the root dir
3. Run `cargo build` and `cargo run` in the root directory.
