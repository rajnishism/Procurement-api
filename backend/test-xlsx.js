import * as XLSX from "xlsx";
console.log("XLSX keys:", Object.keys(XLSX));
console.log("XLSX default keys:", XLSX.default ? Object.keys(XLSX.default) : "no default");
