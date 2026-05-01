const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
    PageBreak, LevelFormat
} = require('docx');
const fs = require('fs');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const NAVY = "1F3864";
const STEEL = "2E6DA4";
const RUST = "C55A11";
const LBLUE = "D6E4F0";
const LRUST = "FCE4D6";
const LGREY = "F2F2F2";
const GREY = "404040";

const THIN = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const THICK = { style: BorderStyle.SINGLE, size: 8, color: "2E6DA4" };
const BOLD_B = { style: BorderStyle.SINGLE, size: 8, color: "C55A11" };
const ALLB = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const CELLS = { top: 80, bottom: 80, left: 120, right: 120 };
const CPAD = { top: 100, bottom: 100, left: 160, right: 160 };

// ─── Primitives ───────────────────────────────────────────────────────────────
const pb = () => new Paragraph({ children: [new PageBreak()] });
const sp = () => new Paragraph({ children: [new TextRun("")], spacing: { before: 80, after: 80 } });

function h1(t) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: t, bold: true, color: NAVY, size: 36, font: "Arial" })],
        spacing: { before: 480, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RUST, space: 8 } }
    });
}
function h2(t) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: t, bold: true, color: STEEL, size: 28, font: "Arial" })],
        spacing: { before: 340, after: 100 }
    });
}
function h3(t) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: t, bold: true, color: GREY, size: 24, font: "Arial" })],
        spacing: { before: 220, after: 80 }
    });
}
function body(t, opts = {}) {
    return new Paragraph({
        children: [new TextRun({ text: t, size: 22, font: "Arial", ...opts })],
        spacing: { before: 80, after: 80 },
        alignment: AlignmentType.JUSTIFIED
    });
}
function bul(t, lvl = 0) {
    return new Paragraph({
        numbering: { reference: "bul", level: lvl },
        children: [new TextRun({ text: t, size: 22, font: "Arial" })],
        spacing: { before: 40, after: 40 }
    });
}

// ─── Badge paragraph ──────────────────────────────────────────────────────────
function badge(label, value) {
    return new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [2160, 7200],
        rows: [new TableRow({
            children: [
                new TableCell({
                    borders: ALLB, width: { size: 2160, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: CELLS,
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })]
                }),
                new TableCell({
                    borders: ALLB, width: { size: 7200, type: WidthType.DXA }, shading: { fill: LBLUE, type: ShadingType.CLEAR }, margins: CELLS,
                    children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Arial" })] })]
                }),
            ]
        })]
    });
}

// ─── Callout box ─────────────────────────────────────────────────────────────
function callout(title, lines, accent = STEEL) {
    return new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
        rows: [new TableRow({
            children: [new TableCell({
                borders: {
                    top: { style: BorderStyle.SINGLE, size: 8, color: accent },
                    bottom: { style: BorderStyle.SINGLE, size: 8, color: accent },
                    left: { style: BorderStyle.SINGLE, size: 8, color: accent },
                    right: { style: BorderStyle.SINGLE, size: 8, color: accent }
                },
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: accent === RUST ? "FDF0E8" : "EBF3FB", type: ShadingType.CLEAR },
                margins: CPAD,
                children: [
                    new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22, font: "Arial", color: accent })], spacing: { after: 80 } }),
                    ...lines.map(l => new Paragraph({
                        numbering: { reference: "bul", level: 0 },
                        children: [new TextRun({ text: l, size: 20, font: "Arial" })],
                        spacing: { before: 40, after: 40 }
                    }))
                ]
            })]
        })]
    });
}

// ─── Data table ──────────────────────────────────────────────────────────────
function dtable(headers, rows, colWidths, headerBg = NAVY) {
    const w = colWidths || headers.map(() => Math.floor(9360 / headers.length));
    return new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: w,
        rows: [
            new TableRow({
                tableHeader: true,
                children: headers.map((h, i) => new TableCell({
                    borders: ALLB, width: { size: w[i], type: WidthType.DXA },
                    shading: { fill: headerBg, type: ShadingType.CLEAR }, margins: CELLS,
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: "FFFFFF" })], alignment: AlignmentType.CENTER })]
                }))
            }),
            ...rows.map((row, ri) => new TableRow({
                children: row.map((cell, ci) => new TableCell({
                    borders: ALLB, width: { size: w[ci], type: WidthType.DXA },
                    shading: { fill: ri % 2 === 0 ? "FFFFFF" : "F5F9FF", type: ShadingType.CLEAR }, margins: CELLS,
                    children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20, font: "Arial" })] })]
                }))
            }))
        ]
    });
}

// ─── Status table ─────────────────────────────────────────────────────────────
function stbl(rows) {
    const W = [4200, 2160, 3000];
    const statusColor = s =>
        s.includes("Complete") || s.includes("Historical") ? "E2EFDA" :
            s.includes("In Progress") || s.includes("Underway") ? "FFF2CC" :
                "F0F7FF";
    return new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: W,
        rows: [
            new TableRow({
                tableHeader: true, children:
                    ["Task / Deliverable", "Status", "Target Date"].map((h, i) => new TableCell({
                        borders: ALLB, width: { size: W[i], type: WidthType.DXA },
                        shading: { fill: STEEL, type: ShadingType.CLEAR }, margins: CELLS,
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
                    }))
            }),
            ...rows.map(([task, status, date], i) => new TableRow({
                children: [
                    new TableCell({ borders: ALLB, width: { size: W[0], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F5F5F5", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: task, size: 20, font: "Arial" })] })] }),
                    new TableCell({ borders: ALLB, width: { size: W[1], type: WidthType.DXA }, shading: { fill: statusColor(status), type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: status, size: 20, font: "Arial", bold: status.includes("Complete") })] })] }),
                    new TableCell({ borders: ALLB, width: { size: W[2], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F5F5F5", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: date, size: 20, font: "Arial" })] })] }),
                ]
            }))
        ]
    });
}

