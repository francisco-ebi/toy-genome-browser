use std::fs::File;
use std::io::{BufRead, BufReader, Lines, Result};
use std::path::Path;
use crate::structures::Metadata;

pub fn process_line(line: String) {
  let collection: Vec<&str> = line.split("\t").collect::<Vec<&str>>();
  if collection.len() > 0 {
    let metadata = collection.last().cloned().unwrap();
    let metadata_vec = metadata.split(";").map(|m| m.trim()).collect::<Vec<&str>>();
    let metadata_obj = build_obj(&metadata_vec, &collection);
    dbg!(metadata_obj);
  }
}

pub fn read_lines<P>(filename: P) -> Result<Lines<BufReader<File>>>
where P: AsRef<Path>, {
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