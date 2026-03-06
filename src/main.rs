pub mod structures;
pub mod preprocessing;
pub mod search;

use crate::preprocessing::{process_file};

fn main() {
  const GENCODE_FILE_PATH: &str = "./gencode.vM38.basic.annotation.gtf";
  process_file(GENCODE_FILE_PATH);
}
