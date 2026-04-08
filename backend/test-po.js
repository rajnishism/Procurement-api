import axios from 'axios';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 'test', role: 'ADMIN' }, 'procurement-erp-jwt-secret-key-2026-change-in-production');

axios.post('http://localhost:3000/api/purchase-orders/generate-excel', {
    po_number: "PO/2026/001",
    vendor_details: "Test Vendor\nTest Address",
    po_items: [{ description: "test item", quantity: 1, rate: 0, unit: "Nos" }],
    total_amount: 0
}, {
    headers: { Authorization: `Bearer ${token}` }
}).then(res => console.log(res.data)).catch(err => {
    console.log(err.response?.data);
});
