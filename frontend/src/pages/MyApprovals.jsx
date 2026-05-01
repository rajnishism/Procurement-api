import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import {
  CheckCircle2, XCircle, Clock, ChevronRight, FileText,
  ShoppingCart, Layers, AlertTriangle, Search, RefreshCw, Inbox
} from 'lucide-react';

const typeConfig = {
  PR:  { icon: FileText,     color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'Purchase Requisition', detailPath: (id) => `/prs/${id}` },
  NFA: { icon: Layers,       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Note for Approval',    detailPath: (id) => `/nfa/${id}` },
  PO:  { icon: ShoppingCart, color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Purchase Order',        detailPath: (id) => `/pos/${id}` },
};

function TypeBadge({ type }) {
  const cfg = typeConfig[type] || typeConfig.PR;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase'
    }}>
      <Icon size={12} /> {type}
    </span>
  );
}

function LevelPipeline({ steps }) {
  const levels = [...new Set(steps.map(s => s.level))].sort((a, b) => a - b);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {levels.map((level, idx) => {
        const levelSteps = steps.filter(s => s.level === level);
        const allApproved = levelSteps.every(s => s.status === 'APPROVED');
        const anyRejected = levelSteps.some(s => s.status === 'REJECTED');
        const isPending = levelSteps.some(s => s.status === 'PENDING');

        const color = anyRejected ? '#ef4444' : allApproved ? '#10b981' : isPending ? '#6366f1' : '#94a3b8';
        const Icon = anyRejected ? XCircle : allApproved ? CheckCircle2 : Clock;

        return (
          <React.Fragment key={level}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 8,
              background: `${color}18`, border: `1px solid ${color}33`
            }}>
              <Icon size={11} color={color} />
              <span style={{ fontSize: 11, color, fontWeight: 600 }}>L{level}</span>
            </div>
            {idx < levels.length - 1 && <ChevronRight size={12} color="#475569" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ApprovalCard({ step, onClick, onViewEntity }) {
  const req = step.approvalRequest;
  const type = req.requestType;
  const cfg = typeConfig[type] || typeConfig.PR;

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div
      onClick={() => onClick(req.id)}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 14,
        padding: '18px 20px',
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.boxShadow = `0 8px 16px -2px rgba(0,0,0,0.05)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.05)';
      }}
    >
      {/* Row 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TypeBadge type={type} />
            <span style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(step.createdAt)}</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            {req.title || req.requestId}
          </span>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
            {req.requestId}
          </span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${cfg.color}40`
        }}>
          <ChevronRight size={16} color={cfg.color} />
        </div>
      </div>

      {/* Row 2 — level pipeline + view link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <LevelPipeline steps={req.steps} />
          {req.entityId && cfg.detailPath && (
            <button
              onClick={e => { e.stopPropagation(); onViewEntity(cfg.detailPath(req.entityId)); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`,
                color: cfg.color, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}20`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${cfg.color}10`; }}
            >
              View {type} ↗
            </button>
          )}
        </div>
        
        {step.status === 'PENDING' && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6366f1',
            background: 'rgba(99,102,241,0.12)', padding: '4px 12px', borderRadius: 20
          }}>
            Your Turn — Level {step.level}
          </span>
        )}
        {step.status === 'WAITING' && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#64748b',
            background: '#f1f5f9', padding: '4px 12px', borderRadius: 20
          }}>
            Waiting... (Level {step.level})
          </span>
        )}
        {step.status === 'APPROVED' && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#10b981',
            background: 'rgba(16,185,129,0.12)', padding: '4px 12px', borderRadius: 20
          }}>
            Approved by you
          </span>
        )}
        {step.status === 'REJECTED' && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#ef4444',
            background: 'rgba(239,68,68,0.12)', padding: '4px 12px', borderRadius: 20
          }}>
            Rejected by you
          </span>
        )}
      </div>
    </div>
  );
}

export default function MyApprovals() {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING, HISTORY, ALL
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/in-approvals/my');
      setSteps(res.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = steps.filter(s => {
    const req = s.approvalRequest;
    if (typeFilter !== 'ALL' && req.requestType !== typeFilter) return false;
    
    // Status filter
    if (statusFilter === 'PENDING') {
      if (s.status !== 'PENDING') return false;
    } else if (statusFilter === 'HISTORY') {
      if (s.status === 'PENDING' || s.status === 'WAITING') return false;
    }
    
    const q = search.toLowerCase();
    return !q || req.requestId.toLowerCase().includes(q) || (req.title || '').toLowerCase().includes(q);
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '32px 24px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #475569; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>
                My Approvals
              </h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                {filtered.length} {statusFilter === 'PENDING' ? 'pending action(s) require your attention' : 'request(s) found in this view'}
              </p>
            </div>
            <button
              onClick={load}
              style={{
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 10, padding: '8px 16px', color: '#818cf8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: 4, borderRadius: 12, width: 'max-content' }}>
            {['PENDING', 'HISTORY', 'ALL'].map(mode => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                style={{
                  padding: '8px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: statusFilter === mode ? '#ffffff' : 'transparent',
                  color: statusFilter === mode ? '#0f172a' : '#64748b',
                  boxShadow: statusFilter === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize'
                }}
              >
                {mode === 'HISTORY' ? 'History' : mode === 'PENDING' ? 'Action Required' : 'All'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by ID or title…"
                style={{
                  width: '100%', padding: '10px 14px 10px 40px',
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  borderRadius: 10, color: '#0f172a', fontSize: 14, outline: 'none'
                }}
              />
            </div>
            {['ALL', 'PR', 'NFA', 'PO'].map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: typeFilter === f ? 'rgba(99,102,241,0.15)' : '#ffffff',
                  border: typeFilter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid #e2e8f0',
                  color: typeFilter === f ? '#818cf8' : '#64748b', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >{f}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 120, borderRadius: 14,
                background: '#e2e8f0',
                border: '1px solid #cbd5e1',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: '#ffffff', borderRadius: 16,
            border: '1px dashed #cbd5e1'
          }}>
            <Inbox size={48} color="#334155" style={{ marginBottom: 16 }} />
            <h3 style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>No approvals found</h3>
            <p style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>{statusFilter === 'PENDING' ? "You're all caught up!" : "No items match your filters."}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(step => (
              <ApprovalCard
                key={step.id}
                step={step}
                onClick={(id) => navigate(`/approvals/${id}`)}
                onViewEntity={(path) => navigate(path)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
