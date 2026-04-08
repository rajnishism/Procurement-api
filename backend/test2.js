import axios from 'axios';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 'test', role: 'ADMIN' }, process.env.JWT_SECRET || 'procurement-erp-jwt-secret-key-2026-change-in-production');

const main = async () => {
    try {
        // 1. Generate PO
        const genRes = await axios.post('http://localhost:3000/api/purchase-orders/generate-excel', {
            po_number: 'PO-TESTING-APPROVALS',
            vendor_details: '',
            shipping_address: 'Mine Site / As per contract',
            po_items: [{ description: 'test', quantity: 1, rate: 0, unit: 'Nos' }],
            total_amount: 0,
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        console.log("DRAFT GENERATED:", genRes.data);
        const poId = genRes.data.poId;

        // 2. Fetch Approvers
        const appRes = await axios.get('http://localhost:3000/api/master-data/approvers', { headers: { Authorization: `Bearer ${token}` } });
        const approverIds = appRes.data.map(a => a.id).slice(0, 2);
        console.log("APPROVERS SELECTED:", approverIds);

        // 3. Initiate Workflow
        const initRes = await axios.post('http://localhost:3000/api/po-approvals/send', {
            poId,
            approverIds
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        console.log("INIT SUCCESS:", initRes.data);

    } catch(err) {
        console.error("ERROR CAUGHT:");
        console.error(err.response?.data || err.message);
    }
};

main();
