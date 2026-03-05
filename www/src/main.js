import "./style.css";
import { greet } from "genome_browser_wasm";

document.querySelector("#title").innerHTML = `${greet("dev")}`;
