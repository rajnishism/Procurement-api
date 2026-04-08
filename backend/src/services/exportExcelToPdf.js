import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Convert Excel → PDF using LibreOffice (pixel-perfect)
 * @param {string} inputPath - Path to Excel file
 * @param {string} outputDir - Directory to save PDF
 * @param {object} options - Optional configs
 * @returns {Promise<string>} - Returns generated PDF path
 */
export async function excelToPDF(inputPath, outputDir, options = {}) {
    return new Promise((resolve, reject) => {

        // 🔹 Validate input
        if (!fs.existsSync(inputPath)) {
            return reject(new Error("Input file not found"));
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 🔹 File name
        const fileName = path.basename(inputPath, path.extname(inputPath));
        const outputFile = path.join(outputDir, `${fileName}.pdf`);

        // 🔹 LibreOffice path (customizable)
        const libreOfficePath = options.libreOfficePath || '/Applications/LibreOffice.app/Contents/MacOS/soffice';

        // 🔹 Command
        const command = `"${libreOfficePath}" --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`;

        console.log("🚀 Running:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ Conversion error:", stderr);
                return reject(error);
            }

            // 🔹 Ensure file exists
            if (!fs.existsSync(outputFile)) {
                return reject(new Error("PDF not generated"));
            }

            console.log("✅ PDF created:", outputFile);
            resolve(outputFile);
        });
    });
}

// example use case

// excelToPDF('backend/files/templates/template_pr.xlsx', 'output');