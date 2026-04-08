import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const run = async () => {
    // We don't have the file path. Let's ask the user to give it to us or we'll search.
    try {
        const files = fs.readdirSync('./uploads').filter(f => f.endsWith('.pdf'));
        if (files.length === 0) {
            console.log("NO PDF FILES FOUND IN ./uploads");
            return;
        }

        let latestPdf = './uploads/' + files[0];
        console.log("Analyzing:", latestPdf);

        const buffer = fs.readFileSync(latestPdf);

        const render_page = async (pageData) => {
            const textContent = await pageData.getTextContent({
                normalizeWhitespace: false,
                disableCombineTextItems: false
            });

            const rawCoords = textContent.items.map(i => ({
                text: i.str,
                x: Math.round(i.transform[4]),
                y: Math.round(i.transform[5])
            }));

            fs.writeFileSync('pdf_raw_coords.json', JSON.stringify(rawCoords, null, 2));
            console.log("Wrote raw coords to pdf_raw_coords.json");
            return "";
        };

        await pdf(buffer, { pagerender: render_page });
    } catch (e) {
        console.error(e);
    }
};

run().catch(console.error);
