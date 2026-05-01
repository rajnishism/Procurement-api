import React, { createContext, useState, useContext, useCallback } from 'react';

const GlobalErrorContext = createContext();

export const useGlobalError = () => {
    const context = useContext(GlobalErrorContext);
    if (!context) {
        throw new Error('useGlobalError must be used within a GlobalErrorProvider');
    }
    return context;
};

export const GlobalErrorProvider = ({ children }) => {
    const [error, setError] = useState(null);

    const reportError = useCallback((message, details = null) => {
        setError({ message, details, timestamp: new Date().toISOString() });
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return (
        <GlobalErrorContext.Provider value={{ error, reportError, clearError }}>
            {children}
            {error && <ErrorDialog error={error} onClose={clearError} />}
        </GlobalErrorContext.Provider>
    );
};

import api from '../api/axios';

const ErrorDialog = ({ error, onClose }) => {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleReportBug = async () => {
        try {
            setSubmitting(true);
            await api.post('/feedback', {
                type: 'BUG',
                subject: `Auto-Reported System Error: ${error.message.substring(0, 50)}`,
                description: `URL: ${window.location.href}\nUser Agent: ${navigator.userAgent}\nError: ${error.message}\nDetails: ${JSON.stringify(error.details)}`,
                priority: 'HIGH'
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Failed to report bug:', err);
            alert('Failed to send bug report. Please contact IT directly.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                width: '100%',
                maxWidth: '500px',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                textAlign: 'center',
                position: 'relative',
                border: '1px solid #fee2e2'
            }}>
                <div style={{
                    width: '72px',
                    height: '72px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: '#dc2626',
                    transform: 'rotate(-5deg)'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
                
                <h3 style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: '12px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    letterSpacing: '-0.02em'
                }}>
                    System Error Encountered
                </h3>
                
                <p style={{
                    color: '#4b5563',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    marginBottom: '28px',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                    The application encountered a critical issue. Your session data is safe, but we couldn't complete the last action.
                </p>

                <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'left',
                    marginBottom: '28px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '150px',
                    overflowY: 'auto'
                }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Technical Snapshot</div>
                    <div style={{ fontSize: '12px', color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.5' }}>
                        <strong>Message:</strong> {error.message}
                        {error.details && (
                            <div style={{ marginTop: '8px', color: '#6b7280' }}>
                                <strong>Details:</strong> {JSON.stringify(error.details)}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {!submitted ? (
                        <button 
                            onClick={handleReportBug}
                            disabled={submitting}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                backgroundColor: '#4f46e5',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '14px',
                                fontWeight: '700',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseOver={(e) => !submitting && (e.target.style.backgroundColor = '#4338ca')}
                            onMouseOut={(e) => !submitting && (e.target.style.backgroundColor = '#4f46e5')}
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Reporting...
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
                                    </svg>
                                    Report Bug to IT Team
                                </>
                            )}
                        </button>
                    ) : (
                        <div style={{
                            padding: '14px',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            borderRadius: '14px',
                            fontSize: '14px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            border: '1px solid #a7f3d0'
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Report Sent Successfully
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                flex: 1,
                                padding: '14px 20px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        >
                            Reload App
                        </button>
                        <button 
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '14px 20px',
                                backgroundColor: '#ffffff',
                                color: '#6b7280',
                                border: '1px solid #e5e7eb',
                                borderRadius: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#f9fafb';
                                e.target.style.color = '#111827';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = '#ffffff';
                                e.target.style.color = '#6b7280';
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

