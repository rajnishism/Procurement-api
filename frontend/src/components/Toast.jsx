import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// SINGLE TOAST ITEM
// ──────────────────────────────────────────────────────────────────────────────
const TOAST_STYLES = {
    success: {
        bar: 'bg-emerald-500',
        icon: <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />,
        title: 'text-emerald-800',
        bg: 'bg-white border-emerald-100',
    },
    error: {
        bar: 'bg-red-500',
        icon: <XCircle size={20} className="text-red-500 flex-shrink-0" />,
        title: 'text-red-800',
        bg: 'bg-white border-red-100',
    },
    warning: {
        bar: 'bg-amber-400',
        icon: <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />,
        title: 'text-amber-800',
        bg: 'bg-white border-amber-100',
    },
    info: {
        bar: 'bg-blue-500',
        icon: <Info size={20} className="text-blue-500 flex-shrink-0" />,
        title: 'text-blue-800',
        bg: 'bg-white border-blue-100',
    },
};

const ToastItem = ({ toast, onRemove }) => {
    const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), toast.duration || 5000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className="flex items-start gap-3 w-[380px] rounded-2xl border shadow-xl overflow-hidden animate-slide-in"
            style={{ backgroundColor: 'white' }}
        >
            {/* Left color bar */}
            <div className={`w-1 self-stretch flex-shrink-0 rounded-l-2xl ${style.bar}`} />

            <div className="flex items-start gap-3 py-4 pr-4 flex-1">
                {style.icon}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black ${style.title}`}>{toast.title}</p>
                    {toast.message && (
                        <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">{toast.message}</p>
                    )}
                </div>
                <button
                    onClick={() => onRemove(toast.id)}
                    className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// TOAST CONTAINER  — place once near the root of a page
// ──────────────────────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <ToastItem toast={t} onRemove={onRemove} />
                </div>
            ))}
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// HOOK  — useToast()
// Returns { toasts, toast } where toast.success/error/warning/info(title, msg) shows a notification
// ──────────────────────────────────────────────────────────────────────────────
export const useToast = () => {
    const [toasts, setToasts] = React.useState([]);

    const removeToast = React.useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = React.useCallback((type, title, message, duration = 5000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, type, title, message, duration }]);
    }, []);

    const toast = React.useMemo(() => ({
        success: (title, message, duration) => addToast('success', title, message, duration),
        error: (title, message, duration) => addToast('error', title, message, duration),
        warning: (title, message, duration) => addToast('warning', title, message, duration),
        info: (title, message, duration) => addToast('info', title, message, duration),
    }), [addToast]);

    return { toasts, toast, removeToast };
};

export default ToastContainer;
