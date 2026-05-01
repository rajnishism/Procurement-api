import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import jwt from 'jsonwebtoken';

async function testParse() {
    const secret = 'procurement-erp-jwt-secret-key-2026-change-in-production';
    const token = jwt.sign({ id: 'a0b30afd-c60c-4c95-b90a-f7e1545f8f98', role: 'creator', department: 'Procurement' }, secret);
    
    const fd = new FormData();
    fd.append('document', fs.createReadStream('./NFA.docx'));
    
    try {
        const res = await axios.post('http://localhost:3000/api/nfas/parse', fd, {
            headers: {
                ...fd.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Success:", res.data);
    } catch (e) {
        if (e.response) {
            console.error("API Error:", e.response.status, e.response.data);
        } else {
            console.error("Network Error:", e.message);
        }
    }
}
testParse();

