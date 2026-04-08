import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const statusConfig = {
    APPROVED: { color: '#059669', bg: '#d1fae5', label: 'Approved', icon: '✅' },
    REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'Rejected', icon: '❌' },
    PENDING: { color: '#d97706', bg: '#fef3c7', label: 'Pending', icon: '⏳' },
};

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function ApprovalAction() {
    const [params] = useSearchParams();
    const token = params.get('token');
    const defaultDecision = params.get('decision'); // 'approve' or 'reject' from email button

    const [state, setState] = useState('loading'); // loading | form | done | error | already
    const [data, setData] = useState(null);
    const [decision, setDecision] = useState('');
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [indentNo, setIndentNo] = useState('');
    const [wbsCode, setWbsCode] = useState('');
    const didFetch = useRef(false);

    useEffect(() => {
        if (!token || didFetch.current) return;
        didFetch.current = true;

        api.get(`/approvals/actions/${token}`)
            .then(res => {
                if (res.data.prDeleted) {
                    setState('cancelled');
                    setData(res.data);
                } else if (res.data.alreadyResponded) {
                    setState('already');
                    setData(res.data);
                } else {
                    setData(res.data);
                    // Pre-fill from email button
                    if (defaultDecision === 'approve') setDecision('APPROVED');
                    else if (defaultDecision === 'reject') setDecision('REJECTED');

                    setIndentNo(res.data.pr.prNumber || '');
                    setWbsCode(res.data.pr.wbsCode || '');

                    setState('form');
                }
            })
            .catch(() => {
                setState('error');
                setError('This approval link is invalid or has expired.');
            });
    }, [token, defaultDecision]);

    const handleSubmit = async () => {
        if (!decision) return;
        setSubmitting(true);
        setError('');

        if (approver?.role === 'STAGE1' && decision === 'APPROVED' && (!indentNo || !wbsCode)) {
            setError('Please provide valid Indent No and WBS Code to proceed with approval.');
            setSubmitting(false);
            return;
        }

        try {
            const res = await api.post(`/approvals/actions/${token}`, {
                decision,
                comments,
                indentNo: approver?.role === 'STAGE1' ? indentNo : undefined,
                wbsCode: approver?.role === 'STAGE1' ? wbsCode : undefined
            });
            setResult(res.data);
            setState('done');
        } catch (err) {
            // Handle the case where PR was deleted between page load and submit
            if (err.response?.data?.prDeleted) {
                setState('cancelled');
                setData(err.response.data);
            } else {
                setError(err.response?.data?.error || 'Failed to submit decision.');
                setState('error');
            }
        }
    };

    // ---- SCREENS ----
    if (state === 'loading') return <Screen><Spinner /></Screen>;

    if (state === 'cancelled') return (
        <Screen>
            <Card>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span style={{ fontSize: 56 }}>🗑️</span>
                    <h2 style={{ color: '#6b7280', marginTop: 16 }}>PR Cancelled</h2>
                    <p style={{ color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
                        PR <strong>{data?.prNumber}</strong> has been cancelled or withdrawn.
                        No action is required from you.
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 20 }}>You may close this window.</p>
                </div>
            </Card>
        </Screen>
    );

    if (state === 'error') return (
        <Screen>
            <Card>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span style={{ fontSize: 56 }}>⚠️</span>
                    <h2 style={{ color: '#dc2626', marginTop: 16 }}>Link Invalid</h2>
                    <p style={{ color: '#6b7280', marginTop: 8 }}>{error}</p>
                </div>
            </Card>
        </Screen>
    );

    if (state === 'already') return (
        <Screen>
            <Card>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span style={{ fontSize: 56 }}>
                        {statusConfig[data.status]?.icon}
                    </span>
                    <h2 style={{ color: statusConfig[data.status]?.color, marginTop: 16 }}>
                        Already Responded
                    </h2>
                    <p style={{ color: '#6b7280', marginTop: 8 }}>
                        You already {data.status === 'APPROVED' ? 'approved' : 'rejected'} PR <strong>{data.prNumber}</strong>.
                    </p>
                    <StatusBadge status={data.status} />
                </div>
            </Card>
        </Screen>
    );

    if (state === 'done') return (
        <Screen>
            <Card>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <span style={{ fontSize: 64 }}>
                        {result.decision === 'APPROVED' ? '✅' : '❌'}
                    </span>
                    <h2 style={{ color: result.decision === 'APPROVED' ? '#059669' : '#dc2626', marginTop: 16 }}>
                        {result.decision === 'APPROVED' ? 'Approved!' : 'Rejected'}
                    </h2>
                    <p style={{ color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>
                        Thank you. Your decision has been recorded.
                    </p>
                    <div style={{ marginTop: 20, padding: '12px 20px', background: '#f8fafc', borderRadius: 8, display: 'inline-block' }}>
                        <span style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>PR Status</span>
                        <div style={{ marginTop: 4 }}><StatusBadge status={result.prStatus} /></div>
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 24 }}>You may now close this window.</p>
                </div>
            </Card>
        </Screen>
    );

    // state === 'form'
    const { pr, approver } = data;
    const cfg = statusConfig[decision] || {};

    return (
        <Screen>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg,#1a56db,#1e429f)',
                borderRadius: 16, padding: '28px 36px', marginBottom: 24, color: '#fff'
            }}>
                <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>Purchase Requisition</div>
                <h1 style={{ margin: '6px 0 4px', fontSize: 26, fontWeight: 800 }}>{pr.prNumber}</h1>
                <div style={{ opacity: 0.75, fontSize: 13 }}>Approval required from <strong>{approver?.name}</strong> as <strong style={{ color: '#fff', textDecoration: 'underline' }}>{approver?.role}</strong></div>
            </div>

            {/* PR Details */}
            <Card style={{ marginBottom: 20 }}>
                <SectionTitle>PR Details</SectionTitle>
                <Grid>
                    <InfoRow label="Date" value={pr.prDate ? new Date(pr.prDate).toLocaleDateString('en-IN') : '—'} />
                    <InfoRow label="Department" value={pr.department} />
                    {approver?.role === 'STAGE1' ? (
                        <>
                            <EditableRow
                                label="Assign Indent No"
                                value={indentNo}
                                onChange={setIndentNo}
                                placeholder="e.g. PR-2026-X"
                            />
                            <EditableRow
                                label="Assign WBS Code"
                                value={wbsCode}
                                onChange={setWbsCode}
                                placeholder="WBS001"
                            />
                        </>
                    ) : (
                        <>
                            <InfoRow label="Indent No" value={pr.prNumber} />
                            <InfoRow label="WBS Code" value={pr.wbsCode || '—'} />
                        </>
                    )}
                </Grid>
                <div style={{ marginTop: 16 }}>
                    <InfoRow label="Description / Item" value={pr.description} fullWidth />
                </div>
                <div style={{
                    marginTop: 20, padding: '16px 20px',
                    background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Value</span>
                    <span style={{ fontSize: 26, fontWeight: 900, color: '#1a56db' }}>{formatCurrency(pr.totalValue)}</span>
                </div>
            </Card>



            {/* Line Items */}
            {pr.lineItems?.length > 0 && (
                <Card style={{ marginBottom: 20 }}>
                    <SectionTitle>Line Items</SectionTitle>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pr.lineItems.map((item, i) => (
                                <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={tdStyle}>{item.sNo || i + 1}</td>
                                    <td style={tdStyle}>{item.text || item.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Decision Form */}
            <Card>
                <SectionTitle>Your Decision</SectionTitle>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <DecisionBtn
                        active={decision === 'APPROVED'}
                        onClick={() => setDecision('APPROVED')}
                        color="#059669" bg="#d1fae5" label="✅ Approve"
                    />
                    <DecisionBtn
                        active={decision === 'REJECTED'}
                        onClick={() => setDecision('REJECTED')}
                        color="#dc2626" bg="#fee2e2" label="❌ Reject"
                    />
                </div>

                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    Comments <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </label>
                <textarea
                    rows={3}
                    style={{
                        width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
                        padding: '12px 14px', fontSize: 14, fontFamily: 'inherit',
                        resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                    }}
                    placeholder="Add your comments here..."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                />

                {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={!decision || submitting}
                    style={{
                        marginTop: 20, width: '100%', padding: '16px',
                        background: decision ? (decision === 'APPROVED' ? '#059669' : '#dc2626') : '#d1d5db',
                        color: '#fff', border: 'none', borderRadius: 12,
                        fontSize: 15, fontWeight: 800, cursor: decision ? 'pointer' : 'not-allowed',
                        letterSpacing: 0.5, transition: 'background 0.2s',
                        opacity: submitting ? 0.7 : 1
                    }}
                >
                    {submitting ? 'Submitting...' : decision ? `Submit ${statusConfig[decision]?.label}` : 'Select a Decision Above'}
                </button>
            </Card>
        </Screen>
    );
}

const EditableRow = ({ label, value, onChange, placeholder }) => (
    <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%',
                padding: '8px 10px',
                marginTop: 4,
                border: '1.5px solid #c7d2fe',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: '#1e429f',
                background: '#f5f7ff',
                outline: 'none'
            }}
        />
    </div>
);

// ---- Sub-components ----
const Screen = ({ children }) => (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 580 }}>{children}</div>
    </div>
);

const Card = ({ children, style }) => (
    <div style={{ background: '#fff', borderRadius: 16, padding: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', ...style }}>
        {children}
    </div>
);

const SectionTitle = ({ children }) => (
    <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
        {children}
    </h3>
);

const Grid = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>{children}</div>
);

const InfoRow = ({ label, value, fullWidth }) => (
    <div style={fullWidth ? {} : {}}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{value}</div>
    </div>
);

const DecisionBtn = ({ active, onClick, color, bg, label }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1, padding: '16px', borderRadius: 12, border: `2.5px solid ${active ? color : '#e5e7eb'}`,
            background: active ? bg : '#f9fafb', color: active ? color : '#6b7280',
            fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'all 0.15s'
        }}
    >
        {label}
    </button>
);

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.PENDING;
    return (
        <span style={{
            display: 'inline-block', padding: '4px 16px', borderRadius: 100,
            background: cfg.bg, color: cfg.color, fontWeight: 800, fontSize: 12
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

const Spinner = () => (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
        <div style={{
            width: 40, height: 40, border: '3px solid #e5e7eb',
            borderTopColor: '#1a56db', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p>Loading approval details...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdStyle = { padding: '10px 12px', color: '#374151' };
