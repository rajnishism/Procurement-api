import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import {
  CheckCircle2, XCircle, Clock, ChevronLeft, User2, AlertTriangle,
  FileText, ShoppingCart, Layers, Lock, CalendarDays, MessageSquare,
  ArrowRight, Shield, Loader2, ExternalLink
} from 'lucide-react';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const typeConfig = {
  PR:  { icon: FileText,     color: '#6366f1', label: 'Purchase Requisition', detailPath: (id) => `/prs/${id}` },
  NFA: { icon: Layers,       color: '#f59e0b', label: 'Note for Approval',    detailPath: (id) => `/nfa/${id}` },
  PO:  { icon: ShoppingCart, color: '#10b981', label: 'Purchase Order',       detailPath: (id) => `/pos/${id}` },
};

const statusConfig = {
  PENDING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock,         label: 'Pending' },
  WAITING:  { color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: Lock,          label: 'Waiting' },
  APPROVED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2,  label: 'Approved' },
  REJECTED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle,       label: 'Rejected' },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusPill({ status }) {
  const cfg = statusConfig[status] || statusConfig.WAITING;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 12px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600
    }}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

// ─── APPROVAL STEP CARD ───────────────────────────────────────────────────────
function StepCard({ step, isMe, isCurrent }) {
  const cfg = statusConfig[step.status] || statusConfig.WAITING;
  return (
    <div style={{
      background: isCurrent ? '#eff6ff' : '#ffffff',
      border: isCurrent ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
      borderRadius: 12, padding: '16px 18px',
      position: 'relative', overflow: 'hidden',
    }}>
      {isCurrent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {/* Approver Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: cfg.bg, border: `1.5px solid ${cfg.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {step.status === 'APPROVED' ? (
              <CheckCircle2 size={18} color={cfg.color} />
            ) : step.status === 'REJECTED' ? (
              <XCircle size={18} color={cfg.color} />
            ) : step.status === 'PENDING' ? (
              <Clock size={18} color={cfg.color} />
            ) : (
              <Lock size={18} color={cfg.color} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                {step.approver?.name || 'Unknown'}
              </span>
              {isMe && isCurrent && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#6366f1',
                  background: 'rgba(99,102,241,0.15)', padding: '1px 7px', borderRadius: 10
                }}>YOU</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {step.approver?.designation || step.approver?.role || '—'} · Level {step.level}
            </div>
            {step.actedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <CalendarDays size={11} color="#475569" />
                <span style={{ fontSize: 11, color: '#475569' }}>{fmtDate(step.actedAt)}</span>
              </div>
            )}
          </div>
        </div>
        <StatusPill status={step.status} />
      </div>
      {step.remarks && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: '#f8fafc', borderRadius: 8,
          display: 'flex', gap: 8, alignItems: 'flex-start'
        }}>
          <MessageSquare size={13} color="#64748b" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{step.remarks}</span>
        </div>
      )}
    </div>
  );
}

// ─── ACTION PANEL ─────────────────────────────────────────────────────────────
function ActionPanel({ requestId, onDone }) {
  const [action, setAction] = useState(null); // 'APPROVED' | 'REJECTED'
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!action) return;
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`/in-approvals/${requestId}/action`, { action, remarks });
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1.5px solid #e2e8f0',
      borderRadius: 14, padding: '20px 22px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Shield size={16} color="#818cf8" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#818cf8' }}>Your Decision</span>
      </div>

      {/* Approve / Reject toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { value: 'APPROVED', label: '✓  Approve', color: '#10b981', bg: '#d1fae5', border: '#a7f3d0' },
          { value: 'REJECTED', label: '✕  Reject',  color: '#ef4444', bg: '#fee2e2', border: '#fecaca' },
        ].map(btn => (
          <button
            key={btn.value}
            onClick={() => setAction(btn.value)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: action === btn.value ? btn.bg : '#f8fafc',
              border: action === btn.value ? `1.5px solid ${btn.border}` : '1.5px solid #e2e8f0',
              color: action === btn.value ? btn.color : '#64748b',
            }}
          >{btn.label}</button>
        ))}
      </div>

      {/* Remarks */}
      <textarea
        value={remarks}
        onChange={e => setRemarks(e.target.value)}
        placeholder={action === 'REJECTED' ? 'Reason for rejection (required for audit)…' : 'Remarks (optional)…'}
        rows={3}
        style={{
          width: '100%', resize: 'vertical', padding: '10px 12px',
          background: '#ffffff', border: '1px solid #cbd5e1',
          borderRadius: 9, color: '#0f172a', fontSize: 13, outline: 'none',
          fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box'
        }}
      />

      {error && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', gap: 8, alignItems: 'center'
        }}>
          <AlertTriangle size={14} color="#ef4444" />
          <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>
        </div>
      )}

      <button
        disabled={!action || submitting}
        onClick={handleSubmit}
        style={{
          marginTop: 14, width: '100%', padding: '12px',
          borderRadius: 10, fontSize: 14, fontWeight: 700,
          background: action === 'APPROVED'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : action === 'REJECTED'
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : '#f1f5f9',
          border: 'none', color: action ? '#fff' : '#64748b',
          cursor: action && !submitting ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s', opacity: submitting ? 0.7 : 1
        }}
      >
        {submitting ? (
          <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
        ) : (
          <>Submit Decision <ArrowRight size={14} /></>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await axios.get(`/in-approvals/${id}`);
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else if (err.response?.status === 403) setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: 'center', color: '#475569' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p>Loading approval details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif", textAlign: 'center', padding: 24
      }}>
        <div>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
          }}>
            <Lock size={32} color="#ef4444" />
          </div>
          <h2 style={{ color: '#0f172a', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Access Denied</h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
            You do not have permission to view this approval request.
            Only assigned approvers and the request creator can access this page.
          </p>
          <button
            onClick={() => navigate('/approvals')}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: '#6366f1', border: 'none', color: '#fff',
              cursor: 'pointer', fontWeight: 600, fontSize: 14
            }}
          >
            ← Back to My Approvals
          </button>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter', sans-serif", textAlign: 'center'
      }}>
        <div>
          <XCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
          <h2 style={{ color: '#0f172a' }}>Approval Not Found</h2>
          <button onClick={() => navigate('/approvals')}
            style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer' }}>
            ← Back to Approvals
          </button>
        </div>
      </div>
    );
  }

  const type = data.requestType;
  const cfg = typeConfig[type] || typeConfig.PR;
  const TypeIcon = cfg.icon;
  
  // Status Derivation (Fallback Safety)
  const isActuallyRejected = data.steps.some(s => s.status === 'REJECTED');
  const isActuallyApproved = data.steps.length > 0 && data.steps.every(s => s.status === 'APPROVED');
  const derivedStatus = isActuallyRejected ? 'REJECTED' : (isActuallyApproved ? 'APPROVED' : data.status);

  const overallStatus = statusConfig[derivedStatus] || statusConfig.WAITING;
  const OverallIcon = overallStatus.icon;

  // Group steps by level
  const levels = [...new Set(data.steps.map(s => s.level))].sort((a, b) => a - b);

  // Find MY pending step
  const myPendingStep = data.steps.find(s => s.approverId === user?.id && s.status === 'PENDING');
  const canAct = !!myPendingStep && derivedStatus === 'PENDING';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '32px 24px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        textarea::placeholder { color: #475569; }
      `}</style>

      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 13, marginBottom: 24,
            padding: '6px 0', transition: 'color 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <ChevronLeft size={16} /> Back to My Approvals
        </button>

        {/* Hero Block */}
        <div style={{
          background: `#ffffff`,
          border: `1px solid #e2e8f0`,
          borderRadius: 18, padding: '28px 32px', marginBottom: 24,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 200, height: 200,
            borderRadius: '50%', background: `${cfg.color}08`, filter: 'blur(40px)', pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              {/* Type + Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${cfg.color}20`, border: `1.5px solid ${cfg.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <TypeIcon size={18} color={cfg.color} />
                </div>
                <div>
                  <span style={{ fontSize: 12, color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {cfg.label}
                  </span>
                </div>
                <StatusPill status={derivedStatus} />
              </div>

              {isActuallyApproved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                   <div style={{ padding: '2px 8px', borderRadius: 6, background: '#d1fae5', color: '#059669', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                     <CheckCircle2 size={12} /> Fully Approved
                   </div>
                </div>
              )}

              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: -0.3 }}>
                {data.title || data.requestId}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>
                {data.requestId}
              </p>
            </div>

            {/* Overall status badge */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: overallStatus.bg, border: `2px solid ${overallStatus.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <OverallIcon size={26} color={overallStatus.color} />
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div style={{
            display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap',
            paddingTop: 16, borderTop: '1px solid #e2e8f0'
          }}>
            {[
              { label: 'Created By', value: data.createdBy?.name || '—' },
              { label: 'Created At', value: fmtDate(data.createdAt) },
              { label: 'Type', value: type },
              { label: 'Approval Levels', value: levels.length },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* View Entity Button */}
        {data.entityId && cfg.detailPath && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => navigate(cfg.detailPath(data.entityId))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: `${cfg.color}12`, border: `1.5px solid ${cfg.color}30`,
                color: cfg.color, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}22`; e.currentTarget.style.borderColor = `${cfg.color}60`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${cfg.color}12`; e.currentTarget.style.borderColor = `${cfg.color}30`; }}
            >
              <ExternalLink size={14} />
              View {cfg.label} Details
            </button>
          </div>
        )}

        {/* Approval Steps — per level */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Approval Chain
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {levels.map((level, li) => {
              const levelSteps = data.steps.filter(s => s.level === level);
              const allApproved = levelSteps.every(s => s.status === 'APPROVED');
              const anyRejected = levelSteps.some(s => s.status === 'REJECTED');
              const isPending = levelSteps.some(s => s.status === 'PENDING');
              const levelColor = anyRejected ? '#ef4444' : allApproved ? '#10b981' : isPending ? '#6366f1' : '#475569';
              const mode = levelSteps[0]?.approvalMode;

              return (
                <React.Fragment key={level}>
                  {li > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                      <ArrowRight size={14} color="#334155" />
                    </div>
                  )}
                  <div style={{
                    background: '#ffffff',
                    border: `1px solid #e2e8f0`,
                    borderRadius: 14, overflow: 'hidden',
                    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)'
                  }}>
                    {/* Level header */}
                    <div style={{
                      background: `#f8fafc`,
                      borderBottom: '1px solid #e2e8f0',
                      padding: '10px 16px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: levelColor }}>Level {level}</span>
                      {mode && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: levelColor,
                          background: `${levelColor}18`, padding: '2px 8px', borderRadius: 20
                        }}>
                          {mode === 'ALL' ? 'All must approve' : 'Any one approver'}
                        </span>
                      )}
                    </div>
                    {/* Steps */}
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {levelSteps.map(step => (
                        <StepCard
                          key={step.id}
                          step={step}
                          isMe={step.approverId === user?.id}
                          isCurrent={step.status === 'PENDING'}
                        />
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Action Panel or Info banner */}
        {canAct ? (
          <ActionPanel requestId={data.id} onDone={load} />
        ) : data.status !== 'PENDING' ? (
          <div style={{
            padding: '16px 20px', borderRadius: 12, textAlign: 'center',
            background: `${overallStatus.color}10`, border: `1px solid ${overallStatus.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}>
            <OverallIcon size={18} color={overallStatus.color} />
            <span style={{ color: overallStatus.color, fontWeight: 600, fontSize: 14 }}>
              This approval request has been {data.status.toLowerCase()}.
            </span>
          </div>
        ) : (
          <div style={{
            padding: '14px 18px', borderRadius: 12,
            background: '#ffffff', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <Lock size={16} color="#64748b" />
            <span style={{ color: '#64748b', fontSize: 13 }}>
              You are not the current approver for this request. Only the assigned approver at the active level can take action.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