// ─── Timeline table ───────────────────────────────────────────────────────────
function tline(rows) {
    const W = [3240, 1800, 1800, 1440, 1080];
    return new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: W,
        rows: [
            new TableRow({
                tableHeader: true, children:
                    ["Milestone / Activity", "Start", "Completion", "Lead", "Duration"].map((h, i) => new TableCell({
                        borders: ALLB, width: { size: W[i], type: WidthType.DXA },
                        shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: CELLS,
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 19, font: "Arial", color: "FFFFFF" })] })]
                    }))
            }),
            ...rows.map(([task, start, end, lead, dur], i) => new TableRow({
                children: [
                    new TableCell({ borders: ALLB, width: { size: W[0], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F0F7FF", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: task, size: 19, font: "Arial" })] })] }),
                    new TableCell({ borders: ALLB, width: { size: W[1], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F0F7FF", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: start, size: 19, font: "Arial" })] })] }),
                    new TableCell({ borders: ALLB, width: { size: W[2], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F0F7FF", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: end, size: 19, font: "Arial" })] })] }),
                    new TableCell({ borders: ALLB, width: { size: W[3], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F0F7FF", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: lead, size: 19, font: "Arial" })] })] }),
                    new TableCell({ borders: ALLB, width: { size: W[4], type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? "FFFFFF" : "F0F7FF", type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: dur, size: 19, font: "Arial" })] })] }),
                ]
            }))
        ]
    });
}

// ─── Cover ────────────────────────────────────────────────────────────────────
function coverPage() {
    const irow = (l, v) => new TableRow({
        children: [
            new TableCell({ borders: ALLB, width: { size: 2520, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })] }),
            new TableCell({ borders: ALLB, width: { size: 6840, type: WidthType.DXA }, shading: { fill: LBLUE, type: ShadingType.CLEAR }, margins: CELLS, children: [new Paragraph({ children: [new TextRun({ text: v, size: 20, font: "Arial" })] })] }),
        ]
    });
    return [
        new Paragraph({ children: [new TextRun({ text: "CONFIDENTIAL  |  NOT FOR EXTERNAL DISTRIBUTION", size: 20, bold: true, color: RUST, font: "Arial" })], spacing: { before: 0, after: 640 }, alignment: AlignmentType.RIGHT }),
        // Accent bar
        new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [720, 8640], rows: [new TableRow({
                children: [
                    new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: 720, type: WidthType.DXA }, shading: { fill: RUST, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: " " })] })] }),
                    new TableCell({
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, width: { size: 8640, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 200, bottom: 200, left: 400, right: 200 }, children: [
                            new Paragraph({ children: [new TextRun({ text: "MESABI METALLICS COMPANY LLC", size: 52, bold: true, color: "FFFFFF", font: "Arial" })], spacing: { after: 60 } }),
                            new Paragraph({ children: [new TextRun({ text: "MESABI 2 — INDEPENDENT NEW IRON ORE MINE PROJECT", size: 30, bold: true, color: "FFD966", font: "Arial" })], spacing: { after: 40 } }),
                            new Paragraph({ children: [new TextRun({ text: "Nashwauk, Itasca County, Minnesota, USA", size: 22, color: "CCCCCC", font: "Arial" })] }),
                        ]
                    }),
                ]
            })]
        }),
        sp(), sp(),
        new Paragraph({ children: [new TextRun({ text: "Project Development Report", size: 30, bold: true, color: NAVY, font: "Arial" })], spacing: { before: 400, after: 40 }, alignment: AlignmentType.LEFT }),
        new Paragraph({ children: [new TextRun({ text: "Target Capacity: 9 MTPA  |  Independent Greenfield Mine  |  All Activities Commence May 2026", size: 22, color: STEEL, font: "Arial" })], spacing: { before: 0, after: 480 } }),
        new Paragraph({ children: [new TextRun("")], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RUST, space: 1 } }, spacing: { before: 40, after: 40 } }),
        sp(), sp(), sp(), sp(), sp(), sp(), sp(), sp(),
        new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [2520, 6840], rows: [
                irow("Project Name", "Mesabi 2 — New Iron Ore Mine Project"),
                irow("Owner", "Mesabi Metallics Company LLC (MMCL)"),
                irow("Location", "Nashwauk, Itasca County, Minnesota, USA — MMCL Expanded Land Position"),
                irow("Target Capacity", "9 MTPA total iron ore product (7.5 MTPA magnetite pellets + 1.5 MTPA hematite)"),
                irow("Mine Type", "Independent Greenfield Open-Pit Taconite/Hematite Iron Ore Mine"),
                irow("Mine Life Target", "25–30 years at full 9 MTPA production (resource to be confirmed by exploration)"),
                irow("Key Reference", "2012 NI 43-101 ESML Technical Report (Met-Chem Canada) — for geological context only"),
                irow("Report Status", "Internal Project Development Document — Confidential"),
                irow("All Work Commences", "May 2026"),
                irow("Target First Production", "Q1 2036"),
                irow("Report Date", "April 2026"),
            ]
        }),
        pb()
    ];
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
    numbering: {
        config: [{
            reference: "bul", levels: [
                { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }
            ]
        }]
    },
    styles: {
        default: { document: { run: { font: "Arial", size: 22, color: "000000" } } },
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial", color: STEEL }, paragraph: { spacing: { before: 340, after: 100 }, outlineLevel: 1 } },
            { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: GREY }, paragraph: { spacing: { before: 220, after: 80 }, outlineLevel: 2 } },
        ]
    },
    sections: [{
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: [

            ...coverPage(),

            // ══ 1. EXECUTIVE SUMMARY ════════════════════════════════════════════════
            h1("1. Executive Summary"),
            body("Mesabi Metallics Company LLC (MMCL) is developing Mesabi 2 as a completely independent, greenfield iron ore mine project on its expanded land position in Itasca County, Minnesota. Mesabi 2 is distinct from Mesabi 1 (the Phase 1 taconite mine currently in construction) in every material respect — it has its own separate mineral land parcels, requires independent geological exploration and resource estimation, needs its own full suite of regulatory permits, will be served by its own processing facilities, and is financed and operated as a standalone business unit. No resources, permits, infrastructure, or processing facilities from Mesabi 1 are attributed to or relied upon by Mesabi 2 for the purposes of this report."),
            sp(),
            body("Mesabi 2 targets a production capacity of 9 MTPA of iron ore product, comprising 7.5 MTPA of Direct Reduction (DR) grade magnetite taconite pellets and 1.5 MTPA of hematite product. The project is located on MMCL's expanded mineral land position — the GPIOP parcels and adjacent mineral rights restored to MMCL's control following the June 2024 arbitration award and the January 2025 Itasca County Court confirmation. This expanded land position sits within the proven Biwabik Iron Formation of the western Mesabi Iron Range, offering strong geological prospectivity for a new mine of the targeted scale."),
            sp(),
            body("All development activities for Mesabi 2 will commence from May 2026. The full development pathway — from initial exploration through environmental review, permitting, construction, and commissioning — is expected to span approximately 9 years and 8 months, with target first production in Q1 2036. The critical path runs through the mandatory Environmental Impact Statement (EIS) process, which is the longest and most resource-intensive component of the development timeline."),
            sp(),
            callout("Mesabi 2 — Project Snapshot", [
                "Mine Type: Independent Greenfield Open-Pit Taconite and Hematite Iron Ore Mine",
                "Location: MMCL Expanded Land Position — GPIOP and Adjacent Parcels, Itasca County, Minnesota",
                "Target Production: 9 MTPA total (7.5 MTPA DR-grade magnetite taconite pellets + 1.5 MTPA hematite product)",
                "Crude Ore Throughput: ~27 MTPY taconite ore + hematite ore feed",
                "Target Mine Life: 25–30 years (to be confirmed by exploration and resource estimation)",
                "Resource Definition: Requires new NI 43-101 compliant exploration and resource estimate",
                "Processing: Independent new concentrator, pellet plant, and tailings facility — no shared assets with Mesabi 1",
                "Regulatory Pathway: Full new Permit to Mine + full new EIS required (not amendment to Mesabi 1 permits)",
                "Capital Cost: To be estimated — expected to be broadly comparable to Mesabi 1 Phase 1 (~US$1.6–2.0B range, subject to FEED)",
                "All Work Commences: May 2026",
                "Target First Production: Q1 2036",
            ], STEEL),
            pb(),

            // ══ 2. WHAT IS MESABI 2? ════════════════════════════════════════════════
            h1("2. What is Mesabi 2?"),
            h2("2.1 Project Identity and Strategic Rationale"),
            body("Mesabi 2 is MMCL's second iron ore mine project, conceived as a standalone, independent mining operation on mineral land parcels separate from those underpinning the Mesabi 1 mine. The project does not expand Mesabi 1 — it is a distinct new mine with its own mine plan, its own resource base established through fresh exploration, its own processing infrastructure, and its own regulatory approvals obtained entirely independently."),
            sp(),
            body("The strategic rationale for Mesabi 2 is rooted in three factors. First, MMCL's expanded land position — secured through the June 2024 arbitration award confirming termination of Cliffs' mineral leases on the GPIOP parcels, and confirmed by the Itasca County Court in January 2025 — provides access to substantial mineral ground within the proven Biwabik Iron Formation that was previously unavailable. Second, the global transition to Electric Arc Furnace (EAF) steelmaking and the resulting demand growth for DR-grade pellets and Direct Reduced Iron (DRI) in North America, the Middle East and North Africa (MENA), and Europe creates a compelling long-term market opportunity for a second independent DR-grade pellet supply source. Third, developing Mesabi 2 as a separate legal and regulatory entity provides MMCL with operational, financial, and permitting optionality."),
            sp(),
            h2("2.2 Relationship to Mesabi 1"),
            body("Mesabi 2 and Mesabi 1 are geographically proximate — both located on the western Mesabi Iron Range near Nashwauk, Minnesota, on different parcels of MMCL's overall mineral portfolio. However, for all planning, regulatory, technical, and financial purposes, Mesabi 2 is treated as a completely independent project:"),
            dtable(
                ["Attribute", "Mesabi 1 (Existing Project)", "Mesabi 2 (This Report)"],
                [
                    ["Land Parcels", "Original MMCL / Langdon-Warren / J.A.G.E parcels", "GPIOP parcels + adjacent MMCL mineral rights (post-arbitration)"],
                    ["Production Target", "9 MTPA (7.5 Mtpa magnetite + 1.5 Mtpa hematite)", "9 MTPA (7.5 Mtpa magnetite + 1.5 Mtpa hematite) — independent"],
                    ["Resource Basis", "2012 NI 43-101 (Met-Chem Canada) — Mine 1 specific", "New NI 43-101 compliant exploration and estimation — Mine 2 only"],
                    ["Permit to Mine", "Existing amended PTM (March 2024 submission)", "New independent PTM application from scratch"],
                    ["Environmental Review", "Completed Phase 1 SEIS (2011); current amendments", "Full new EIS required — no pre-existing EIS coverage"],
                    ["Processing Facilities", "Mine 1 concentrator, pellet plant, and TSF", "New independent concentrator, pellet plant, and TSF"],
                    ["Water Permits", "Existing Water Appropriation Permits", "New independent Water Appropriation Permit application"],
                    ["Air Permits", "Existing MPCA air permit (amended 2024)", "New independent MPCA air permit application"],
                    ["Development Status", "Construction ongoing; commissioning June 2026", "Greenfield — all development from May 2026"],
                    ["First Production", "Mid-2026", "Q1 2036 (target)"],
                ],
                [2880, 3240, 3240]
            ),
            sp(),
            h2("2.3 Production Basis"),
            body("Mesabi 2 will produce 9 MTPA of iron ore product annually at full design throughput. This comprises two product streams:"),
            bul("7.5 MTPA: DR-grade magnetite taconite pellets produced from the Lower Cherty Member magnetite taconite ore, via autogenous grinding, magnetic separation, and reverse flotation to achieve <1.5% SiO2 concentrate quality, followed by straight-grate induration. This is identical in concept to the Mesabi 1 Phase 1 circuit, sized to reflect Mesabi 2's independent ore body and resource base."),
            bul("1.5 MTPA: Hematite product from the Upper Cherty Member hematite mineralisation on the Mesabi 2 land parcels and any accessible legacy hematite stockpile material within the Mesabi 2 area. The processing route (gravity and/or magnetic beneficiation) will be confirmed by metallurgical testwork as part of the Mesabi 2 development programme."),
            body("The crude taconite ore throughput required to sustain 7.5 MTPA magnetite pellet production is approximately 27 MTPY, based on the ~31% overall weight recovery established through historical testwork and Butler Taconite operations on the same geological formation. Hematite ore feed will be additional to this. Total mine material movement (ore + waste + overburden) will be confirmed through the Mesabi 2 mine plan study at approximately 27 MTPY ore + strip ratio waste (estimated at ~1.5–2.0:1 based on Mesabi Range comparables)."),
            pb(),

            // ══ 3. PROPERTY DESCRIPTION AND LAND POSITION ═══════════════════════════
            h1("3. Property Description and Land Position"),
            h2("3.1 Location"),
            body("Mesabi 2 is located in Itasca County, Minnesota, USA, within the western portion of the Mesabi Iron Range. The project area sits on MMCL's expanded mineral land portfolio — principally the former Glacier Park Iron Ore Properties (GPIOP) parcels previously under long-term lease to Cleveland-Cliffs Inc. (\"Cliffs\"), now fully restored to MMCL's control, together with adjacent mineral rights acquired by MMCL and its subsidiaries. The Mesabi 2 mineral parcels are located in and around the City of Nashwauk, broadly within the same regional geological corridor as Mesabi 1 but on distinct land parcels that are held and managed as a separate legal unit."),
            sp(),
            dtable(
                ["Location Attribute", "Detail"],
                [
                    ["Country / State", "United States of America — Minnesota"],
                    ["County", "Itasca County"],
                    ["Nearest Community", "City of Nashwauk, Minnesota (approximately 11,000 population in greater area)"],
                    ["Nearest Major City", "Hibbing, MN (~15–20 miles east); Grand Rapids, MN (~20–25 miles west"],
                    ["Highway Access", "US Highway 169; County Road 58; County Road 65 — existing paved access"],
                    ["Rail Access", "Canadian National (CN) and Burlington Northern Santa Fe (BNSF) mainlines via Itasca County Rail Authority (ICRRA) spur (proximity to be confirmed in FEED)"],
                    ["Port Access", "Port of Duluth and Port of Superior, ~106 miles east via CN/BNSF"],
                    ["Approximate Elevation", "1,350–1,450 ft above mean sea level (Mesabi Range plateau)"],
                    ["Latitude / Longitude", "Approximately 47°22'N, 93°12'W (precise coordinates to be confirmed by survey)"],
                ],
                [3000, 6360]
            ),
            sp(),
            h2("3.2 Mineral Land Position — GPIOP and Adjacent Parcels"),
            body("MMCL's expanded mineral land position — the foundation of Mesabi 2 — was secured through a multi-year process:"),
            bul("GPIOP Parcel Acquisition: MMCL and its subsidiaries purchased the former Glacier Park Iron Ore Properties (GPIOP) land parcels, which included mineral rights that had been under long-term lease to Cliffs. Due to continued defaults by Cliffs on lease obligations, MMCL terminated these leases in October 2023."),
            bul("Arbitration Award: Following Cliffs' contestation of the termination, a three-arbitrator panel confirmed in June 2024 that MMCL had rightfully terminated all GPIOP mineral leases, restoring full mineral control of these parcels to MMCL."),
            bul("Court Confirmation: In January 2025, the Itasca County District Court confirmed the arbitration award, providing legally binding certainty on MMCL's mineral ownership and control of the GPIOP parcels. This constitutes the formal land position basis for Mesabi 2."),
            bul("Adjacent Mineral Rights: In addition to the GPIOP parcels, MMCL holds or is evaluating additional mineral rights on adjacent parcels through leases with the Langdon-Warren Group, J.A.G.E. Enterprise LLC, and potentially other minor mineral interests within the Mesabi 2 project boundary."),
            sp(),
            body("Note: The precise boundary, acreage, and mineral lease terms applicable to the Mesabi 2 project area must be formally confirmed and legally documented as a pre-requisite to the project (see Section 6 — Pre-Requisites). Most mineral leases in Minnesota cover 30- to 40-year renewable terms with Minimum Royalty payments and earned royalties on crude taconite mined. Confirmation of lease status, renewal terms, and royalty obligations for all Mesabi 2 parcels is a high-priority early task."),
            sp(),
            h2("3.3 Surface Rights"),
            body("In Minnesota, mineral rights are severed from surface rights. MMCL's mineral leases cover the right to mine the iron formation but do not automatically confer surface rights. Surface ownership across the Mesabi 2 project area includes a mix of private land, state-managed land (Minnesota Department of Natural Resources), county-managed land, and municipal land. A detailed surface ownership assessment must be completed as part of the pre-exploration phase to identify surface access requirements, easement negotiations, and potential land acquisition needs for mine site roads, waste stockpiles, processing facilities, and tailings storage."),
            pb(),

            // ══ 4. GEOLOGY AND MINERALISATION ════════════════════════════════════════
            h1("4. Geology and Mineralisation"),
            h2("4.1 Regional Geological Setting"),
            body("Mesabi 2 is located within the Mesabi Iron Range of northern Minnesota, one of the world's premier iron ore districts with over a century of continuous production. The regional geological framework is well-characterised through extensive public domain mapping, academic research, and historical mining data held by the Minnesota Department of Natural Resources (DNR) and the Minnesota Geological Survey."),
            body("The Mesabi Iron Range extends for approximately 120 miles (193 km) from Grand Rapids in the west to Babbitt in the east. The iron-bearing formation strikes broadly E-NE with a shallow, consistent S-SE dip of approximately 3–8 degrees, providing excellent continuity and predictability across the range. The formation has been the principal source of iron ore in the United States for over 150 years and continues to be mined by US Steel (Minntac, Keetac), Cleveland-Cliffs (Hibbing Taconite), and Mesabi Metallics (Mesabi 1) under the name Biwabik Iron Formation."),
            sp(),
            h2("4.2 The Biwabik Iron Formation"),
            body("The Biwabik Iron Formation is a Lake Superior-type Banded Iron Formation (BIF) of Proterozoic Age (approximately 1.9 billion years old). It is characterised by rhythmically alternating bands of iron oxide-rich chert and iron silicate-rich slaty layers. The formation is subdivided into four principal stratigraphic members, of which two are economically significant for Mesabi 2:"),
            dtable(
                ["Stratigraphic Unit", "Ore Type", "Economic Significance", "Processing Route"],
                [
                    ["Lower Cherty Member (LC4A, LC4B, LC4C, LC5A)", "Magnetite taconite", "Primary ore target for 7.5 MTPA magnetite pellet production", "Crushing → AG grinding → LIMS → Flotation → Induration"],
                    ["Upper Cherty Member — UC2 Layer", "Hematite (martite)", "Secondary ore for 1.5 MTPA hematite product stream", "Hematite beneficiation — gravity/magnetic (to be confirmed by testwork)"],
                    ["Lower Slaty Member", "Low grade / waste", "Generally below economic cut-off; some inclusion possible", "Waste management"],
                    ["Upper Slaty Member", "Low grade / waste", "Generally below economic cut-off grade", "Waste management"],
                ],
                [2520, 1560, 2880, 2400]
            ),
            sp(),
            h2("4.3 Primary Ore — Magnetite Taconite (Lower Cherty Member)"),
            body("The magnetite taconite in the Lower Cherty Member is the dominant ore type and the principal feedstock for the Mesabi 2 concentrator. Key geological characteristics established through decades of drilling and the Mesabi 1 ore body assessment provide a strong analogue for Mesabi 2:"),
            bul("The ore consists principally of quartz (chert) and magnetite, with subordinate hematite, minnesotaite, stilpnomelane, greenalite, calcite, ankerite, and siderite as gangue minerals."),
            bul("Average in-situ grades on the Mesabi Range (based on comparable operations) range from approximately 19–22% MagFe, 30–33% TotFe, with weight recoveries of 27–33% by Davis Tube test."),
            bul("The ore is amenable to fine grinding (AG mills) to achieve liberation, followed by low-intensity wet drum magnetic separation (LIMS) and reverse amine flotation for silica reduction to DR-grade concentrate (<1.5% SiO2 concentrate grade)."),
            bul("In-situ density: approximately 11.0 cubic feet per long ton for Lower Cherty ore (established by Archimedes method on comparable Mesabi Range samples)."),
            bul("Geotechnical slope angle: approximately 45 degrees overall final pit slope applicable to ore and waste rock; approximately 17–19 degrees for overburden slopes. These parameters are consistent across the western Mesabi Range and will be confirmed by site-specific geotechnical investigation."),
            bul("The Butler Taconite operations (1967–1985) on the immediately adjacent Mesabi 1 area operated at consistent recovery above Davis Tube test predictions, with this \"plant gain\" attributable to partial recovery of liberated hematite in the magnetic circuit in addition to magnetite. This operational precedent supports confident metallurgical assumptions for Mesabi 2 exploration and mine planning."),
            sp(),
            h2("4.4 Secondary Ore — Hematite (Upper Cherty Member)"),
            body("The Upper Cherty Member (UC2) hematite mineralisation is distributed across the Mesabi Range overlying the Lower Cherty magnetite taconite. On the Mesabi 1 land parcels, an M&I hematite resource of approximately 290 million metric tonnes at 30.74% TotFe was estimated in the 2012 NI 43-101 report. The GPIOP parcels (Mesabi 2 area) are expected to host a comparable hematite mineralisation target, subject to new exploration confirmation. Testwork at COREM on Mesabi Range hematite concentrate has confirmed successful recovery through appropriate beneficiation."),
            sp(),
            h2("4.5 Geological Prospectivity Assessment for Mesabi 2"),
            body("The Mesabi 2 land parcels lie within the same proven geological belt as the Mesabi 1 operation and as multiple producing taconite mines (Minntac, Keetac, Hibbing Taconite, United Taconite). The following geological indicators support the Mesabi 2 exploration target:"),
            bul("Historical drilling data held by the MN DNR and the Minnesota Geological Survey from the Butler Taconite era and subsequent exploration is publicly available and provides geological guidance for Mesabi 2 drill targeting."),
            bul("The Biwabik Iron Formation is continuous and well-characterised across the Mesabi 2 project area based on outcrop mapping, aeromagnetic surveys, and historical borehole data."),
            bul("The GPIOP parcels were previously explored by Cliffs (Cleveland-Cliffs and predecessors) and historical drill data from that programme may be available through the MN DNR public archives, providing additional geological intelligence ahead of Mesabi 2's own drilling programme."),
            bul("Cut-off grade of 14% MagFe (established through the 2012 economic optimisation for the adjacent Mesabi 1 area) is expected to be applicable to Mesabi 2 given comparable ore type, processing route, and economic parameters."),
            body("Important caveat: All geological statements in this section are based on the known regional geological framework and publicly available data. A project-specific geological assessment, new drilling programme, and NI 43-101 compliant resource estimation must be completed before any mineral resource or reserve can be attributed to Mesabi 2. No resource figure is claimed or inferred for Mesabi 2 at this stage."),
            pb(),

            // ══ 5. MINERAL RESOURCE — EXPLORATION PLAN ══════════════════════════════
            h1("5. Mineral Resource Assessment and Exploration Plan"),
            h2("5.1 Resource Requirement"),
            body("To sustain 9 MTPA of production (27 MTPY crude taconite ore) over a 25-year mine life, Mesabi 2 requires a mineral reserve base of approximately 675 million metric tonnes of proven and probable ore at approximately 14% MagFe cut-off grade or better. To underpin a 30-year mine life at the same throughput, approximately 810 million metric tonnes is required. The exploration programme must therefore be designed to delineate a resource substantially larger than this reserve target (typically 1.2–1.5× the reserve requirement at the resource stage) — that is, a Measured and Indicated resource of approximately 900–1,200 million metric tonnes or more."),
            body("Based on the geological prospectivity and the analogue of the 2012 NI 43-101 data for the broader Mesabi Range property (which defined approximately 1,768 Mmt of magnetite M&I resource on the Mesabi 1 parcels alone), the GPIOP and adjacent Mesabi 2 parcels are considered geologically capable of supporting a resource in this range, subject to drilling confirmation."),
            sp(),
            h2("5.2 Exploration Phase Structure"),
            h3("Phase 1 — Desktop Review and Historical Data Compilation (May 2026 – Sep 2026)"),
            body("Before any field work, MMCL will compile and evaluate all available geological information on the Mesabi 2 parcels:"),
            bul("Review of all historical drill hole data on GPIOP and adjacent parcels from MN DNR / Minnesota Geological Survey public archives"),
            bul("Compilation of historical geological maps, cross-sections, geophysical data (aeromagnetic, gravity), and geochemical surveys"),
            bul("Review of historical exploration reports prepared by Cliffs and predecessors (where accessible through public records)"),
            bul("Structural interpretation and 3D geological model construction from existing data using MineSight / Maptek or equivalent software"),
            bul("Identification of drill targets and priority areas; design of the Phase 2 diamond drilling programme"),
            bul("Preparation of an Exploration Plan Summary for submission to the MN DNR"),
            sp(),
            h3("Phase 2 — Permit Applications for Exploration (Sep 2026 – Jan 2027)"),
            body("The following permits are required before drilling can commence:"),
            stbl([
                ["Exploration Plan Submission — MN DNR (drilling plan, site access, waste containment)", "Planned", "September 2026"],
                ["MN DNR Exploration Permit — Review and Approval (4-month typical timeline)", "Planned", "September 2026 – January 2027"],
                ["Notification of Intent to Drill — MN DNR (minimum 10 days before drilling)", "Planned", "January 2027"],
                ["Water Use Permit (if dewatering required during drilling)", "Planned", "November 2026 – January 2027"],
                ["Surface Access Agreements with landowners / land managers", "Planned", "Sep 2026 – Jan 2027"],
            ]),
            sp(),
            h3("Phase 3 — Diamond Drilling Programme (February 2027 – February 2028)"),
            body("A systematic diamond drilling programme designed to convert the geological prospectivity of the Mesabi 2 parcels into a NI 43-101 compliant Measured and Indicated mineral resource estimate. Programme parameters:"),
            dtable(
                ["Drilling Parameter", "Specification"],
                [
                    ["Total Planned Holes", "60–80 diamond drill holes (NQ / HQ core diameter)"],
                    ["Drill Hole Spacing", "750 ft (230 m) centres for Indicated category; 500 ft (150 m) centres for Measured category"],
                    ["Target Depth", "400–800 ft (120–245 m) per hole to fully penetrate Lower Cherty Member"],
                    ["Core Recovery Target", ">95% core recovery; full logging and photography of all intervals"],
                    ["Total Drilled Metres", "Estimated 24,000–40,000 metres total"],
                    ["Field Duration", "12 months (February 2027 – February 2028); 3–4 drill rigs operating simultaneously"],
                    ["Downhole Surveys", "Deviation surveys on all holes; gyroscopic survey on selected holes"],
                    ["Sampling Protocol", "Full split for all iron formation intervals; specific gravity measurements on 10% of samples"],
                ],
                [3240, 6120]
            ),
            sp(),
            body("QA/QC programme: Minimum 10% duplicate samples, 5% certified reference material (SRM) standards, 3% blank samples inserted into sample stream. Samples assayed at an ISO 9001 certified laboratory (e.g., Lerch Brothers Analytical Laboratory or equivalent); 5% of samples sent to secondary umpire laboratory for verification."),
            sp(),
            h3("Phase 4 — Resource Estimation and NI 43-101 Report (March 2028 – September 2028)"),
            body("Following drilling completion and assay receipt:"),
            bul("Database compilation, validation, and quality control review by a Qualified Person (QP)"),
            bul("Geological modelling: construction of 3D ore body solids for Lower Cherty Member layers (LC4A, LC4B, LC4C, LC5A) and Upper Cherty Member hematite (UC2)"),
            bul("Statistical analysis of grade distributions; variogram modelling; block model construction"),
            bul("Grade interpolation using Ordinary Kriging (OK) and Inverse Distance Weighting (IDW) methods"),
            bul("Resource classification per CIM (2019) Best Practice Guidelines: Measured, Indicated, Inferred categories based on drill hole spacing and geological confidence"),
            bul("Pit optimisation (Lerchs-Grossman algorithm) to convert resources to reserves at appropriate economic parameters"),
            bul("Preparation of a full NI 43-101 compliant Technical Report by independent QPs"),
            bul("Target: Defined Measured and Indicated resource of minimum 900 Mmt at ≥14% MagFe, supporting 25+ year mine life at 9 MTPA"),
            pb(),

            // ══ 6. PRE-REQUISITES FOR MINE 2 DEVELOPMENT ════════════════════════════
            h1("6. Pre-Requisites for Mesabi 2 Development"),
            body("The following pre-requisites must be satisfied, broadly in sequence, before Mesabi 2 can advance to each subsequent development stage. They represent the critical dependencies that will define the overall project timeline."),
            sp(),
            h2("6.1 Legal and Mineral Rights Pre-Requisites"),
            stbl([
                ["Formal legal confirmation of MMCL mineral ownership/control of all Mesabi 2 parcels", "Required before any exploration spending", "June 2026"],
                ["Legal review of all mineral lease terms: duration, royalty, renewal, and default provisions", "Required before exploration expenditure commitment", "July 2026"],
                ["Surface access agreements with all affected landowners (private, county, state)", "Required before field work commences", "January 2027"],
                ["Mineral lease consolidation and gap-filling — identify and acquire any parcels within Mesabi 2 boundary not yet controlled by MMCL", "Required for contiguous mine plan boundary", "Ongoing from May 2026"],
                ["Corporate structure determination for Mesabi 2 (subsidiary, JV, or wholly owned MMCL entity)", "Required for permit applications and financing", "September 2026"],
            ]),
            sp(),
            h2("6.2 Regulatory and Permitting Pre-Requisites"),
            stbl([
                ["Exploration Plan approval from MN DNR (required before drilling commences)", "Required before drilling", "January 2027"],
                ["Notification of Intent to Drill filed with MN DNR (10+ days before first drill)", "Required before drilling", "January 2027"],
                ["Full NI 43-101 compliant Mineral Resource and Reserve Estimate — independent QPs", "Required before PTM application and EIS", "September 2028"],
                ["Completed Mesabi 2 Mine Plan (life-of-mine schedule, pit design, waste management)", "Required for PTM and EIS", "June 2029"],
                ["Environmental Assessment Worksheet (EAW) submitted to MN DNR", "Initiates formal EIS process", "September 2029"],
                ["Completed Environmental Baseline Dataset (air, water, wetlands, ecology, cultural)", "Required for EIS", "September 2030"],
                ["Full EIS adequacy decision and State Record of Decision (MN DNR)", "Required before PTM and operational permits", "March 2033"],
                ["Federal Record of Decision (USACE — Section 404)", "Required before ground disturbance", "June 2033"],
                ["Permit to Mine — New Application Approval (MN DNR)", "Required before mine construction", "September 2033"],
                ["MPCA Air Quality Permit — New Application Approval", "Required before plant construction", "December 2033"],
                ["Water Appropriation Permit — New Application Approval (MN DNR)", "Required before operations", "September 2033"],
                ["Dam Safety Permit — TSF Design Approval (MN DNR)", "Required before TSF construction", "December 2033"],
            ]),
            sp(),
            h2("6.3 Technical Pre-Requisites"),
            stbl([
                ["Updated block model with Mesabi 2 drilling data (Maptek / MineSight)", "Required for mine plan and resource estimate", "February 2028"],
                ["Metallurgical testwork programme — bench and pilot scale (magnetite circuit)", "Required for concentrator design", "January 2029"],
                ["Metallurgical testwork programme — hematite beneficiation circuit", "Required for hematite processing design", "January 2029"],
                ["Pelletizing testwork (pot grate and/or pilot scale) — COREM or equivalent", "Required for pellet plant design", "March 2029"],
                ["Geotechnical investigation — pit slopes, foundations, stockpiles, tailings", "Required for mine design and dam safety permit", "June 2029"],
                ["Hydrogeological investigation — groundwater model, pit inflow estimates, water balance", "Required for water appropriation permit and EIS", "September 2029"],
                ["Tailings characterisation — geochemical and physical properties (ARD assessment)", "Required for TSF design and NPDES permit", "September 2029"],
                ["Phase 2 FEED and updated capital cost estimate (AACE Class 2)", "Required for financing and construction contracts", "September 2034"],
            ]),
            sp(),
            h2("6.4 Financial Pre-Requisites"),
            stbl([
                ["AACE Class 4–5 conceptual capital cost estimate (updated from 2012 reference — ~US$1.6–2.0B range)", "Required for project sanction decision", "December 2028"],
                ["AACE Class 2 capital cost estimate (from FEED)", "Required for financing close and EPC contracts", "September 2034"],
                ["Financial model: mine economics, NPV, IRR, payback (based on updated operating costs)", "Required for project sanction and investor presentation", "March 2029"],
                ["Offtake or marketing agreements for Mesabi 2 product (DR-grade pellets and hematite)", "Required before project sanction", "From 2031"],
                ["Financing arrangement — equity, debt, or hybrid (project finance or corporate debt)", "Required before construction commencement", "December 2034"],
                ["Financial Assurance Documents for MN DNR (surety bond or equivalent for reclamation)", "Required before PTM issuance", "August 2033"],
            ]),
            pb(),

            // ══ 7. MINING METHOD AND MINE PLAN ══════════════════════════════════════
            h1("7. Mining Method and Mine Plan"),
            h2("7.1 Mining Method — Open Pit Truck and Shovel"),
            body("Mesabi 2 will employ conventional open-pit truck and shovel mining, identical in principle to all other operating taconite mines on the Mesabi Range and consistent with the Mesabi 1 methodology. The flat topography, sub-horizontal ore body geometry, and relatively shallow ore depth are ideally suited to open-pit extraction."),
            body("Key mine design parameters, based on Mesabi Range standard practice and applicable to the Mesabi 2 area pending site-specific confirmation:"),
            dtable(
                ["Design Parameter", "Value / Assumption", "Basis"],
                [
                    ["Overall final pit slope — ore/waste", "45 degrees", "Mesabi Range standard; to be confirmed by geotechnical study"],
                    ["Overburden slope", "18–19 degrees", "MN DNR standard for overburden stockpiles"],
                    ["Waste rock stockpile slope", "22 degrees", "MN DNR standard"],
                    ["Catch bench width (ore/waste)", "25 ft (7.6 m) every 40 ft bench", "Mesabi Range standard"],
                    ["Bench height", "40 ft (12.2 m)", "Standard taconite bench height"],
                    ["Maximum in-pit ramp slope", "8–10%", "Equipment operating limit"],
                    ["Minimum mining width", "200 ft (61 m)", "Mesabi Range standard"],
                    ["Haul truck capacity", "320-tonne autonomous (Komatsu)", "MMCL technology standard (per Mesabi 1 preference)"],
                    ["Haul road runway width", "120 ft (36.6 m)", "AHS truck 4.4 × body width + berms; MMCL standard"],
                    ["Mining schedule", "24 hours/day, 7 days/week, 2 × 12-hour shifts", "Taconite industry standard"],
                    ["Annual operating days", "350 days/year (15 days weather outage)", "Minnesota climate allowance"],
                    ["Cut-off grade", "14% MagFe (indicative)", "Consistent with 2012 economic optimisation on adjacent property; to be confirmed by Mesabi 2 economics"],
                    ["Strip ratio (indicative)", "~1.5–2.0:1 (waste+OB / ore)", "Based on Mesabi Range comparables; to be confirmed by mine plan"],
                ],
                [3000, 3240, 3120]
            ),
            sp(),
            h2("7.2 Autonomous Haulage System (AHS)"),
            body("MMCL's confirmed technology direction is to deploy Komatsu 320-tonne Autonomous Haulage System trucks throughout all phases of Mesabi 2 mine development — pre-stripping, stripping, and production. AHS offers compelling advantages for a new mine development in northern Minnesota:"),
            bul("Reduced labour costs and workforce size requirements — particularly relevant given the challenge of recruiting and retaining qualified heavy equipment operators in a remote location"),
            bul("Improved operational consistency and reduced cycle time variability — directly benefits pellet plant feed rate stability"),
            bul("Lower fuel consumption per tonne moved versus manually operated trucks at equivalent payload — positive impact on operating costs and greenhouse gas intensity"),
            bul("Enhanced safety performance — elimination of human fatigue-related incidents in haulage operations"),
            bul("Air quality benefits — AHS trucks operating at optimised speeds and cycles produce lower cycle-average emissions per tonne hauled, potentially reducing the PSD air modelling impact relative to manually operated fleet"),
            body("AHS design specifications confirmed for Mesabi 2 planning: Komatsu 930E-5 or equivalent 320-tonne AHS truck; outside body width 27.0 ft; road width criteria 4.4 × body width = 120 ft runway; 20 ft berm width (6 ft tall)."),
            sp(),
            h2("7.3 Mine Plan Development — To Be Initiated May 2026"),
            body("The Mesabi 2 Life-of-Mine (LOM) schedule will be developed following completion of the resource estimation (target September 2028). The mine plan will establish:"),
            bul("Pit phase design — multiple mining phases to manage pre-stripping requirements and ore grade sequencing"),
            bul("Annual mine production schedules — ore, waste rock, and overburden by material type and destination"),
            bul("Equipment fleet requirements by year — drill, blast, load, haul, support"),
            bul("Waste rock and overburden stockpile locations and capacities (outside final pit limits where possible)"),
            bul("Haul road network design — connections between active pit phases, stockpiles, primary crusher, and waste dumps"),
            bul("Mine dewatering requirements — pit inflow estimates and dewatering infrastructure (sumps, pumps, pipelines)"),
            bul("LOM physicals in tabular and graphical format: material volumes, strip ratios, ore quality profile, equipment hours"),
            body("Mine plan development will be completed by an experienced mine engineering consultant (proposed: Stantec Consulting or equivalent) working from the Mesabi 2 block model and resource estimate. The mine plan is the primary input to the EIS project description, the PTM application, and the FEED."),
            pb(),

            // ══ 8. MINERAL PROCESSING AND PRODUCT ════════════════════════════════════
            h1("8. Mineral Processing and Product"),
            h2("8.1 Processing Overview"),
            body("Mesabi 2 will include a fully independent processing facility — a standalone Concentrator, Pellet Plant, and associated infrastructure — with no dependency on or shared use of Mesabi 1 processing assets. The processing concept is proven and directly analogous to Mesabi 1, with modifications to reflect Mesabi 2's independent resource base and any improvements identified through the Mesabi 2 metallurgical testwork programme."),
            sp(),
            h2("8.2 Magnetite Taconite Processing Circuit"),
            h3("8.2.1 Crushing"),
            body("Run-of-mine (ROM) ore (nominally -8.5 inch / 216 mm from blasting) is delivered to the primary crusher. A 60-inch × 89-inch gyratory primary crusher (or equivalent) reduces ore to a product suitable for secondary crushing and dry cobbing. Secondary and tertiary crushing stages produce grizzly oversize (coarse ore storage, COS) and grizzly undersize (fine ore storage, FOS) streams. A dry cobbing stage using dry belt magnetic cobbers upgrades the fine ore fraction from its run-of-mine grade to the concentrator feed grade, rejecting approximately 6–7% of the feed as non-magnetic waste with very low iron recovery loss. Cobber reject will be stockpiled for sale as road aggregate or aggregate products."),
            h3("8.2.2 Grinding and Concentration"),
            body("The concentrator design consists of three parallel processing lines, each contributing approximately 2.5 Mtpa of pellet equivalent throughput:"),
            bul("Primary Autogenous (AG) grinding mills fed by a blend of COS and cobber product at approximately 19.82 Mtpa combined AG mill feed; specific energy approximately 10.9 kWh/long ton (confirmed by 2005 pilot testing and ESML/Butler Taconite operational data)"),
            bul("Rougher magnetic separation using Low-Intensity Wet Drum Magnetic Separators (LIMS) following each grinding stage to separate magnetite concentrate from tailings"),
            bul("Ball mill regrinding of the rougher magnetic concentrate followed by finisher LIMS magnetic separation"),
            bul("Fine screen classification (Derrick fine screens) in closed circuit with the ball mill — recommended over cyclones based on 2005 pilot test results showing coarser grind P80 at 45 µm with equivalent or better concentrate quality"),
            bul("Reverse amine flotation circuit for silica rejection on the finisher magnetic concentrate — reducing SiO2 from ~4–5% to <1.5% for DR-grade product"),
            h3("8.2.3 Concentrate Dewatering and Slurry Transport"),
            body("Concentrate thickeners and vacuum disk filters dewater the flotation product to approximately 9–10% moisture for pellet plant feed. Dewatered concentrate is slurried and pumped via a dedicated 3.5 km rubber-lined slurry pipeline to the Mesabi 2 pellet plant. Two independent pump trains (duty/standby) provide redundancy."),
            sp(),
            h2("8.3 Pellet Plant"),
            body("The Mesabi 2 pellet plant is a standalone facility designed for 7.5 Mtpa of DR-grade pellet production:"),
            bul("Slurry storage tanks at the pellet plant provide surge capacity (approximately 32,000 mt combined, equivalent to ~37 hours of production) between the concentrate pipeline and the pelletizing system"),
            bul("Seven (7) vacuum disk filters dewater concentrate to appropriate balling moisture (~9%); additives (bentonite binder, limestone for basicity control) are blended in a high-intensity mixer"),
            bul("Eleven (11) 25-foot balling discs produce green balls at design size (9–16 mm); roller screens remove undersize and oversize; on-size green balls are distributed uniformly on the induration grate"),
            bul("Straight-grate induration machine (744 m² grate area; Dravo/Outotec type or equivalent; design capacity 7 Mtpa BF/DR pellets) — hearth and side layer system protects grate from high-temperature damage"),
            bul("Emission control equipment per BACT requirements: Low NOx natural gas burners; Gas Suspension Absorber semi-dry scrubber (SO2, fluorides, acid gases); fabric filter baghouses (hood and windbox exhaust, PM/PM10/PM2.5 control); activated carbon injection (mercury control per Minnesota TMDL requirements)"),
            bul("Product pellets conveyed to five (5) 4,000 mt product silos; continuous precision train loading (180 cars × 100 mt per train = 18,000 mt per train)"),
            sp(),
            h2("8.4 Hematite Processing Circuit"),
            body("The Mesabi 2 hematite processing circuit is an independent unit operation for the Upper Cherty Member hematite ore and any accessible legacy hematite stockpile material within the Mesabi 2 area. The specific processing route will be confirmed by the metallurgical testwork programme, but is expected to incorporate:"),
            bul("Hematite ore mining coordinated with the main pit mining sequence — separate ore handling from Lower Cherty magnetite"),
            bul("Crushing and size reduction appropriate to hematite liberation characteristics"),
            bul("Gravity separation (jigs, spirals, or dense medium) and/or low-intensity magnetic separation to produce a hematite concentrate"),
            bul("Hematite product drying, handling, and loadout — potentially as a direct-ship or sinter-feed product rather than pellets (to be confirmed by testwork and market assessment)"),
            bul("Target: 1.5 MTPA of hematite product with minimum 58–62% TotFe"),
            sp(),
            h2("8.5 Tailings Management"),
            body("All process tailings from the Mesabi 2 concentrator will be managed in a dedicated Mesabi 2 tailings storage facility (TSF) — completely independent of any Mesabi 1 tailings basin. Key TSF requirements:"),
            bul("Site selection: TSF sited to minimise environmental impact, avoid significant wetlands and waterways, and maximise storage capacity within the Mesabi 2 land boundary — to be determined through EIS alternatives analysis"),
            bul("Design capacity: minimum 25–30 years of tailings at 9 MTPA throughput (approximately 400–500 million metric tonnes of tailings storage required)"),
            bul("Tailings pipeline: approximately 6 km from concentrator to TSF in 24-inch rubber-lined pipe; duty/standby pump redundancy"),
            bul("Zero liquid discharge: reclaim water from TSF returned to concentrator process to minimise fresh water demand and eliminate surface water discharge"),
            bul("Embankment design: phased construction consistent with MAC (2017) guidelines and MN DNR Dam Safety requirements; full geotechnical, hydrologic, and seismic stability analysis required"),
            pb(),

            // ══ 9. PROJECT INFRASTRUCTURE ════════════════════════════════════════════
            h1("9. Project Infrastructure Requirements"),
            h2("9.1 Power Supply"),
            body("Mesabi 2 will require an independent power supply arrangement for its full load of approximately 150–160 MW (comparable to Mesabi 1 Phase 1). Minnesota Power's regional 230 kV transmission grid currently serves multiple large taconite operations in the area and is assessed as capable of accommodating an additional Mesabi 2 load, subject to transmission system studies and utility capacity confirmation during the FEED phase."),
            bul("Two new main substations (230 kV / 13.8 kV) at the Mesabi 2 concentrator and pellet plant sites — to be owned by MMCL or by the City of Nashwauk under a utility agreement"),
            bul("New transmission line connection from the existing 230 kV grid to the Mesabi 2 site (distance and routing to be confirmed by FEED; expected 5–15 km)"),
            bul("On-site power distribution at 13.8 kV / 4.16 kV / 480V / 208V consistent with taconite plant industry standards"),
            bul("Back-up diesel generation for critical loads (process control, safety systems)"),
            sp(),
            h2("9.2 Water Supply and Management"),
            body("Mesabi 2 requires an independent water management system. Key water supply and demand considerations:"),
            bul("Primary process water source: pit dewatering water from active Mesabi 2 mine pits (groundwater inflow to open pits) — supplemented by on-site stormwater collection and retention"),
            bul("Mine pit dewatering: Water Appropriation Permit from MN DNR required for all high-capacity wells and pit dewatering pumps. Aquifer testing programme required prior to permit application."),
            bul("Tailings reclaim water: primary internal process water recycling loop returns clarified reclaim water from TSF to concentrator, significantly reducing fresh water make-up requirements"),
            bul("Zero liquid surface discharge design: all process water contained within mine area; stormwater management system designed for 100-year 24-hour event with zero off-site discharge"),
            bul("Potable water: City of Nashwauk municipal water supply (new service connection agreement required) for domestic use at Mesabi 2 facilities"),
            sp(),
            h2("9.3 Road and Rail Access"),
            body("Mesabi 2 will require independent access infrastructure:"),
            bul("Public access roads: US Highway 169 and the existing County Road network (County Roads 58 and 65) provide primary access to the Mesabi 2 area. Road use agreements or upgrades may be required to accommodate heavy construction and operational traffic."),
            bul("On-site mine roads: new primary haul roads from the pit to the crusher at 120-foot runway width for AHS trucks; secondary access roads to waste dumps, stockpiles, and facilities"),
            bul("Rail access: a new spur connection from the nearest ICRRA/CN/BNSF rail infrastructure to the Mesabi 2 pellet plant site will be required for outbound product shipment and inbound materials (limestone, bentonite, spare parts). Spur length and routing to be determined in FEED."),
            bul("Plant site causeway: if the Mesabi 2 concentrator (southern) and pellet plant (northern) sites are similarly separated as in Mesabi 1, a dedicated inter-site road and concentrate pipeline corridor will be needed"),
            sp(),
            h2("9.4 Site Facilities"),
            bul("Administrative and technical offices (12,000–15,000 sq ft minimum)"),
            bul("Mobile equipment maintenance shop with wash bay, lube bay, and heavy repair bays — sized for 25–35 unit AHS truck fleet"),
            bul("Central plant repair shop with machining, fabrication, and overhead crane capability"),
            bul("Fuel and lubricant storage facility (20,000–40,000 gallon diesel storage; secondary containment; MPCA permit required)"),
            bul("Explosive storage magazine (if MMCL elects to hold on-site explosive inventory; else contract blasting service)"),
            bul("Security and access control: manned gatehouse at primary site entrance; perimeter fencing and No Trespassing signage"),
            bul("Sanitary wastewater: connection to City of Nashwauk municipal collection system (service agreement required) or on-site septic system"),
            bul("Solid waste disposal: characterisation and licensed off-site disposal for all process waste streams"),
            pb(),

            // ══ 10. ENVIRONMENTAL STUDIES AND REQUIREMENTS ══════════════════════════
            h1("10. Environmental Studies and Requirements"),
            body("Mesabi 2 requires a full suite of environmental studies as the technical basis for the new Environmental Impact Statement and individual permit applications. All environmental studies will be initiated from May 2026 in coordination with the mine plan development programme. ERM (Environmental Resources Management Inc.) is proposed as the lead environmental consultant, with its proposal (October 2024) providing the framework for the work programme, updated for Mesabi 2's independent scope and start date."),
            sp(),
            h2("10.1 Environmental Baseline Studies"),
            h3("10.1.1 Surface Water and Groundwater"),
            bul("Inventory and mapping of all surface waterbodies (lakes, streams, wetlands, ponds) within and adjacent to the Mesabi 2 project boundary"),
            bul("Baseline water quality sampling — lakes, streams, groundwater monitoring wells (minimum 2 years of pre-mining data required for EIS)"),
            bul("Hydrogeological investigation: installation of a groundwater monitoring well network; aquifer pump testing to characterise local hydrogeology, estimate pit inflow rates, and model drawdown impacts on surrounding water bodies"),
            bul("Computer groundwater flow model calibrated to baseline data — used for Water Appropriation Permit application, pit dewatering planning, and EIS groundwater impact analysis"),
            bul("Wild rice assessment: Minnesota's wild rice sulfate standard may apply to receiving waterbodies downstream of the Mesabi 2 area; baseline wild rice surveys and sulfate monitoring required"),
            h3("10.1.2 Air Quality"),
            bul("Baseline ambient air quality monitoring: PM10, PM2.5, SO2, NOx, CO, ozone, and relevant HAPs at minimum 12 months pre-mining (24 months preferred for model validation)"),
            bul("Meteorological monitoring station installation on the Mesabi 2 site: wind speed, wind direction, temperature, relative humidity, precipitation — data required for air dispersion modelling"),
            bul("Greenhouse gas emissions baseline for the operation (Scope 1, 2, and 3)"),
            h3("10.1.3 Wetlands"),
            bul("Wetland delineation: field delineation of all wetlands and waterways within the Mesabi 2 project area (approximately 1,500–2,000 acres estimated); two 10-day field mobilisations using USACE Northcentral/Northeast Regional Supplement (Version 2.0)"),
            bul("Wetland data forms, GPS mapping, MNRAM analysis for each delineated wetland"),
            bul("Submission to MN DNR (WCA) and USACE for jurisdictional determination concurrence"),
            bul("Wetland mitigation planning: preliminary identification of wetland credit banks capable of providing mitigation for anticipated impacts"),
            h3("10.1.4 Biological Resources"),
            bul("Threatened and Endangered species surveys: field surveys during appropriate seasonal windows for state (MN DNR) and federally (USFWS) listed species — minimum 2 years of surveys recommended for bat species; annual plant surveys"),
            bul("General biological resources survey: wildlife habitat mapping, breeding bird survey, amphibian and reptile survey, fish community survey in affected waterbodies"),
            h3("10.1.5 Cultural Resources and Tribal Consultation"),
            bul("Phase I archaeological survey: pedestrian walkover and shovel test pit survey across the Mesabi 2 project area to identify and assess cultural resource sites"),
            bul("Section 106 consultation (National Historic Preservation Act) with MN State Historic Preservation Office (SHPO) and federally recognised Tribal nations with ancestral connections to the area"),
            bul("Government-to-government consultation with relevant Ojibwe bands (Leech Lake, Mille Lacs, other bands as applicable) from project inception — this is a high-priority early action"),
            h3("10.1.6 Socio-Economics and Noise"),
            bul("Socio-economic baseline: existing employment, business activity, tax base, and community services in the Nashwauk/Itasca County area — basis for community benefit assessment"),
            bul("Baseline noise monitoring at nearest receptors (residences, schools, recreational areas)"),
            bul("Visual impact baseline: photographic documentation of current views; viewshed analysis"),
            sp(),
            h2("10.2 Impact Assessment and Mitigation"),
            body("The EIS will require assessment of all potential impacts across the following categories, each supported by the baseline data:"),
            bul("Water quantity: impacts on surface water flows, lake levels, and groundwater from pit dewatering and water consumption — includes stream augmentation planning for affected drainages"),
            bul("Water quality: assessment of tailings seepage, pit drainage quality (acid rock drainage assessment — particularly for pyrite-bearing waste rock), and stormwater runoff quality"),
            bul("Air quality: Class I and Class II PSD dispersion modelling for all regulated pollutants including visibility impacts on Class I areas (e.g., Boundary Waters Canoe Area Wilderness, Isle Royale National Park); health risk assessment"),
            bul("Wetlands: quantification of direct and indirect wetland impacts; mitigation sequencing (avoid, minimise, then compensate via wetland bank credits)"),
            bul("Biological resources: take assessment for listed species; mitigation (avoidance, minimisation, restitution payment for unavoidable take)"),
            bul("Cultural resources: impact assessment and mitigation for any identified cultural sites; consultation outcomes documentation"),
            bul("Noise: predicted noise levels at nearest receptors during construction and operations; mitigation measures if exceedances predicted"),
            bul("Socio-economics: employment, tax, and community service impacts; cumulative economic effects with other projects in the region"),
            bul("Greenhouse gas emissions: life-cycle GHG analysis; contribution to state and federal climate targets"),
            bul("Cumulative impacts: combined effects of Mesabi 2 with Mesabi 1 and other existing/planned projects on the Iron Range"),
            pb(),

            // ══ 11. REGULATORY AND LEGAL FRAMEWORK ══════════════════════════════════
            h1("11. Regulatory and Legal Framework"),
            body("Mesabi 2 requires a completely independent set of regulatory permits and approvals. No existing Mesabi 1 permits can be transferred to or relied upon by Mesabi 2. All applications will be made by MMCL (or its designated Mesabi 2 subsidiary entity) as a new applicant."),
            sp(),
            h2("11.1 State Environmental Review — Minnesota"),
            dtable(
                ["Permit / Approval", "Agency", "Key Requirements", "Estimated Timeline"],
                [
                    ["Environmental Impact Statement (EIS) — New Mandatory EIS", "MN DNR (lead RGU)", "Full new EIS triggered by new metallic mineral processing facility and new tailings basin (Minnesota Rules 4410.4400 Subparts 8B/8C). EAW initiates the process. Joint state/federal EIS with USACE.", "EAW submission Q3 2029; Final EIS Q1 2033; ROD Q2 2033"],
                    ["Permit to Mine (PTM)", "MN DNR", "New PTM application; mine plan, reclamation plan, financial assurance; requires completed EIS and ROD", "Application Q4 2028; Issuance Q3 2033 (post-ROD)"],
                    ["Air Quality Permit — Major New Source (PSD)", "MPCA", "New Part 70 Major Source permit; PSD Class I and II; BACT analysis; air dispersion modelling protocols; mercury plan", "Application Q3 2030; Issuance Q4 2033"],
                    ["NPDES/SDS Industrial Permit — New Permit", "MPCA", "Industrial wastewater, tailings basin disposal system (SDS), stormwater from industrial areas; zero discharge design", "Application Q4 2028; Issuance Q3 2033"],
                    ["NPDES Construction General Permit", "MPCA", "Coverage for ground disturbance >1 acre during construction; Stormwater Pollution Prevention Plan", "Apply Q3 2034 (before construction)"],
                    ["Water Appropriation Permit — New Application", "MN DNR", "All high-capacity pit dewatering wells and process water supply; aquifer testing required; stream augmentation plan", "Application Q4 2029; Issuance Q3 2033"],
                    ["Wetland Conservation Act (WCA) Permit", "MN DNR", "For impacts to state jurisdictional wetlands; mitigation credits from approved banks; separate from Section 404", "Application 2031; Issuance Q4 2032"],
                    ["Dam Safety Permit — New TSF", "MN DNR", "New tailings impoundment; full geotechnical design, hydrologic analysis, stability analysis, EAP, instrumentation plan", "Application Q2 2031; Issuance Q1 2033"],
                    ["Aboveground Storage Tank Permits", "MPCA", "Fuel and reagent storage tanks >10,000 gallons", "Apply before tank installation (~2035)"],
                    ["Hazardous Waste Generator License", "MPCA", "Based on projected generation rates during operations", "Apply before operations (~2036)"],
                    ["Radioactive Materials Registration", "MDH", "For any radioactive isotope gauges in process control", "Apply before operations"],
                ],
                [2160, 1080, 3600, 2520]
            ),
            sp(),
            h2("11.2 Federal Permits and Approvals"),
            dtable(
                ["Permit / Approval", "Agency", "Key Requirements", "Estimated Timeline"],
                [
                    ["Clean Water Act Section 404 Permit", "USACE — St. Paul District", "Individual permit for dredge/fill in waters of the US including wetlands; joint review with state EIS; alternatives analysis (LEDPA); 404(b)(1) guidelines compliance", "Application 2031; Issuance Q2 2033 (post-federal ROD)"],
                    ["Clean Water Act Section 401 Water Quality Certification", "MPCA (delegated by EPA)", "MPCA certifies Section 404 permit compliance with state water quality standards", "Application concurrent with Section 404; Issuance Q2 2033"],
                    ["NEPA Federal EIS", "USACE (lead federal agency)", "Federal EIS required given major federal action (Section 404 permit) with potential significant environmental effect. Joint state/federal document", "Parallel with state EIS; federal ROD Q2 2033"],
                    ["Section 7 Endangered Species Act Consultation", "USFWS / USACE", "Formal consultation if federally listed species present and federal nexus established. Biological Opinion from USFWS.", "Concurrent with EIS; completion Q1 2033"],
                    ["FAA Notification / Determination", "FAA", "For structures exceeding 200 feet; Notice of Proposed Construction required", "Apply when structure heights confirmed (FEED phase ~2034)"],
                    ["Spill Prevention, Control and Countermeasure (SPCC) Plan", "EPA", "Required for aggregate aboveground oil storage ≥1,320 gallons", "Prepare before tank operations (~2036)"],
                ],
                [2400, 1320, 3600, 2040]
            ),
            sp(),
            h2("11.3 County and Municipal Permits"),
            dtable(
                ["Permit / Approval", "Agency", "Notes"],
                [
                    ["Building Permits", "Itasca County", "All structures must comply with Minnesota State Building Code; county enforcement"],
                    ["Zoning / Conditional Use Permit", "Itasca County", "Mining is a conditional use in most Itasca County zoning districts; public hearing and Planning Commission review required"],
                    ["Shoreland Alteration Permit", "Itasca County", "Required for grading/filling within 1,000 ft of designated water bodies; OHW setbacks apply"],
                    ["Sewer and Water Connection Permits", "City of Nashwauk", "For municipal water service connection and sanitary sewer connection"],
                    ["Zoning / Land Use Permits", "City of Nashwauk", "If any Mesabi 2 facilities are within Nashwauk city limits or recently annexed areas"],
                ],
                [2880, 1800, 4680]
            ),
            sp(),
            h2("11.4 Legal Framework — Minnesota Mining Law"),
            body("Mesabi 2 operations will be subject to the following principal Minnesota statutes and regulations in addition to the federal framework:"),
            bul("Minnesota Minerals Tax / Taconite Production Tax: MMCL will pay the taconite production tax on crude ore mined from Mesabi 2 parcels (separate from any Mesabi 1 obligations). The tax is assessed per long ton of crude ore mined and is used to fund Iron Range Resources and Rehabilitation and county/municipal services."),
            bul("Minnesota Mining Mineral Leases: All mineral leases on the Mesabi 2 parcels carry rental payments (Minimum Royalties), earned royalties on crude taconite mined with escalator provisions, and other conditions specified in each lease agreement. Compliance with all lease terms is a legal obligation of MMCL."),
            bul("MN Statute Chapter 93 — Mining and Minerals: Governs Permit to Mine applications, mine operating conditions, financial assurance requirements, and reclamation obligations."),
            bul("MN Statute Chapter 116D — Environmental Policy Act (MEPA): Governs the state EIS process, Environmental Assessment Worksheet requirements, and adequacy determinations."),
            bul("MN Statute Chapter 103G — Waters of the State: Governs water appropriation permits, public waters impacts, and dam safety regulation."),
            bul("MN Statute Chapter 115 — Pollution Control; Chapter 116 — MPCA: Governs air quality permits, NPDES/SDS permits, and waste management requirements."),
            pb(),

            // ══ 12. PROJECT DEVELOPMENT PLAN AND TIMELINE ════════════════════════════
            h1("12. Project Development Plan and Timeline"),
            body("All activities commence May 2026. The total development timeline from project kickoff to first production is 9 years and 8 months (May 2026 – Q1 2036). The critical path is through the full EIS and permitting process. Construction, commissioning and first production follow sequentially from permit issuance."),
            sp(),
            h2("12.1 Master Development Schedule"),
            tline([
                ["PROJECT KICKOFF — team assembly, contracts, governance", "May 2026", "Jun 2026", "MMCL", "2 months"],
                ["Phase 1: Mineral rights legal review; surface access assessment", "May 2026", "Aug 2026", "MMCL/Legal", "4 months"],
                ["Phase 1: Historical data compilation; desktop geological review", "May 2026", "Sep 2026", "DRA/MMCL", "5 months"],
                ["Phase 1: Exploration Plan preparation and MN DNR submission", "Aug 2026", "Sep 2026", "MMCL", "2 months"],
                ["Phase 1: Environmental workplans initiated — all disciplines", "May 2026", "Nov 2026", "ERM", "7 months"],
                ["Phase 1: Tribal consultation and community engagement initiation", "Jun 2026", "Ongoing", "ERM/MMCL", "Ongoing"],
                ["Phase 1: Conceptual capital cost estimate (AACE Class 4–5)", "Jun 2026", "Dec 2026", "DRA", "7 months"],
                ["MN DNR Exploration Permit issuance (estimated 4 months review)", "Sep 2026", "Jan 2027", "MN DNR", "4 months"],
                ["Phase 2: Diamond drilling programme mobilisation", "Feb 2027", "Feb 2028", "MMCL/Consultants", "12 months"],
                ["Phase 3: Core logging, assay, QA/QC and data validation", "Feb 2027", "Apr 2028", "DRA/MMCL", "14 months"],
                ["Phase 3: Updated 3D geological model and resource estimation", "May 2028", "Sep 2028", "DRA (QP)", "5 months"],
                ["Phase 3: NI 43-101 Mineral Resource Estimate — independent QPs", "May 2028", "Sep 2028", "DRA/Independent QP", "5 months"],
                ["Phase 4: Metallurgical sample preparation and reception", "Mar 2028", "Apr 2028", "Consultants", "2 months"],
                ["Phase 4: Bench-scale metallurgical testwork (magnetite + hematite)", "Apr 2028", "Oct 2028", "Consultants", "7 months"],
                ["Phase 4: Pilot-scale testwork (AG mill circuit + hematite circuit)", "Oct 2028", "Feb 2029", "Consultants", "5 months"],
                ["Phase 4: Pelletizing testwork at COREM or equivalent", "Dec 2028", "Mar 2029", "Consultants", "4 months"],
                ["Geotechnical investigation — pit slopes, TSF, facility foundations", "Oct 2028", "Jun 2029", "Geotech consultant", "9 months"],
                ["Hydrogeological investigation — well installation, pump testing, model", "Oct 2028", "Sep 2029", "ERM/Hydro consult", "12 months"],
                ["Mine plan development — LOM schedule, pit design, equipment selection", "Oct 2028", "Jun 2029", "Stantec/DRA", "9 months"],
                ["Environmental baseline surveys — all disciplines (Season 1)", "Apr 2027", "Sep 2027", "ERM", "6 months"],
                ["Wetland delineation field work — 1,500–2,000 acres", "May 2027", "Aug 2027", "ERM/Stantec", "4 months"],
                ["T&E species field surveys — Season 1", "May 2027", "Sep 2027", "ERM", "5 months"],
                ["Archaeological Phase I survey", "Jun 2027", "Oct 2027", "ERM cultural team", "5 months"],
                ["Wetland delineation report — submission to MN DNR and USACE", "Sep 2027", "Jan 2028", "ERM/Stantec", "5 months"],
                ["Environmental baseline surveys — Season 2 (water quality, air, T&E)", "Apr 2028", "Sep 2028", "ERM", "6 months"],
                ["T&E species field surveys — Season 2", "May 2028", "Sep 2028", "ERM", "5 months"],
                ["Environmental Baseline Data Reports — all disciplines complete", "Oct 2028", "Mar 2029", "ERM", "6 months"],
                ["Impact Assessment Report (all environmental disciplines)", "Mar 2029", "Aug 2029", "ERM", "6 months"],
                ["Risk Assessment Plan (tailings, groundwater, flooding)", "Mar 2029", "Jun 2029", "ERM", "4 months"],
                ["Alternatives Analysis (LEDPA — Least Enviro. Damaging Practicable Alt.)", "Mar 2029", "Jun 2029", "ERM", "4 months"],
                ["EAW Preparation — frozen mine plan basis", "Jun 2029", "Sep 2029", "ERM", "4 months"],
                ["Pre-application meetings with MN DNR, USACE, MPCA, FLMs", "Aug 2029", "Sep 2029", "ERM/MMCL", "2 months"],
                ["EAW Submission to MN DNR", "Sep 2029", "Sep 2029", "ERM/MMCL", "Single event"],
                ["PTM Application Submission (MN DNR)", "Oct 2028", "Oct 2028", "Stantec/MMCL", "Single event"],
                ["Water Appropriation Permit Application Submission", "Oct 2029", "Oct 2029", "ERM/MMCL", "Single event"],
                ["Section 404 and Section 401 Applications", "Mar 2030", "Mar 2030", "ERM/MMCL", "Single event"],
                ["Dam Safety Permit Application — Mesabi 2 TSF", "Mar 2030", "Mar 2030", "Stantec/MMCL", "Single event"],
                ["MN DNR EAW completeness review (2–3 cycles)", "Oct 2029", "Mar 2030", "MN DNR", "6 months"],
                ["MN DNR 3rd Party EIS Contractor Selection", "Apr 2030", "Sep 2030", "MN DNR", "6 months"],
                ["EIS Scoping — agency and public meetings", "Oct 2030", "Feb 2031", "MN DNR/ERM", "5 months"],
                ["Environmental baseline surveys — Season 3 (supplemental data)", "Apr 2030", "Sep 2030", "ERM", "6 months"],
                ["Air permit application submission to MPCA (PSD modelling complete)", "Sep 2030", "Sep 2030", "Stantec/ERM", "Single event"],
                ["Draft EIS preparation", "Mar 2031", "Dec 2031", "MN DNR/ERM", "10 months"],
                ["Draft EIS submission to MN DNR", "Jan 2032", "Jan 2032", "MN DNR", "Single event"],
                ["Draft EIS public comment period (minimum 45 days)", "Jan 2032", "Mar 2032", "MN DNR", "3 months"],
                ["Response to comments; Final EIS preparation", "Apr 2032", "Oct 2032", "MN DNR/ERM", "7 months"],
                ["Final EIS — MN DNR Adequacy Determination", "Nov 2032", "Dec 2032", "MN DNR", "2 months"],
                ["State Record of Decision (MN DNR)", "Jan 2033", "Mar 2033", "MN DNR", "3 months"],
                ["Federal Record of Decision (USACE)", "Apr 2033", "Jun 2033", "USACE", "3 months"],
                ["Section 404 Wetland Permit Issuance", "Apr 2033", "Jun 2033", "USACE", "3 months"],
                ["Permit to Mine — Mesabi 2 Issuance", "Jul 2033", "Sep 2033", "MN DNR", "3 months"],
                ["MPCA Air Quality Permit Issuance", "Oct 2033", "Dec 2033", "MPCA", "3 months"],
                ["Water Appropriation Permit Issuance", "Jul 2033", "Sep 2033", "MN DNR", "3 months"],
                ["Dam Safety Permit — Mesabi 2 TSF Issuance", "Jul 2033", "Dec 2033", "MN DNR", "6 months"],
                ["FEED — Front End Engineering and Design", "Jan 2034", "Sep 2034", "DRA/MMCL", "9 months"],
                ["Updated capital cost estimate (AACE Class 2 from FEED)", "Aug 2034", "Sep 2034", "DRA", "2 months"],
                ["Project sanction (MMCL management/board approval)", "Oct 2034", "Oct 2034", "MMCL", "Single event"],
                ["Financing close (project finance / corporate debt)", "Oct 2034", "Dec 2034", "MMCL/Advisers", "3 months"],
                ["Detailed engineering and long-lead procurement", "Jan 2034", "Dec 2034", "DRA/Contractors", "12 months"],
                ["Phase 6: TSF starter dam and earthworks construction", "Jan 2035", "Sep 2035", "MMCL/Contractors", "9 months"],
                ["Phase 6: Site preparation, roads, power infrastructure", "Jan 2035", "Jun 2035", "MMCL/Contractors", "6 months"],
                ["Phase 6: Concentrator construction", "Apr 2035", "Oct 2035", "MMCL/Contractors", "7 months"],
                ["Phase 6: Pellet plant construction", "Apr 2035", "Dec 2035", "MMCL/Contractors", "9 months"],
                ["Phase 6: Mine pre-stripping and pit development", "Jan 2035", "Sep 2035", "MMCL Mining", "9 months"],
                ["Mechanical completion and pre-commissioning", "Oct 2035", "Dec 2035", "MMCL/EPC", "3 months"],
                ["Commissioning and plant ramp-up", "Jan 2036", "Jun 2036", "MMCL Operations", "6 months"],
                ["FIRST MESABI 2 PELLET PRODUCTION", "Jan 2036", "Jan 2036", "MMCL", "Target"],
                ["Full design capacity — 9 MTPA achieved", "Jul 2036", "Jul 2036", "MMCL", "Target"],
            ]),
            sp(),
            h2("12.2 Development Phase Summary"),
            dtable(
                ["Phase", "Period", "Duration", "Key Output / Gate"],
                [
                    ["Project Launch and Pre-Exploration", "May 2026 – Jan 2027", "9 months", "Team mobilised; legal rights confirmed; exploration permit obtained"],
                    ["Diamond Drilling Programme", "Feb 2027 – Feb 2028", "12 months", "60–80 drill holes completed; 24,000–40,000 m drilled"],
                    ["Geological Reporting and Resource Estimate", "Mar 2028 – Sep 2028", "7 months", "NI 43-101 M&I Resource Estimate confirmed by independent QPs"],
                    ["Metallurgical Testwork and Mine Plan", "Mar 2028 – Jun 2029", "16 months", "Metallurgical design basis confirmed; LOM mine plan complete"],
                    ["Environmental Baseline and Impact Studies", "Apr 2027 – Sep 2030", "42 months", "Full baseline dataset; impact assessment; EAW submitted"],
                    ["EIS and Permitting Process", "Sep 2029 – Dec 2033", "52 months", "Final EIS adequate; all permits issued"],
                    ["FEED and Engineering", "Jan 2034 – Dec 2034", "12 months", "AACE Class 2 estimate; engineering complete; project sanctioned"],
                    ["Construction", "Jan 2035 – Dec 2035", "12 months", "Mechanical completion; readiness for commissioning"],
                    ["Commissioning and First Production", "Jan 2036 – Jul 2036", "7 months", "First pellets; full 9 MTPA design capacity"],
                ],
                [2520, 2160, 1440, 3240]
            ),
            pb(),

            // ══ 13. CAPITAL AND OPERATING COST FRAMEWORK ═════════════════════════════
            h1("13. Capital and Operating Cost Framework"),
            h2("13.1 Capital Cost — Reference and Estimate Requirement"),
            body("Mesabi 2 requires an independent capital cost estimate reflecting its own facilities, mine plan, and infrastructure requirements. The 2012 NI 43-101 Phase II capital estimate of US$1.518 billion (for a 14 Mtpa expansion scenario on the Mesabi 1 area) provides a directional reference for a broadly comparable processing configuration, but is not applicable to Mesabi 2 without substantial revision for the following reasons:"),
            bul("Mesabi 2 is a new standalone project — no reuse of any sunk cost or partially constructed asset from Mesabi 1"),
            bul("New site infrastructure (power, rail, roads, water) from greenfield versus Mesabi 1's brownfield advantage"),
            bul("Construction cost escalation since 2012: materials, labour, and equipment costs have increased significantly"),
            bul("AHS truck fleet versus conventional 240-tonne fleet assumed in 2012"),
            bul("Different site configuration driven by Mesabi 2 land parcels and pit geometry"),
            sp(),
            body("Indicative capital cost ranges, for early planning purposes only (to be updated by AACE Class 4–5 estimate by December 2026 and AACE Class 2 estimate from FEED by September 2034):"),
            dtable(
                ["Cost Component", "Indicative Range (US$M, 2026 pricing)", "Notes"],
                [
                    ["Mine Pre-stripping and Development Capex", "$45–70M", "AHS truck pre-strip; pit dewatering; access roads"],
                    ["Magnetite Concentrator (crushing, grinding, concentration)", "$550–750M", "Three AG mill lines; LIMS; flotation; conveying"],
                    ["Pellet Plant (balling, induration, emission controls)", "$450–600M", "7.5 Mtpa straight-grate machine; full emission controls"],
                    ["Tailings Storage Facility (starter dam and infrastructure)", "$80–130M", "First 5 years of TSF capacity; pipeline; reclaim system"],
                    ["Hematite Processing Circuit", "$50–80M", "Beneficiation circuit design pending testwork"],
                    ["Site Infrastructure (power, rail spur, roads, facilities)", "$180–280M", "New substations; new rail spur; site roads; buildings"],
                    ["Indirect Costs (engineering, procurement management, EPCM)", "$150–220M", "Estimated at 20–25% of direct costs"],
                    ["Owner's Costs (project management, training, start-up)", "$80–120M", "Through first year of operations"],
                    ["Contingency", "$120–180M", "15–20% of direct + indirect costs at Class 4–5 stage"],
                    ["TOTAL INDICATIVE ESTIMATE", "~US$1.7–2.4 Billion", "Wide range reflects Class 4–5 accuracy (±30–50%)"],
                ],
                [3120, 2640, 3600]
            ),
            body("Note: These are indicative order-of-magnitude estimates for internal planning purposes only. They should not be used for investment decisions. A rigorous AACE Class 4–5 estimate will be prepared by December 2026 and a Class 2 estimate will be developed during FEED (2034)."),
            sp(),
            h2("13.2 Operating Cost Framework"),
            body("Operating costs for Mesabi 2 will be independently estimated during the mine plan development and FEED phases. Based on the 2012 NI 43-101 reference for a comparable processing configuration, indicative annual operating costs for a 9 MTPA operation are estimated as follows (subject to update):"),
            dtable(
                ["Cost Area", "Indicative Unit Cost (US$/t pellets)", "Notes"],
                [
                    ["Mining (drilling, blasting, loading, hauling — AHS)", "$7–10", "AHS savings partially offset by higher capex"],
                    ["Crushing and Concentrating", "$12–16", "Energy, reagents, maintenance, labour"],
                    ["Pellet Plant Operations", "$10–14", "Energy, limestone, bentonite, maintenance"],
                    ["Tailings Management", "$2–3", "Pipeline operations, dam monitoring"],
                    ["Health, Safety and Environment", "$1–2", "Monitoring, compliance, reclamation accrual"],
                    ["General and Administrative", "$2–3", "Site overhead, corporate allocations"],
                    ["Royalties and Taconite Tax", "$3–5", "Minnesota taconite production tax + mineral lease royalties"],
                    ["Total Indicative Opex", "~US$37–53/t pellets", "Indicative range — to be refined by LOM mine plan"],
                ],
                [3240, 2880, 3240]
            ),
            pb(),

            // ══ 14. KEY RISKS AND MITIGATIONS ════════════════════════════════════════
            h1("14. Key Risks and Mitigations"),
            dtable(
                ["Risk", "Category", "Likelihood", "Impact", "Mitigation"],
                [
                    ["Exploration drilling fails to define sufficient resource to support 9 MTPA — insufficient size, grade, or confidence", "Geological", "Low–Medium", "Fatal for project", "Design drilling at adequate spacing (500 ft Measured); use 2012 NI 43-101 analogue; include contingency holes"],
                    ["EIS duration exceeds 52-month estimate (MN DNR 3rd party contractor 6–12 months; complex scope; public opposition)", "Regulatory", "High", "Schedule", "Submit polished, complete EAW; initiate informal DNR briefing Q4 2027; leverage Phase 1 SEIS precedent; community engagement from Day 1"],
                    ["Tribal opposition to Mesabi 2 leads to EIS delay or substantive permit conditions", "Social/Regulatory", "Medium", "Schedule/Cost", "Government-to-government consultation from June 2026; proactive cultural resource surveys; meaningful benefits agreements"],
                    ["Wetland delineation reveals more extensive impacts than expected — large mitigation requirement", "Environmental", "Medium", "Cost/Schedule", "Early wetland surveys (2027); identify mitigation banks early; integrate avoidance into mine design from EAW stage"],
                    ["Wild rice sulfate impacts from tailings seepage exceed state standard thresholds", "Environmental", "Medium", "Regulatory", "Hydrogeological modelling during baseline phase; TSF liner design if needed; early MPCA consultation"],
                    ["Air PSD Class I modelling shows unacceptable visibility/AQRV impacts at national parks", "Regulatory", "Medium", "Schedule/Design", "Run preliminary screening models in 2027; engage Federal Land Managers early; emission control design to exceed BACT minimums if needed"],
                    ["Capital cost escalation above planning range requires additional financing", "Financial", "High", "Cost/Schedule", "Secure AACE Class 2 estimate from FEED before financing close; explore phased construction; EPC lump-sum contracting"],
                    ["AHS technology operational risk — delayed ramp-up or lower productivity than modelled", "Technical", "Medium", "Cost", "Leverage Mesabi 1 AHS operational experience; contract with Komatsu for commissioning support; conservative productivity assumptions in mine plan"],
                    ["Mineral lease disputes or non-renewal of leases on key parcels within Mesabi 2 boundary", "Legal", "Low", "Potentially fatal", "Legal review of all leases June 2026; confirm renewal terms; maintain Minimum Royalty payments; negotiate extensions early"],
                    ["DR-grade pellet price decline below project economics hurdle rate", "Market", "Medium", "Revenue", "Market studies from 2029; portfolio diversification (hematite product); long-term offtake targeting from 2031"],
                    ["Public community opposition (anti-mining sentiment in Minnesota)", "Social", "Medium", "Schedule", "Community engagement plan from Day 1; local employment commitment; environmental excellence programme; transparent communication"],
                    ["Environmental permitting conditions impose operating constraints not modelled in mine plan (e.g., water level triggers, production curtailment)", "Regulatory", "Medium", "Opex/Revenue", "Engage MPCA and MN DNR informally during baseline phase; design mine plan with contingency for adaptive management requirements"],
                ],
                [2400, 900, 800, 800, 3460]
            ),
            pb(),

            // ══ 15. NEXT STEPS AND RECOMMENDATIONS ══════════════════════════════════
            h1("15. Next Steps and Recommendations"),
            body("The following immediate and near-term actions are required to launch the Mesabi 2 project on schedule from May 2026:"),
            sp(),
            callout("Priority Actions — Month 1 to 6 (May 2026 – October 2026)", [
                "1. LEGAL FOUNDATION: Commission comprehensive legal review of all GPIOP and adjacent mineral lease terms, royalty obligations, renewal conditions, and surface access requirements. Complete by August 2026.",
                "2. TEAM MOBILISATION: Issue Notice to Proceed to ERM (environmental), DRA (mine engineering / resource estimation), and Stantec (mine design support). Convene Mesabi 2 project kickoff meeting by May 31, 2026.",
                "3. TRIBAL CONSULTATION: Initiate government-to-government consultation with relevant Ojibwe bands immediately — June 2026. Do not wait for formal EIS process. Early engagement is a legal obligation and a risk mitigation priority.",
                "4. HISTORICAL DATA COMPILATION: DRA to compile all available historical drill data, geological maps, and geophysical surveys on GPIOP parcels from MN DNR and other public sources. Complete by September 2026.",
                "5. EXPLORATION PLAN PREPARATION: Prepare and submit the Exploration Plan to MN DNR by September 2026 to initiate the 4-month permit review period, enabling drilling to commence by February 2027.",
                "6. ENVIRONMENTAL WORKPLANS: ERM to initiate all environmental data review workplans (water, air, geology, geochem, wetlands, T&E, noise, cultural) simultaneously. All workplans complete by November 2026.",
                "7. INFORMAL MN DNR ENGAGEMENT: Schedule an informal briefing with MN DNR Environmental Review unit in Q3 2026 to notify them of Mesabi 2's planned EAW submission timeline and anticipated EIS scope. This supports DNR resource planning for 3rd party contractor procurement.",
                "8. CONCEPTUAL CAPITAL COST ESTIMATE: Commission AACE Class 4–5 conceptual capital cost estimate from DRA/independent estimator, updated to 2026 price levels. Complete by December 2026. Required for project sanctioning and financial planning.",
                "9. CORPORATE STRUCTURE: Determine whether Mesabi 2 will be developed as a wholly-owned MMCL subsidiary, a new entity, or through a joint venture. Decision required by September 2026 for permit applications.",
                "10. FIELD SURVEY PLANNING: Plan the 2027 environmental field survey programme in detail by February 2027 — crews, equipment, protocols, access agreements. The 2027 growing season window (May–September) is a critical and inflexible schedule constraint.",
            ], RUST),
            sp(),
            callout("Near-Term Actions — Month 7 to 24 (November 2026 – April 2028)", [
                "11. DRILLING MOBILISATION: Mobilise 3–4 diamond drill rigs for the systematic exploration programme from February 2027. Target 60–80 holes over 12 months.",
                "12. 2027 FIELD SURVEYS: Execute all 2027 environmental baseline surveys (wetland delineation, T&E species, archaeological, air quality, water quality) from May–September 2027. These cannot be deferred — missing the 2027 season adds 12 months to the programme.",
                "13. RESOURCE ESTIMATION: Following drilling completion, complete the NI 43-101 compliant resource estimate by September 2028. This is the major technical gate for the project — EIS cannot be completed without a confirmed resource.",
                "14. METALLURGICAL TESTWORK: Initiate bench-scale testing in parallel with the resource estimation work (March 2028) to avoid sequential delays. Pilot-scale and pelletizing tests to complete by March 2029.",
                "15. MINE PLAN DEVELOPMENT: Engage Stantec/DRA for LOM mine plan development commencing October 2028, targeting completion June 2029. The mine plan is the frozen project description required for EAW submission.",
                "16. EARLY MARKET ENGAGEMENT: Begin preliminary conversations with potential offtake partners for Mesabi 2 DR-grade pellets from 2027 onwards — trading companies, DRI producers, EAF steelmakers. Long-lead commercial relationships take time to build.",
            ], STEEL),
            sp(),
            new Paragraph({ children: [new TextRun("")], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RUST, space: 1 } }, spacing: { before: 240, after: 240 } }),
            new Paragraph({ children: [new TextRun({ text: "Important Notice", size: 18, bold: true, color: GREY, font: "Arial" })], spacing: { before: 120, after: 60 } }),
            new Paragraph({ children: [new TextRun({ text: "This report has been prepared by Mesabi Metallics Company LLC for internal management purposes. It is a project development document for a planned future greenfield mining project and does not constitute a mineral resource or reserve disclosure, a feasibility study, or a financial instrument. No NI 43-101 compliant resource or reserve statement is made for Mesabi 2 in this document. All resource potential, capital cost estimates, operating cost estimates, mine life projections, and timelines are indicative and subject to confirmation through the exploration, engineering, and regulatory processes described herein. Reference to the 2012 NI 43-101 Technical Report by Met-Chem Canada Inc. is for geological context and analogous process design only; those resource and reserve estimates apply to the Mesabi 1 land parcels and are explicitly not attributed to the Mesabi 2 project. This document is confidential and is not for external distribution or publication.", size: 18, color: "555555", font: "Arial" })], spacing: { before: 60, after: 80 }, alignment: AlignmentType.JUSTIFIED }),
        ]
    }]
});


Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Mesabi_Report.docx", buffer);
    console.log("✅ Report generated: Mesabi_Report.docx");
}).catch((err) => {
    console.error("❌ Error generating document:", err);
});
