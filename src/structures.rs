use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Gene {
  pub id: String,
  pub name: String,
  pub chr: String,
  pub start: u32,
  pub end: u32,
  pub strand: char,
  pub transcripts: Vec<Transcript>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Transcript {
  pub id: String,
  pub parent_gene_id: String,
  pub exons: Vec<(u32, u32)>,

}
#[derive(Debug)]
pub struct Metadata {
  pub gene_id: String,
  pub transcript_id: String,
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
  pub fn is_protein_coding(&self) -> bool {
    return self.transcript_type == "protein_coding";
  }
  pub fn is_canonical(&self) -> bool {
    return self.tags.iter().any(|t| t == "Ensembl_canonical");
  }
}