pub mod structures;
pub mod preprocessing;

use crate::preprocessing::{process_line, read_lines};

fn main() {
    if let Ok(lines) = read_lines("./gencode.vM38.basic.annotation.gtf") {
      let mut line_index = 0;
      for line in lines.map_while(Result::ok) {
        if line_index < 5 {
          line_index += 1;
          continue;
        }
        process_line(line);
        line_index += 1;
        if line_index >= 20 {
          break;
        }
      }
    } else {
      println!("Error opening file");
    }
}
