import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { generateExcelPR } from '../services/generateTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.ANTHROPIC_API_KEY;
// Generate Indent No and other thing from the wbs code.
function generateIndentNumber(wbsCode, lastPRNumber = 0) {
  if (!wbsCode) {
    throw new Error("WBS code is required");
  }

  const parts = wbsCode.split("-");

  if (parts.length < 5) {
    throw new Error("Invalid WBS format");
  }

  // Extract values dynamically
  const department = parts[3];   // MIN
  const category = parts[4];     // EQP (replaces MMA)

  // Increment PR number
  const newPRNumber = lastPRNumber + 1;

  // Format PR number → 001, 002, ...
  const formattedPR = String(newPRNumber).padStart(3, "0");

  const indentNumber = `MMCL/${department}/${category}/PR-${formattedPR}`;

  return {
    indentNumber,
    prNumber: newPRNumber
  };
}
/**
 * Extracts structured quotation details and maps them to the Purchase Requisition (PR) format.
 * Merges extracted items with user-provided metadata (Indent No, Dept, etc.) from the request body.
 */
export const extractQuotationDetails = async (req, res) => {
  try {
    if (!req.file) {
      console.error('Request received without file.');
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (!API_KEY) {
      console.error('ANTHROPIC_API_KEY is missing from environment.');
      return res.status(500).json({ error: 'Anthropic API key is not configured.' });
    }

    // Handled user-provided metadata from frontend form
    const metadata = JSON.parse(req.body.metadata || '{}');
    const { indentNo, department, area, wbs, date } = metadata;

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    console.log(`[AI Controller] Starting extraction for ${fileName} (${fileType})...`);
    console.log(`[AI Controller] Metadata:`, metadata);

    // 1️⃣ Upload to Anthropic Files API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: fileType
    });
    formData.append('purpose', 'content_extraction');

    console.log("[AI Controller] Step 1: Uploading file to Anthropic...");
    const uploadResponse = await axios.post("https://api.anthropic.com/v1/files", formData, {
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
        ...formData.getHeaders()
      }
    });

    const fileId = uploadResponse.data.id;
    console.log(`[AI Controller] Step 1 Success: file_id: ${fileId}`);

    // 2️⃣ Generate the Response using the file_id
    const isPdf = fileType === 'application/pdf';
    const contentType = isPdf ? 'document' : 'image';

    const messagePayload = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      temperature: 0.1,
      system: "You are an expert procurement assistant specializing in data extraction and strategic analysis of vendor quotations.",
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this quotation and structure it for a Purchase Requisition.

1. Identify the ALL MAIN ITEM (The primary equipment or product OR SERVICES).
2. Identify all SUPPORTING ITEMS (Service, labor, freight, etc.).
3. Calculate the GRAND TOTAL of all items and charges.
4. Extract all items as a flat list for the PR table.
5. One Line Description for the product or Service (Small Easy to understand Description of the product or service )
6. Give me WBS Code of each line items. ( I have provided the WBS Code for different Departemnts)


