mod utils;
mod structures;

use js_sys::{ArrayBuffer, Uint8Array};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response};
use structures::Gene;
use bincode;


#[wasm_bindgen]
pub struct Region{
   pub start: usize,
   pub end: usize
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
  format!("Hello from Rust, {}!", name)
}

pub async fn fetch_bin_data(url: String) -> Result<Vec<u8>, JsValue> {
  let opts = RequestInit::new();
  opts.set_method("GET");
  let request = Request::new_with_str_and_init(&url, &opts)?;
  let window = web_sys::window().unwrap();
  let resp_value = JsFuture::from(window.fetch_with_request(&request)).await?;
  let resp: Response = resp_value.dyn_into().unwrap();
  let js_value_resp = JsFuture::from(resp.array_buffer()?).await?;
  let buffer: ArrayBuffer = js_value_resp.dyn_into().unwrap();

  let u8_array = Uint8Array::new(&buffer);
  let mut bytes = vec![0u8; u8_array.length() as usize];
  u8_array.copy_to(&mut bytes);
  return Ok(bytes);
}

#[wasm_bindgen]
pub async fn find_gene_pos(chr_name: &str, marker_symbol: &str) -> Result<Region, JsValue> {
  let url = format!("/chromosome-data/{}.bin", chr_name);
  let data: Vec<u8> = fetch_bin_data(url).await?;
  let gene_list: Vec<Gene> = bincode::deserialize(&data)
      .map_err(|e| JsValue::from_str(&format!("bincode error: {e}")))?;

  let match_gene = gene_list.iter().find(|&gene| gene.name.eq(marker_symbol));
  match match_gene {
    Some(gene) => Ok(Region {
      start: gene.start as usize,
      end: gene.end as usize
    }),
    None => Ok(Region {
      start: 0,
      end: 0
    })
  }
}
#[wasm_bindgen]
pub async fn get_all_gene_exons(chr_name: &str, marker_symbol: &str) -> Result<Vec<Region>, JsValue> {
  let url = format!("/chromosome-data/{}.bin", chr_name);
  let data: Vec<u8> = fetch_bin_data(url).await?;
  let gene_list: Vec<Gene> = bincode::deserialize(&data)
      .map_err(|e| JsValue::from_str(&format!("bincode error: {e}")))?;

  let match_gene = gene_list.iter().find(|&gene| gene.name.eq(marker_symbol));
  if let Some(gene) = match_gene {
    let exons = gene.transcripts
    .iter()
    .flat_map(|t| t.exons.iter().map(|e| Region {start: e.0 as usize, end: e.1 as usize }))
    .collect();
    return Ok(exons);
  } else {
    Ok(Vec::new())
  }
}