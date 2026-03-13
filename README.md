# Toy Mice Genome Browser

## Description

This project consist of 3 parts:

- Rust data pipeline, that takes a GENCODE GTF Mice file (version vM38), and preprocess data in a hierarchy way so each gene contains its transcripts and each transcript contains its exons. The transcripts are filtered so only the Ensembl_canonical and protein coding ones are saved. After processing the file, the data gets splited by chromosome in binary form.
- Rust WASM package that exposes the BrowserEngine struct. It fetches and deserializes the binary data for a specific chromosome and exposes 2 functions, one for getting the genomic positions given a gene symbol and another one to get all the matching genes given a genomic window (start and end).
- Webapp that implements a minimal genome browser and gets the data required from the Rust WASM package. It displays data on gene and exon levels, depending on the zoom level. It uses Vite as bundler.
