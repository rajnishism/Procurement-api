import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Eye, EyeOff, ArrowRight, KeyRound, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm font-medium placeholder-white/20 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, setLoginTransition } = useAuth();
    const navigate = useNavigate();

    // 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-success'
    const [view, setView] = useState('login');

    // Forgot password state
    const [fpEmail, setFpEmail] = useState('');
    const [fpOtp, setFpOtp] = useState('');
    const [fpNewPassword, setFpNewPassword] = useState('');
    const [fpShowPassword, setFpShowPassword] = useState(false);
    const [fpInfo, setFpInfo] = useState('');

    // Local UI phase for login
    const [uiPhase, setUiPhase] = useState('idle');

    // Pre-generated particles
    const [particles] = useState(() =>
        Array.from({ length: 25 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            delay: Math.random() * 3,
            duration: Math.random() * 4 + 3,
        }))
    );

    // ── Login ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setLoading(true);
        setUiPhase('authenticating');

        try {
            const userData = await login(email, password);
            setLoginTransition({ phase: 'success', userName: userData?.name || 'User' });
            setUiPhase('transitioning');
            setTimeout(() => navigate('/', { replace: true }), 200);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
            setUiPhase('idle');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 1: Request OTP ────────────────────────────────────────────────────
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!fpEmail) { setError('Please enter your email address.'); return; }
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: fpEmail });
            setFpInfo('An OTP has been sent to your email if it exists in our system.');
            setView('forgot-otp');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP & Reset Password ────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (!fpOtp || !fpNewPassword) { setError('Please fill in all fields.'); return; }
        if (fpNewPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email: fpEmail,
                otp: fpOtp,
                newPassword: fpNewPassword,
            });
            setView('forgot-success');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    const resetForgotFlow = () => {
        setView('login');
        setFpEmail(''); setFpOtp(''); setFpNewPassword('');
        setFpInfo(''); setError('');
    };

    // ── Render helpers ─────────────────────────────────────────────────────────
    const renderLogin = () => (
        <>
            <h2 className="text-xl font-black text-white mb-6">Sign In</h2>

            {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm font-medium login-shake">
                    <AlertCircle size={16} />{error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-black text-blue-300/60 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="email" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputCls}
                            placeholder="admin@procurement.com"
                            autoComplete="email"
                            disabled={uiPhase !== 'idle'}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-blue-300/60 uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputCls} pr-12`}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={uiPhase !== 'idle'}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                    <button type="button" onClick={() => { setError(''); setView('forgot-email'); }}
                        className="text-xs text-blue-400/70 hover:text-blue-300 transition-colors font-medium">
                        Forgot password?
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={loading || uiPhase !== 'idle'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    {uiPhase === 'authenticating' ? (
                        <span className="flex items-center justify-center gap-2 relative z-10">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Verifying...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2 relative z-10">
                            Sign In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    )}
                </button>
            </form>
        </>
    );

    const renderForgotEmail = () => (
        <>
            <div className="flex items-center gap-3 mb-6">
                <button type="button" onClick={resetForgotFlow}
                    className="text-white/40 hover:text-white/70 transition-colors text-xs font-bold">
                    ← Back
                </button>
                <h2 className="text-xl font-black text-white">Reset Password</h2>
            </div>
            <p className="text-white/40 text-sm mb-6">Enter your account email and we'll send you a 6-digit OTP.</p>

            {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                    <AlertCircle size={16} />{error}
                </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-black text-blue-300/60 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)}
                            className={inputCls} placeholder="your@email.com" autoComplete="email" />
                    </div>
                </div>
                <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP...</>
                    ) : (
                        <><RefreshCw size={15} /> Send OTP</>
                    )}
                </button>
            </form>
        </>
    );

    const renderForgotOtp = () => (
        <>
            <div className="flex items-center gap-3 mb-4">
                <button type="button" onClick={() => { setError(''); setView('forgot-email'); }}
                    className="text-white/40 hover:text-white/70 transition-colors text-xs font-bold">
                    ← Back
                </button>
                <h2 className="text-xl font-black text-white">Enter OTP</h2>
            </div>

            {fpInfo && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-4 py-3 rounded-xl mb-5 text-xs font-medium">
                    <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" />{fpInfo}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm font-medium">
                    <AlertCircle size={16} />{error}
                </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
                {/* OTP Input */}
                <div>
                    <label className="block text-[10px] font-black text-blue-300/60 uppercase tracking-widest mb-2">6-Digit OTP</label>
                    <div className="relative">
                        <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={fpOtp}
                            onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))}
                            className={`${inputCls} tracking-[0.5em] text-center font-mono text-lg`}
                            placeholder="000000"
                        />
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label className="block text-[10px] font-black text-blue-300/60 uppercase tracking-widest mb-2">New Password</label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type={fpShowPassword ? 'text' : 'password'}
                            value={fpNewPassword}
                            onChange={(e) => setFpNewPassword(e.target.value)}
                            className={`${inputCls} pr-12`}
                            placeholder="Min. 8 characters"
                        />
                        <button type="button" onClick={() => setFpShowPassword(!fpShowPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            {fpShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {/* Password strength indicator */}
                    {fpNewPassword && (
                        <div className="flex gap-1 mt-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                    fpNewPassword.length >= (i + 1) * 2
                                        ? i < 1 ? 'bg-red-500' : i < 2 ? 'bg-yellow-500' : i < 3 ? 'bg-blue-500' : 'bg-emerald-500'
                                        : 'bg-white/10'
                                }`} />
                            ))}
                        </div>
                    )}
                </div>

                <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting...</>
                    ) : (
                        <><ShieldCheck size={15} /> Reset Password</>
                    )}
                </button>

                <button type="button" onClick={handleRequestOtp} disabled={loading}
                    className="w-full text-xs text-white/30 hover:text-white/50 transition-colors py-1">
                    Didn't receive the code? Resend OTP
                </button>
            </form>
        </>
    );

    const renderForgotSuccess = () => (
        <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Password Reset!</h2>
            <p className="text-white/40 text-sm mb-8">Your password has been updated. You can now sign in with your new credentials.</p>
            <button onClick={resetForgotFlow}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2">
                <ArrowRight size={15} /> Back to Sign In
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center px-4 relative overflow-hidden">

            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyNTYzZWIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTMwVjBoLTJ2NEgxMFYwSDh2NGgtNHYyaDR2NGgyVjZoMjRWNGg0VjJoLTRWMGgtMnY0SDM2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map(p => (
                    <div key={p.id} className="login-particle"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
                    />
                ))}
            </div>

            {/* Ambient glow */}
            <div className={`absolute w-[600px] h-[600px] rounded-full transition-all duration-1000 pointer-events-none ${
                uiPhase === 'authenticating' ? 'bg-blue-500/12 scale-125 blur-[120px]' : 'bg-blue-500/8 scale-100 blur-[100px]'
            }`} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

            <div className={`relative w-full max-w-md transition-all duration-700 ease-out ${
                uiPhase === 'transitioning' ? 'opacity-0 scale-90 translate-y-8' : 'opacity-100 scale-100 translate-y-0'
            }`}>
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 transition-all duration-500 ${
                        uiPhase === 'authenticating' ? 'bg-blue-500 shadow-blue-500/40 login-icon-pulse' : 'bg-blue-600 shadow-blue-600/30'
                    }`}>
                        <Lock className="text-white" size={28} />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Procurement OS</h1>
                    <p className="text-blue-300/60 text-sm font-medium mt-1">Enterprise Procurement System</p>
                </div>

                {/* Card */}
                <div className={`bg-white/5 backdrop-blur-xl border rounded-3xl p-8 shadow-2xl transition-all duration-500 ${
                    uiPhase === 'authenticating' ? 'border-blue-500/30 shadow-blue-500/10' : 'border-white/10'
                }`}>
                    {view === 'login' && renderLogin()}
                    {view === 'forgot-email' && renderForgotEmail()}
                    {view === 'forgot-otp' && renderForgotOtp()}
                    {view === 'forgot-success' && renderForgotSuccess()}
                </div>

                <p className="text-center text-white/20 text-xs mt-6 font-medium">
                    Secured by JWT • Role-Based Access Control
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
