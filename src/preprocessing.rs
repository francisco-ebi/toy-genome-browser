use std::fs::File;
use std::io::{BufRead, BufReader, Lines, Result};
use std::path::Path;
use std::collections::{HashMap, HashSet};
use bincode;
// use serde_json;
use std::fs;
use crate::structures::{Gene, Transcript, Metadata};

pub fn process_file(file_name: &str) {
  let mut genes: HashMap<String, Gene> = HashMap::new();
  let mut transcripts: HashMap<String, Transcript> = HashMap::new();
  let mut chromosomes: HashSet<String> = HashSet::new();
  if let Ok(lines) = read_lines(file_name) {
    let mut line_index = 0;
    for line in lines.map_while(Result::ok) {
      if line_index < 5 {
        line_index += 1;
        continue;
      }
      let metadata = process_line(line);
      match metadata.feature {
        ref x if x.eq("gene") => {
          chromosomes.insert(metadata.seq_name.clone());
          genes.insert(metadata.gene_id.clone(), Gene {
            id: metadata.gene_id,
            transcripts: Vec::new(),
            name: metadata.gene_name,
            chr: metadata.seq_name,
            start: metadata.start,
            end: metadata.end,
            strand: metadata.strand
          });
        },
        ref x if x.eq("transcript") => {
          if !metadata.transcript_id.is_empty() && metadata.is_protein_coding() && metadata.is_canonical() {
            transcripts.insert(metadata.transcript_id.clone(), Transcript {
              id: metadata.transcript_id,
              parent_gene_id: metadata.gene_id,
              exons: Vec::new()
            });
          }
        },
        ref x if x.eq("exon") => {
          if !metadata.transcript_id.is_empty() {
            if let Some(transcript) = transcripts.get_mut(&metadata.transcript_id) {
              transcript.exons.push((metadata.start, metadata.end));
            }
          }
        },
        _ => {}
      }
      line_index += 1;
    }
  } else {
    println!("Error opening file");
  }
  for (_, transcript) in transcripts.into_iter() {
    if let Some(gene) = genes.get_mut(&transcript.parent_gene_id) {
      gene.transcripts.push(transcript);
    }
  }
  genes.retain(|_, gene| !gene.transcripts.is_empty());
  save_to_disk(chromosomes, genes);
}

fn process_line(line: String) -> Metadata {
  let collection: Vec<&str> = line.split("\t").collect::<Vec<&str>>();
  let metadata = collection.last().cloned().unwrap();
  let metadata_vec = metadata.split(";").map(|m| m.trim()).collect::<Vec<&str>>();
  return build_obj(&metadata_vec, &collection);
}

fn read_lines<P>(filename: P) -> Result<Lines<BufReader<File>>> where P: AsRef<Path> {
  let file = File::open(filename)?;
  return Ok(BufReader::new(file).lines())
}

fn build_obj(data: &Vec<&str>, top_level_data: &Vec<&str>) -> Metadata {
  let seq_name = top_level_data.get(0).expect("Row should have seqname");
  let feature = top_level_data.get(2).expect("Row should have feature");
  let start = top_level_data.get(3).expect("Row should have start");
  let end = top_level_data.get(4).expect("Row should have end");
  let strand = top_level_data.get(6).expect("Row should have strand");

  let mut metadata = Metadata {
    gene_id: String::new(),
    transcript_id: String::new(),
    gene_name: String::new(),
    transcript_type: String::new(),
    tags: Vec::new(),
    seq_name: seq_name.to_string(),
    feature: feature.to_string(),
    start: start.parse().expect("Not valid number for start"),
    end: end.parse().expect("Not valid number for end"),
    strand: strand.chars().next().unwrap(),
  };

  for value in data {
    if value.starts_with("gene_id") {
      metadata.gene_id = parse_value_from_metadata(value);
    }
    if value.starts_with("transcript_id") {
      metadata.transcript_id = parse_value_from_metadata(value);
    }
    if value.starts_with("transcript_type") {
      metadata.transcript_type = parse_value_from_metadata(value);
    }
    if value.starts_with("gene_name") {
      metadata.gene_name = parse_value_from_metadata(value);
    }
    if value.starts_with("tag") {
      metadata.add_tag(parse_value_from_metadata(value));
    }
  }
  return metadata;
}

fn parse_value_from_metadata(value: &&str) -> String {
  return value.split(' ').collect::<Vec<&str>>().get(1).expect("Should have 2 values").replace("\"", "");
}

fn save_to_disk(chromosomes: HashSet<String>, genes: HashMap<String, Gene>) {
  let all_genes: Vec<Gene> = genes.into_values().collect();
  for chr in chromosomes {
    let data: Vec<&Gene> = all_genes.iter().filter(|gene| gene.chr == chr).collect();
    // let encoded_data = serde_json::to_string(&data).expect("Could not serialize");
    let encoded_data = bincode::serialize(&data).expect("Could not encode vector");
    let path = format!("./results/{}.bin", chr);
    fs::write(path, encoded_data).expect("Could not write chr file");
  }
}