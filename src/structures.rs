use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Gene {
  pub id: String,
  pub name: String,
  pub start: u32,
  pub end: u32,
  pub strand: char,
  pub transcripts: Vec<Transcript>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Transcript {
  pub id: String,
  pub exons: Vec<(u32, u32)>,

}
#[derive(Debug)]
pub struct Metadata {
  pub gene_id: String,
  pub gene_name: String,
  pub transcript_type: String,
  pub tags: Vec<String>,
  pub seq_name: String,
  pub feature: String,
  pub start: u32,
  pub end: u32,
  pub strand: char,
}

impl Metadata {
  pub fn add_tag(&mut self, item: String) {
    self.tags.push(item);
  }
}