import React, { useState, useRef } from "react";
import { HotTable } from "@handsontable/react";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.css";
import * as XLSX from "xlsx";

export default function ExcelUI() {
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const hotRef = useRef(null);

    // 📂 Handle Excel Upload
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (evt) => {
            const binaryStr = evt.target.result;
            const workbook = XLSX.read(binaryStr, { type: "binary" });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            if (jsonData.length === 0) return;

            const cols = Object.keys(jsonData[0]);

            // Convert JSON → 2D array
            const data = jsonData.map((row) =>
                cols.map((col) => row[col])
            );

            setColumns(cols);
            setTableData(data);
        };

        reader.readAsBinaryString(file);
    };

    // 💾 Save Data
    const handleSave = () => {
        const data = hotRef.current.hotInstance.getData();

        // Convert back to JSON
        const json = data.map((row) => {
            let obj = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });

        console.log("Saved Data:", json);
        alert("Check console for saved data");
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Excel-like UI</h2>

            {/* Upload */}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />

            {/* Table */}
            <div style={{ marginTop: "20px" }}>
                <HotTable
                    ref={hotRef}
                    data={tableData}
                    colHeaders={columns}
                    rowHeaders={true}
                    width="100%"
                    height="400"
                    licenseKey="non-commercial-and-evaluation"
                    stretchH="all"
                    manualColumnResize={true}
                    manualRowResize={true}
                    filters={true}
                    dropdownMenu={true}
                    contextMenu={true}
                    minSpareRows={1}
                />
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                style={{ marginTop: "20px", padding: "10px 20px" }}
            >
                Save Data
            </button>
        </div>
    );
}