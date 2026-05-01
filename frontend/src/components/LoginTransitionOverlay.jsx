import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2 } from 'lucide-react';

/**
 * LoginTransitionOverlay
 * 
 * A global overlay that renders the post-login reveal animation.
 * It persists ABOVE the entire app (including route changes) and
 * manages its own lifecycle through AuthContext's loginTransition state.
 * 
 * Animation flow:
 *   1. LoginPage sets loginTransition = { phase: 'success', userName: '...' }
 *   2. This overlay appears full-screen with dark curtain panels
 *   3. Success checkmark + welcome message plays
 *   4. Curtains slide apart revealing the dashboard underneath
 *   5. Overlay fades out and unmounts
 */
const LoginTransitionOverlay = () => {
    const { loginTransition, setLoginTransition } = useAuth();
    const [phase, setPhase] = useState(null); // null | 'success' | 'reveal' | 'fading'
    const [userName, setUserName] = useState('');
    const timersRef = useRef([]);

    const clearTimers = () => {
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current = [];
    };

    const addTimer = (fn, ms) => {
        const id = setTimeout(fn, ms);
        timersRef.current.push(id);
        return id;
    };

    useEffect(() => {
        if (loginTransition?.phase === 'success' && phase === null) {
            // Kick off the animation sequence
            setUserName(loginTransition.userName || 'User');
            setPhase('success');

            // After 1.6s of success display, start the curtain reveal
            addTimer(() => setPhase('reveal'), 1600);

            // After curtains have slid open (1.6 + 1.0s), begin fade-out
            addTimer(() => setPhase('fading'), 2600);

            // After fade completes (1.6 + 1.0 + 0.5s), fully unmount
            addTimer(() => {
                setPhase(null);
                setLoginTransition(null);
            }, 3100);
        }

        return () => {};
    }, [loginTransition]);

    // Reset when transition clears
    useEffect(() => {
        if (!loginTransition && phase !== null) {
            clearTimers();
            setPhase(null);
        }
    }, [loginTransition]);

    // Cleanup on unmount
    useEffect(() => clearTimers, []);

    if (phase === null) return null;

    return (
        <div className={`login-transition-wrapper ${phase === 'fading' ? 'login-transition-wrapper--fading' : ''}`}>
            {/* Left curtain */}
            <div className={`login-curtain login-curtain--left ${
                phase === 'reveal' || phase === 'fading' ? 'login-curtain--open' : ''
            }`} />

            {/* Right curtain */}
            <div className={`login-curtain login-curtain--right ${
                phase === 'reveal' || phase === 'fading' ? 'login-curtain--open' : ''
            }`} />

            {/* Center content (success state) */}
            <div className={`login-overlay-center ${
                phase === 'reveal' || phase === 'fading' ? 'login-overlay-center--hidden' : ''
            }`}>
                {/* Success ring + check */}
                <div className="login-success-ring">
                    <div className="login-success-check">
                        <CheckCircle2 size={48} strokeWidth={2} />
                    </div>
                </div>

                {/* Welcome message */}
                <div className={`text-center mt-8 transition-all duration-500 delay-300 ${
                    phase === 'success' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}>
                    <p className="text-blue-300/60 text-xs font-black uppercase tracking-[0.3em] mb-2">
                        Access Granted
                    </p>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                        Welcome back
                    </h2>
                    <p className="text-lg text-blue-200/80 font-bold mt-1">
                        {userName}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mt-8 w-48">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="login-progress-bar h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full" />
                    </div>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-3 text-center">
                        Loading dashboard...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginTransitionOverlay;
