import React from 'react';
import { Construction } from 'lucide-react';

const ComingSoon = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-6 bg-amber-50 rounded-full text-amber-600 animate-pulse">
            <Construction size={48} />
        </div>
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">{title} Module</h2>
        <p className="text-gray-500 max-w-md font-medium">
            This module is currently under construction as part of the Phase 2 'Note for Approval' (NFA) workflow integration. 
            Stay tuned!
        </p>
        <button 
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
        >
            Go Back
        </button>
    </div>
);

export default ComingSoon;
