import prisma from './src/utils/db.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

(async () => {
    const user = await prisma.user.findFirst();
    if (!user) { console.log('NO USER'); process.exit(1); }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'procurement-erp-jwt-secret-key-2026-change-in-production');

    try {
        const res = await axios.post('http://localhost:3000/api/purchase-orders/generate-excel', {
            po_number: 'PO/2026/013',
            vendor_details: '',
            shipping_address: 'Mine Site / As per contract',
            quotation_reference: '',
            quotation_date: '',
            pr_number: '',
            price_basis: 'FOR Site',
            payment_terms: '30 days after invoice',
            delivery_date: '',
            po_items: [{ description: '', unit: 'Nos', quantity: 1, rate: 0 }],
            total_amount: 0,
            signature: 'Authorized Signatory'
        }, { headers: { Authorization: 'Bearer ' + token } });
        console.log('SUCCESS:', res.data);
    } catch(err) {
        console.error('SERVER RESPONDED:', err.response?.data || err.message);
    }
    process.exit(0);
})();
