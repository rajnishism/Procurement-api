import { parseNFA } from './src/services/nfaParser.js';

async function test() {
    try {
        const result = await parseNFA('NFA.docx');
        console.log('Final Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