WBS- Code:
const wbsConfig = [
  {
    department: "Mining",
    categories: [

      {
        category: "Mine Equipment Cashflow",
        wbsCodes: ["M-1017-M-MIN-EQP"],
      },
      {
        category: "Employees",
        wbsCodes: ["M-1017-M-MIN-EMP"],
      },
      {
        category: "Gasoline & Petrol",
        wbsCodes: ["M-1017-M-MIN-GSP"],
      },
      {
        category: "Computer and IT Support",
        wbsCodes: ["M-1017-M-MIN-IT"],
      },
      {
        category: "Explosives",
        wbsCodes: ["M-1017-M-MIN-EXP"],
      },
      {
        category: "GET",
        wbsCodes: ["M-1017-M-MIN-GET"],
      },
      {
        category: "Auxiliary Mine Equipment",
        wbsCodes: ["M-1017-M-MIN-AME"],
      },
      {
        category: "PMS",
        wbsCodes: ["M-1017-M-MIN-PM"],
      },
      {
        category: "Tires - Rims",
        wbsCodes: ["M-1017-M-MIN-TR"],
      },
      {
        category: "Contractors",
        wbsCodes: ["M-1017-M-MIN-CON"],
      },
      {
        category: "Mine Misc. Adds",
        wbsCodes: ["M-1017-M-MIN-MMA"],
      },
      {
        category: "Heat & Electric",
        wbsCodes: ["M-1017-M-MIN-HE"],
      },
      {
        category: "Drill Maintenance",
        wbsCodes: ["M-1017-M-MIN-DM"],
      },
      {
        category: "MES Washbay",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
      {
        category: "Drill Steel",
        wbsCodes: ["M-1017-M-MIN-DS"],
      },
      {
        category: "Drill Bits",
        wbsCodes: ["M-1017-M-MIN-DB"],
      },
      {
        category: "Hydraulic Tooling",
        wbsCodes: ["M-1017-M-MIN-HT"],
      },
      {
        category: "Insurance",
        wbsCodes: ["M-1017-M-MIN-INS"],
      },
      {
        category: "Survey Supplies",
        wbsCodes: ["M-1017-M-MIN-SS"],
      },
      {
        category: "PPE",
        wbsCodes: ["M-1017-M-MIN-PPE"],
      },
      {
        category: "MES Lunchroom & Dry",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
      {
        category: "Fire Prevention",
        wbsCodes: ["M-1017-M-MIN-FP"],
      },
      {
        category: "Vib Tests",
        wbsCodes: ["M-1017-M-MIN-VT"],
      },
      {
        category: "MES Hand Tools",
        wbsCodes: ["M-1017-M-MIN-HT"],
      },
      {
        category: "Nuts Bolts Hoses",
        wbsCodes: ["M-1017-M-MIN-NBH"],
      },
      {
        category: "MES Misc",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
      {
        category: "Meals and Entertainment",
        wbsCodes: ["M-1017-M-MIN-ADM"],
      },
      {
        category: "Lumber",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
    ],
  },
];


ITEM DEFINITIONS:
- MAIN ITEM: Core tangible asset (e.g., Truck, Pump). NOT always the most expensive.
- SUPPORTING ITEMS: Services or costs required for the main item.



OUTPUT FORMAT (STRICT JSON ONLY):
{
  "main_item": {
    "description": string,
  },
  "grand_total": number,
  "items": [
    {
      "description": string,
      "size": string,
      "specification": string,
      "uom": string,
      "unit_price": number,
      "requirement": number,
      "area": string,
      "unit": string,
      "ros": string,
      "value": number,
      "wbs": string
    }
  ]
}

RULES:
- Return ONLY valid JSON.
- "grand_total" MUST be the sum of all item values.
- "size" should be the physical dimension or size (e.g. 6 inch, DN150, 50mm). Use empty string if not found.
- "specification" should include material type, standards, part numbers, ASC codes etc.
- "area" is the area of utilization if mentioned, otherwise use empty string.
- "ros" is urgency/required-on-site, use "Normal" if not specified.
- "wbs" is the WBS code if mentioned, otherwise use empty string.
- "items" should contain EVERY line item from the quote formatted for the PR table.`
            },
            {
              type: contentType,
              source: {
                type: 'file',
                file_id: fileId
              }
            }
          ]
        }
      ]
    };

    console.log("[AI Controller] Step 2: Requesting extraction from AI...");
    const messageResponse = await axios.post('https://api.anthropic.com/v1/messages', messagePayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14'
      }
    });
    console.log("[AI Controller] Step 2 Success: AI responded.");

    // 3️⃣ MOVE file to temp folder instead of quotations
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Ensure we use a unique filename if needed, but req.file.filename is already unique from multer
    const tempPath = path.join(tempDir, req.file.filename);
    fs.renameSync(filePath, tempPath);
    console.log(`Reference quotation moved to temp storage: ${tempPath}`);

    const responseText = messageResponse.data.content[0].text;
    console.log("[AI Controller] Raw AI Segment Start:", responseText.substring(0, 100) + "...");

    try {
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(cleanText);
      console.log("[AI Controller] Successfully parsed JSON structure.");

      // Merge AI items with user-provided metadata defaults
      const fullPrData = {
        indentNo: indentNo,
        department: department || 'General',
        date: date || new Date().toISOString().split('T')[0],
        pdfPath: req.file.filename, // Store filename for later retrieval
        main_item: aiData.main_item,
        supporting_items: aiData.supporting_items,
        grand_total: aiData.grand_total,
        items: aiData.items.map(item => ({
          ...item,
          area: area || 'Procurement',
          wbs: wbs || 'N/A'
        }))
      };

      console.log(`[AI Controller] Final PR Object Prepared: ${fullPrData.indentNo}. Returning to frontend.`);
      res.json(fullPrData);
    } catch (e) {
      console.error('[AI Controller] Critical Parse Failure:', responseText);
      res.status(500).json({ error: 'AI response was not valid JSON.', raw: responseText });
    }

  } catch (error) {
    if (fs.existsSync(req.file?.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Backend AI Extraction Trace:', error.response?.data || error.message);
    res.status(500).json({
      error: 'AI extraction failed during backend processing.',
      details: error.response?.data?.error || error.message
    });
  }
};

/**
 * Endpoint to generate and download the final Excel file.
 */
export const exportPRExcel = async (req, res) => {
  try {
    const prData = req.body;
    if (!prData || !prData.items) {
      return res.status(400).json({ error: 'No PR data provided for export.' });
    }

    console.log(`Generating Excel for ${prData.indentNo}...`);
    const filePath = await generateExcelPR(prData);

    // Send the file as a download
    res.download(filePath, `PR-${prData.indentNo}.xlsx`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });

  } catch (error) {
    console.error('Excel Export Trace:', error);
    res.status(500).json({ error: 'Failed to generate Excel file.', details: error.message });
  }
};
