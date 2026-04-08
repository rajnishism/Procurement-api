import React, { useState } from 'react';
import { X, Send, MessageSquare, AlertCircle, CheckCircle, Bug } from 'lucide-react';
import api from '../api/axios';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [type, setType] = useState('FEEDBACK');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('NORMAL');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/feedback', { type, subject, description, priority });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setSubject('');
                setDescription('');
                setType('FEEDBACK');
                onClose();
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Submitting failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex justify-between items-center relative">
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            {type === 'BUG' ? <AlertCircle className="text-red-400" /> : <MessageSquare className="text-emerald-400" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">System Support</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{type === 'BUG' ? 'Report an Issue' : 'Submit Feedback'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors relative z-10 text-slate-300 hover:text-white">
                        <X size={20} />
                    </button>
                    {/* Decorative pattern */}
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                        <svg width="200" height="100" viewBox="0 0 200 100" fill="none"><circle cx="150" cy="-20" r="80" stroke="white" strokeWidth="20"/><circle cx="150" cy="-20" r="40" fill="white"/></svg>
                    </div>
                </div>

                {success ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-2 animate-bounce">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">Received!</h3>
                        <p className="text-slate-500 text-sm max-w-xs">An email confirmation has been sent to your inbox. Our engineering team will review it immediately.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <button type="button" onClick={() => setType('FEEDBACK')} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${type === 'FEEDBACK' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                                <MessageSquare size={20} className={type === 'FEEDBACK' ? 'text-emerald-500' : ''} />
                                <span className="text-xs font-black uppercase tracking-widest">Feedback</span>
                            </button>
                            <button type="button" onClick={() => setType('BUG')} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${type === 'BUG' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                                <Bug size={20} className={type === 'BUG' ? 'text-red-500' : ''} />
                                <span className="text-xs font-black uppercase tracking-widest">Bug Report</span>
                            </button>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Subject Line</label>
                            <input 
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="I noticed an issue with..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors font-medium text-slate-700"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex justify-between">
                                Complete Description
                                {type === 'BUG' && <span className="text-red-400">Include steps to reproduce</span>}
                            </label>
                            <textarea 
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                placeholder="Please be as detailed as possible..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors font-medium text-slate-700 custom-scrollbar resize-none"
                            />
                        </div>

                        {type === 'BUG' && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Priority Impact</label>
                                <select 
                                    value={priority} 
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-bold"
                                >
                                    <option value="LOW">Low (Minor annoyance)</option>
                                    <option value="NORMAL">Normal (Needs fixing soon)</option>
                                    <option value="CRITICAL">Critical (Blocks workflow entirely)</option>
                                </select>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                disabled={loading || !subject || !description}
                                type="submit"
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="animate-pulse">Transmitting...</span>
                                ) : (
                                    <>Transmit Report <Send size={16} /></>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
