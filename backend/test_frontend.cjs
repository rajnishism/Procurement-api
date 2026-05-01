const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

async function run() {
    const secret = 'procurement-erp-jwt-secret-key-2026-change-in-production';
    const token = jwt.sign({ id: 'a0b30afd-c60c-4c95-b90a-f7e1545f8f98', role: 'creator', department: 'Procurement' }, secret);
    
    const fd = new FormData();
    fd.append('document', fs.createReadStream('./NFA.docx'));
    
    try {
        const res = await axios.post('http://localhost:3000/api/nfas/parse', fd, {
            headers: { 
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`
            },
        });
        console.log("SUCCESS:", res.data);
    } catch (err) {
        console.log("ERROR MESSAGE:", err.message);
        console.log("ERROR DATA:", err.response?.data);
    }
}
run();
