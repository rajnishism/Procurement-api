import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const DataMigration = () => {
    const [file, setFile] = useState(null);
    const [uploadType, setUploadType] = useState('budget'); // 'budget', 'expense', or 'pr'
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    const handleFileChange = (e, type) => {
        setFile(e.target.files[0]);
        setUploadType(type);
        setLogs([]);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', uploadType);

        try {
            const response = await api.post('/migration/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setLogs(response.data.log);
            setFile(null); // Clear file after success
        } catch (err) {
            setError(err.response?.data?.details || 'Failed to upload');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center italic">Data Migration Hub</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Budget Upload Card */}
                <div className={`p-6 rounded-2xl border-2 transition-all ${uploadType === 'budget' && file ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white shadow-sm'}`}>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600 mr-4">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">1. Budget</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Planned Targets</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-6 h-10 overflow-hidden">
                        Bulk import monthly budget targets for departments and WBS.
                    </p>

                    <label className="block w-full text-center p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-all mb-4">
                        <span className="text-xs text-gray-500 font-medium">Select Excel</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'budget')} />
                    </label>

                    {uploadType === 'budget' && file && (
                        <div className="text-[10px] font-mono text-blue-600 truncate mb-4 bg-blue-50 p-2 rounded border border-blue-100">
                            {file.name}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || uploadType !== 'budget'}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
                    >
                        {loading && uploadType === 'budget' ? '...' : 'Upload Budget'}
                    </button>
                </div>

                {/* Expense Upload Card */}
                <div className={`p-6 rounded-2xl border-2 transition-all ${uploadType === 'expense' && file ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 bg-white shadow-sm'}`}>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 mr-4">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">2. Expense</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Actual Spent</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-6 h-10 overflow-hidden">
                        Import actual monthly expenses linked to WBS codes.
                    </p>

                    <label className="block w-full text-center p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition-all mb-4">
                        <span className="text-xs text-gray-500 font-medium">Select Excel</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'expense')} />
                    </label>

                    {uploadType === 'expense' && file && (
                        <div className="text-[10px] font-mono text-indigo-600 truncate mb-4 bg-indigo-50 p-2 rounded border border-indigo-100">
                            {file.name}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || uploadType !== 'expense'}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
                    >
                        {loading && uploadType === 'expense' ? '...' : 'Upload Expenses'}
                    </button>
                </div>

                {/* PR Upload Card */}
                <div className={`p-6 rounded-2xl border-2 transition-all ${uploadType === 'pr' && file ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 bg-white shadow-sm'}`}>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600 mr-4">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">3. PR Details</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Historical PRs</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 mb-6 h-10 overflow-hidden">
                        Sync existing Purchase Requests with descriptions and values.
                    </p>

                    <label className="block w-full text-center p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-gray-50 transition-all mb-4">
                        <span className="text-xs text-gray-500 font-medium">Select Excel</span>
                        <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'pr')} />
                    </label>

                    {uploadType === 'pr' && file && (
                        <div className="text-[10px] font-mono text-emerald-600 truncate mb-4 bg-emerald-50 p-2 rounded border border-emerald-100">
                            {file.name}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={loading || !file || uploadType !== 'pr'}
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md"
                    >
                        {loading && uploadType === 'pr' ? '...' : 'Upload PRs'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center mb-8 border border-red-100">
                    <AlertCircle size={20} className="mr-2" />
                    {error}
                </div>
            )}

            {logs.length > 0 && (
                <div className="bg-gray-900 text-gray-200 p-6 rounded-2xl font-mono text-sm shadow-2xl overflow-hidden mt-8">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                        <h4 className="font-bold text-white flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 animate-pulse ${uploadType === 'pr' ? 'bg-emerald-400' : uploadType === 'expense' ? 'bg-indigo-400' : 'bg-blue-400'}`}></div>
                            Import Results: {uploadType.toUpperCase()}
                        </h4>
                        <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white transition-colors">Clear Console</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
                        {logs.map((log, i) => (
                            <div key={i} className="flex border-l-2 border-gray-800 pl-3 py-0.5 hover:bg-gray-800/50 transition-colors">
                                <span className="opacity-20 mr-3 w-6 inline-block text-right">{i + 1}</span>
                                <span>{log}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataMigration;
