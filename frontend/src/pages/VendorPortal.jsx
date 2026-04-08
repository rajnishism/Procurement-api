import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

/* ── tiny style helpers ─────────────────────────────────── */
const Screen = ({ children }) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f4f8,#e8ecf4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        {children}
    </div>
);
const Card = ({ children, wide }) => (
    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', width: '100%', maxWidth: wide ? 700 : 560, overflow: 'hidden' }}>
        {children}
    </div>
);
const Spinner = () => (
    <div style={{ width: 36, height: 36, border: '4px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

const MIME_ICON = (mime) => {
    if (mime?.includes('pdf')) return '📄';
    if (mime?.includes('word')) return '📝';
    if (mime?.includes('excel') || mime?.includes('spreadsheet')) return '📊';
    if (mime?.includes('image')) return '🖼️';
    if (mime?.includes('zip')) return '🗜️';
    return '📎';
};

const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ══════════════════════════════════════════════════════════
   VENDOR PORTAL — Quotation submission page
   ══════════════════════════════════════════════════════════ */
const VendorPortal = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const [state, setState] = useState('loading');
    const [data, setData] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [totalAmount, setTotalAmount] = useState('');
    const [taxAmount, setTaxAmount] = useState('');
    const [deliveryDays, setDeliveryDays] = useState('');
    const [validityDays, setValidityDays] = useState('');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState([]);   // File objects chosen locally
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const didFetch = useRef(false);

    /* ── Fetch RFQ data by token ── */
    useEffect(() => {
        if (!token || didFetch.current) return;
        didFetch.current = true;
        api.get(`/quotations/respond/${token}`)
            .then(res => {
                const d = res.data;
                if (d.rfqCancelled) { setState('cancelled'); setData(d); }
                else if (d.rfqClosed) { setState('closed'); setData(d); }
                else if (d.alreadySubmitted) { setState('already'); setData(d); }
                else {
                    setData(d);
                    const prItems = Array.isArray(d.rfq.lineItems) ? d.rfq.lineItems : [];
                    const items = prItems.length > 0
                        ? prItems.map(item => ({
                            description: item.description || '',
                            qty: item.qty || 1,
                            unit: item.unit || 'Nos',
                            unitPrice: '',
                        }))
                        : [{ description: '', qty: 1, unit: 'Nos', unitPrice: '' }]; // default blank row
                    setLineItems(items);
                    setState('form');
                }
            })
            .catch(() => { setState('error'); setError('This quotation link is invalid or has expired.'); });
    }, [token]);

    /* ── Auto-calculate total from line items ── */
    useEffect(() => {
        const sum = lineItems.reduce((acc, item) => {
            const q = parseFloat(item.qty) || 0;
            const p = parseFloat(item.unitPrice) || 0;
            return acc + q * p;
        }, 0);
        if (sum > 0) setTotalAmount(sum.toFixed(2));
    }, [lineItems]);

    /* ── Handle file input change ── */
    const onFileChange = (e) => {
        const chosen = Array.from(e.target.files);
        const MAX_FILES = 5;
        const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
        const allowed = new Set([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg', 'image/png', 'image/webp',
            'application/zip', 'application/x-zip-compressed',
        ]);

        const filtered = [];
        const errs = [];
        chosen.forEach(f => {
            if (!allowed.has(f.type)) errs.push(`${f.name}: file type not allowed.`);
            else if (f.size > MAX_SIZE) errs.push(`${f.name}: exceeds 20 MB limit.`);
            else if (files.length + filtered.length >= MAX_FILES) errs.push(`Max ${MAX_FILES} files allowed.`);
            else filtered.push(f);
        });

        if (errs.length) setError(errs.join(' '));
        else setError('');
        setFiles(prev => [...prev, ...filtered]);
        e.target.value = '';  // clear input so same file can be re-added after removal
    };

    const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

    /* ── Submit quotation ── */
    const handleSubmit = async () => {
        if (!totalAmount) {
            setError('Total amount is required.');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            // Must use FormData because we have files (multipart/form-data)
            const fd = new FormData();
            fd.append('totalAmount', parseFloat(totalAmount));
            fd.append('taxAmount', parseFloat(taxAmount || 0));
            if (deliveryDays) fd.append('deliveryDays', parseInt(deliveryDays));
            if (validityDays) fd.append('validityDays', parseInt(validityDays));
            if (notes) fd.append('notes', notes);
            fd.append('lineItems', JSON.stringify(
                lineItems.map(i => ({
                    description: i.description,
                    qty: i.qty,
                    unit: i.unit,
                    unitPrice: parseFloat(i.unitPrice),
                }))
            ));
            // Append each file under the key 'attachments'
            files.forEach(f => fd.append('attachments', f));

            await api.post(`/quotations/respond/${token}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setState('done');
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to submit quotation. Please try again.');
            setSubmitting(false);
        }
    };

    /* ── State screens ── */
    if (state === 'loading') return (
        <Screen><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Spinner /><p style={{ color: '#7c3aed', fontWeight: 600 }}>Loading RFQ details…</p>
        </div></Screen>
    );
    if (state === 'cancelled') return (
        <Screen><Card><div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span style={{ fontSize: 60 }}>❌</span>
            <h2 style={{ color: '#6b7280', marginTop: 16 }}>RFQ Cancelled</h2>
            <p style={{ color: '#9ca3af' }}>RFQ {data?.rfqNumber} has been cancelled. No action required.</p>
        </div></Card></Screen>
    );
    if (state === 'closed') return (
        <Screen><Card><div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span style={{ fontSize: 60 }}>🔒</span>
            <h2 style={{ color: '#6b7280', marginTop: 16 }}>RFQ Closed</h2>
            <p style={{ color: '#9ca3af' }}>This RFQ is no longer accepting quotations.</p>
        </div></Card></Screen>
    );
    if (state === 'already') return (
        <Screen><Card><div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span style={{ fontSize: 60 }}>✅</span>
            <h2 style={{ color: '#059669', marginTop: 16 }}>Quotation Already Submitted</h2>
            <p style={{ color: '#6b7280' }}>Your quotation for <strong>{data?.rfqNumber}</strong> was submitted on {new Date(data?.submittedAt).toLocaleDateString('en-IN')}.</p>
            {data?.attachments?.length > 0 && (
                <div style={{ marginTop: 20, textAlign: 'left', background: '#f9fafb', borderRadius: 12, padding: '16px 20px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 }}>Attachments Submitted</p>
                    {data.attachments.map((att, i) => (
                        <a key={i} href={`http://localhost:3000/api/${att.path}`} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: '#7c3aed', fontSize: 13, textDecoration: 'none' }}>
                            <span>{MIME_ICON(att.mimetype)}</span> {att.originalName} <span style={{ color: '#9ca3af', fontSize: 11 }}>({fmtSize(att.size)})</span>
                        </a>
                    ))}
                </div>
            )}
        </div></Card></Screen>
    );
    if (state === 'done') return (
        <Screen><Card><div style={{ textAlign: 'center', padding: '56px 24px' }}>
            <span style={{ fontSize: 72 }}>🎉</span>
            <h2 style={{ color: '#7c3aed', marginTop: 20 }}>Quotation Submitted!</h2>
            <p style={{ color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
                Thank you {data?.vendor?.name}. We have received your quotation and will review it before the closing date.
            </p>
        </div></Card></Screen>
    );
    if (state === 'error') return (
        <Screen><Card><div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span style={{ fontSize: 60 }}>⚠️</span>
            <h2 style={{ color: '#dc2626', marginTop: 16 }}>Invalid Link</h2>
            <p style={{ color: '#6b7280' }}>{error}</p>
        </div></Card></Screen>
    );

    /* ── Main form ── */
    const deadline = data?.rfq?.deadline ? new Date(data.rfq.deadline) : null;
    const daysLeft = deadline ? Math.ceil((deadline - Date.now()) / 86400000) : null;

    return (
        <Screen>
            <Card wide>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', padding: '28px 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Submit Quotation</p>
                            <h2 style={{ color: '#fff', margin: '4px 0 0', fontSize: 22, fontWeight: 800 }}>
                                {data?.rfq?.rfqNumber} — {data?.rfq?.title}
                            </h2>
                        </div>
                        {daysLeft !== null && (
                            <span style={{ background: daysLeft <= 3 ? '#dc2626' : '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 20 }}>
                                {daysLeft <= 0 ? 'Deadline passed' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                            </span>
                        )}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '10px 0 0' }}>
                        Hello <strong style={{ color: '#fff' }}>{data?.vendor?.name}</strong> — fill in your prices, terms, attach supporting documents, and submit.
                    </p>
                </div>

                <div style={{ padding: '28px 32px', overflowY: 'auto', maxHeight: '80vh' }}>

                    {/* PR context */}
                    {data?.rfq?.prNumber && (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                            <span style={{ fontWeight: 700, color: '#7c3aed' }}>PR Ref: {data.rfq.prNumber}</span>
                            {data.rfq.prDescription && <span style={{ color: '#6b7280', marginLeft: 12 }}>{data.rfq.prDescription?.slice(0, 80)}</span>}
                            {data.rfq.description && <p style={{ margin: '6px 0 0', color: '#6b7280' }}>{data.rfq.description}</p>}
                        </div>
                    )}

                    {/* ── LINE ITEMS TABLE ── */}
                    {
                        <div style={{ marginBottom: 24 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                Line Items — Enter Your Unit Prices
                            </p>
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            {['#', 'Description', 'Qty', 'Unit', 'Unit Price (₹)', 'Total (₹)', ''].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.map((item, i) => {
                                            const total = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
                                            return (
                                                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                                                    <td style={{ padding: '10px 12px' }}>
                                                        <input style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, background: 'transparent' }}
                                                            value={item.description}
                                                            onChange={e => { const l = [...lineItems]; l[i].description = e.target.value; setLineItems(l); }} />
                                                    </td>
                                                    <td style={{ padding: '10px 12px', width: 60 }}>
                                                        <input type="number" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', fontSize: 13, outline: 'none', textAlign: 'center' }}
                                                            value={item.qty}
                                                            onChange={e => { const l = [...lineItems]; l[i].qty = e.target.value; setLineItems(l); }} />
                                                    </td>
                                                    <td style={{ padding: '10px 12px', width: 70 }}>
                                                        <input style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', fontSize: 13, outline: 'none' }}
                                                            value={item.unit}
                                                            onChange={e => { const l = [...lineItems]; l[i].unit = e.target.value; setLineItems(l); }} />
                                                    </td>
                                                    <td style={{ padding: '10px 12px', width: 120 }}>
                                                        <input type="number" placeholder="0.00" style={{ width: '100%', border: '1px solid #7c3aed', borderRadius: 6, padding: '6px 8px', fontSize: 13, fontWeight: 700, outline: 'none', color: '#7c3aed' }}
                                                            value={item.unitPrice}
                                                            onChange={e => { const l = [...lineItems]; l[i].unitPrice = e.target.value; setLineItems(l); }} />
                                                    </td>
                                                    <td style={{ padding: '10px 12px', width: 100, fontWeight: 700, color: '#374151', textAlign: 'right' }}>
                                                        {total > 0 ? `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', width: 32 }}>
                                                        {lineItems.length > 1 && (
                                                            <button onClick={() => setLineItems(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }} title="Remove row">✕</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                onClick={() => setLineItems(prev => [...prev, { description: '', qty: 1, unit: 'Nos', unitPrice: '' }])}
                                style={{ marginTop: 8, background: 'none', border: '1px dashed #d1d5db', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }}
                            >
                                + Add Item
                            </button>
                        </div>
                    }

                    {/* ── FINANCIALS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        {[
                            { label: 'Total Amount (₹) *', val: totalAmount, set: setTotalAmount, type: 'number' },
                            { label: 'Tax / GST (₹)', val: taxAmount, set: setTaxAmount, type: 'number' },
                            { label: 'Delivery Period (Days)', val: deliveryDays, set: setDeliveryDays, type: 'number' },
                            { label: 'Validity (Days)', val: validityDays, set: setValidityDays, type: 'number' },
                        ].map(f => (
                            <div key={f.label}>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{f.label}</label>
                                <input type={f.type} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                                    value={f.val} onChange={e => f.set(e.target.value)} />
                            </div>
                        ))}
                    </div>

                    {/* ── NOTES ── */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                            Terms, Conditions & Notes
                        </label>
                        <textarea rows={2} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                            value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Payment terms (e.g. 30 days net), warranty period, brand/make, special conditions…" />
                    </div>

                    {/* ── FILE ATTACHMENTS ── */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            Supporting Documents (optional — max 5 files, 20 MB each)
                        </label>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
                            Accepted: PDF, Word (.docx), Excel (.xlsx), Images (JPG/PNG), ZIP
                        </p>

                        {/* Drop zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s', background: '#fafafa' }}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#7c3aed'; }}
                            onDragLeave={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                            onDrop={e => { e.preventDefault(); e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d1d5db'; onFileChange({ target: { files: e.dataTransfer.files, value: '' } }); }}
                        >
                            <p style={{ fontSize: 28, marginBottom: 8 }}>📎</p>
                            <p style={{ color: '#7c3aed', fontWeight: 700, fontSize: 13, margin: 0 }}>Click to browse or drag & drop files here</p>
                            <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>Quotation PDF, technical specs, datasheet, etc.</p>
                        </div>
                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip" style={{ display: 'none' }} onChange={onFileChange} />

                        {/* File list */}
                        {files.length > 0 && (
                            <div style={{ marginTop: 12, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                                {files.map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < files.length - 1 ? '1px solid #f1f5f9' : 'none', background: '#fff' }}>
                                        <span style={{ fontSize: 20 }}>{MIME_ICON(f.type)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{fmtSize(f.size)}</p>
                                        </div>
                                        <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }} title="Remove">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── GRAND TOTAL PREVIEW ── */}
                    {totalAmount && (
                        <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>Grand Total (incl. tax)</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5' }}>
                                ₹{(parseFloat(totalAmount) + parseFloat(taxAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {submitting ? (
                            <><div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                        ) : (
                            <>✅ Submit Quotation{files.length > 0 ? ` + ${files.length} file${files.length > 1 ? 's' : ''}` : ''}</>
                        )}
                    </button>
                </div>
            </Card>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Screen>
    );
};

export default VendorPortal;
