import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Hash, DollarSign, Plus, Trash2,
  CheckCircle2, Loader2, ClipboardList,
  UploadCloud, X, Paperclip, Sparkles, Building, MapPin, Truck, AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import { extractQuotationDetails, exportPRExcel, saveAiPr } from '../api/aiClient';
import { validateFile } from '../utils/fileValidation';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  indentNo: '',
  department: 'Mining',
  area: '',
  ros: 'Normal',
  date: new Date().toISOString().split('T')[0],
  wbs: '',
  indentorEmail: null,
  approverS1: null,
  verifierS2: null,
  finalApproverS3: null,
  main_item: {
    description: '',
    specification: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    reason: '',
    unit: 'SET'
  },
  items: [],
  grand_total: 0,
  pdfPath: ''
};

const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all';

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm  transition-all hover:shadow-md hover:border-gray-200">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
      <span className="text-gray-400">{icon}</span>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h3>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Field = ({ label, required, children }) => (
  <div className="space-y-1.5 flex-1 w-full">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const ApproverField = ({ label, value, onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (!val.trim()) { setResults([]); return; }
    try {
      const res = await api.get(`/auth/search-users?q=${val}`);
      setResults(res.data);
      setShow(true);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-1.5 relative w-full" ref={dropdownRef}>
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</label>
      {value ? (
        <div className="flex items-center justify-between bg-white border border-emerald-100 rounded-xl px-3 py-2.5 shadow-sm shadow-emerald-50 ">
          <div className="min-w-0 overflow-y-auto">
            <p className="text-xs font-black text-gray-900 truncate">{value.name}</p>
            <p className="text-[10px] font-medium text-emerald-600 truncate">{value.email}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-gray-300 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => query.trim() && setShow(true)}
            className={`${inputCls} !text-xs !bg-gray-50/50`}
          />
          {show && results.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-z bg-white border border-gray-100 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
              {results.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => { onChange(user); setShow(false); setQuery(''); }}
                  className=" w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <p className="text-xs font-black text-gray-900">{user.name}</p>
                  <p className="text-[10px] text-gray-400">{user.email} • {user.designation || 'Staff'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AiQuotationParser = () => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachment, setAttachment] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const extraFileInputRef = useRef(null);

  // Master Data
  const [departments, setDepartments] = useState([]);
  const [wbsCodes, setWbsCodes] = useState([]);
  const [approvers, setApprovers] = useState([]);

  // Auth Context
  const { user } = useAuth();

  // Auto-fill Indentor with Logged In User
  useEffect(() => {
    if (user && !form.indentorEmail) {
      setForm(prev => ({
        ...prev,
        indentorEmail: { name: user.name, email: user.email, id: user.id }
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [deptsRes, wbsRes, approversRes] = await Promise.all([
          api.get('/master-data/departments'),
          api.get('/master-data/wbs-codes'),
          api.get('/master-data/approvers'),
        ]);
        setDepartments(deptsRes.data);
        setWbsCodes(wbsRes.data);
        setApprovers(approversRes.data);
      } catch (err) {
        console.error('Failed to fetch master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  const handleAttachment = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png']
      });

      if (validationError) {
        setError(validationError);
        e.target.value = '';
        return;
      }

      setAttachment(file);
      setForm(prev => ({ ...prev, pdfPath: '' }));
      setError(null);
    }
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachment(null);
    setForm(prev => ({ ...prev, pdfPath: '' }));
  };

  const handleExtraAttachments = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      setAdditionalFiles(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const removeExtraAttachment = (idx) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleParse = async () => {
    if (!attachment) return;
    setParsing(true);
    setError(null);
    try {
      // Only send current form metadata that helps with analysis
      const metadata = {
        department: form.department,
        wbs: form.wbs,
        area: form.area,
        date: form.date
      };

      const result = await extractQuotationDetails(attachment, metadata);

      setForm(prev => ({
        ...prev,
        indentNo: result.indentNo || prev.indentNo,
        department: result.department || prev.department,
        area: result.area || prev.area,
        wbs: result.wbs || prev.wbs,
        date: result.date || prev.date,
        main_item: result.main_item || prev.main_item,
        items: result.items || prev.items,
        grand_total: result.grand_total || prev.grand_total,
        pdfPath: result.pdfPath || prev.pdfPath
      }));
    } catch (err) {
      setError(err.message || 'AI parsing failed. Please fill the form manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleMainItemUpdate = (field, value) => {
    setForm(prev => {
      const updated = { ...prev.main_item, [field]: value };
      // if we are updating unit_price or quantity, let's update total_price optionally, 
      // but the grand_total is typically calculated from items.
      return { ...prev, main_item: updated };
    });
  };

  const handleItemUpdate = (index, field, value) => {
    const newItems = [...form.items];
    const updated = { ...newItems[index], [field]: value };
    // Auto-calculate total value from unit_price × quantity
    if (field === 'unit_price' || field === 'requirement') {
      updated.value = Number(updated.unit_price || 0) * Number(updated.requirement || 0);
    }
    newItems[index] = updated;
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
    setForm(prev => ({ ...prev, items: newItems, grand_total: newTotal }));
  };

  const handleAddLineItem = () => {
    const newItems = [...form.items, {
      description: '',
      size: '',
      specification: '',
      uom: 'NOS',
      requirement: 1,
      unit_price: 0,
      area: form.area || '',
      ros: form.ros || 'Normal',
      value: 0,
      wbs: form.wbs || ''
    }];
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveLineItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
    setForm(prev => ({ ...prev, items: newItems, grand_total: newTotal }));
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await exportPRExcel(form, form.indentNo);
    } catch (err) {
      setError("Failed to export Excel file.");
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Required Validations before submission
    if (!form.department) return setError('Department is required.');
    if (!form.date) return setError('Date is required.');
    if (!form.main_item.description.trim()) return setError('Main Item Description is required.');

    setSubmitting(true);
    try {
      // Re-calculate total from items before save to be safe
      const total = form.items.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
      const finalData = {
        ...form,
        indentorEmail: form.indentorEmail?.email || '',
        indentor: form.indentorEmail?.name || '',
        approverS1: form.approverS1?.email || '',
        verifierS2: form.verifierS2?.email || '',
        finalApproverS3: form.finalApproverS3?.email || '',
        grand_total: total
      };

      const fileToUpload = form.pdfPath ? null : attachment;
      await saveAiPr(finalData, fileToUpload, additionalFiles);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to save PR. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">PR Draft Saved</h2>
          <p className="text-sm text-gray-500 mb-8">Purchase Requisition has been constructed successfully.</p>
          <button
            onClick={() => { setSuccess(false); setForm(EMPTY_FORM); setAttachment(null); }}
            className="bg-gray-900 text-white text-sm font-black px-8 py-3 rounded-2xl hover:bg-gray-800 transition-colors"
          >
            Create Another PR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center">
              <ClipboardList size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">PR Generator</h1>
              <p className="text-xs text-gray-400 font-medium">Create Purchase Requisitions — Manual or AI assisted</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="bg-white border border-gray-200 text-gray-700 text-sm font-black px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            <Section title="General Information" icon={<FileText size={15} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Indent No (Optional)">
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={form.indentNo}
                    onChange={e => handleChange('indentNo', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Date" required>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => handleChange('date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Department" required>
                  <select
                    value={form.department}
                    onChange={e => handleChange('department', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select Department</option>
                    <option value="Mining">Mining</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Piping">Piping</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="General">General</option>
                  </select>
                </Field>


                <Field label="WBS Code">
                  <input
                    list="wbs-list"
                    value={form.wbs}
                    onChange={e => handleChange('wbs', e.target.value)}
                    placeholder="Search WBS..."
                    className={inputCls}
                  />
                  <datalist id="wbs-list">
                    {wbsCodes.map(w => (
                      <option key={w.id} value={w.code}>{w.description}</option>
                    ))}
                  </datalist>
                </Field>
              </div>
            </Section>

            <Section title="Asset / Service - Summary" icon={<DollarSign size={15} />}>
              <Field label="Description" required>
                <input
                  type="text"
                  placeholder="Brief title of asset/service"
                  value={form.main_item.description}
                  onChange={e => handleMainItemUpdate('description', e.target.value)}
                  className={inputCls}
                />
              </Field>


            </Section>

            <Section title="Line Items Cost Breakdown" icon={<ClipboardList size={15} />}>
              <div className="space-y-5">
                {form.items.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">No line items yet. Click "Add Line Item" to begin.</p>
                )}
                {form.items.map((item, index) => (
                  <div key={index} className="border border-gray-100 rounded-2xl p-4 space-y-3 hover:border-gray-200 transition-all bg-gray-50/30">
                    {/* Row header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                        S.No {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        className="text-gray-300 hover:text-red-500 bg-white p-1.5 rounded-lg border border-gray-200 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Row 1: Description + Size */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Item Description</label>
                        <input
                          placeholder="e.g. Centrifugal Pump"
                          value={item.description}
                          onChange={(e) => handleItemUpdate(index, 'description', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Size</label>
                        <input
                          placeholder="e.g. 6 inch, DN150"
                          value={item.size || ''}
                          onChange={(e) => handleItemUpdate(index, 'size', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Row 2: Specification */}
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">
                        Specification <span className="normal-case tracking-normal text-gray-300 font-medium">(Material type, Dimension, ASC-Code, Part No, etc.)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. SS316, ASTM A182, Part No. XYZ-123"
                        value={item.specification || ''}
                        onChange={(e) => handleItemUpdate(index, 'specification', e.target.value)}
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    {/* Row 3: UOM + Qty + Unit Price + Total Value */}
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">UOM</label>
                        <input
                          placeholder="NOS, KG, MTR"
                          value={item.uom || ''}
                          onChange={(e) => handleItemUpdate(index, 'uom', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Quantity</label>
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={item.requirement}
                          onChange={(e) => handleItemUpdate(index, 'requirement', Number(e.target.value))}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Unit Price (USD)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.unit_price || ''}
                          onChange={(e) => handleItemUpdate(index, 'unit_price', Number(e.target.value))}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Total Value (USD)</label>
                        <div className={`${inputCls} bg-gray-50 text-gray-700 font-black cursor-default select-none`}>
                          {(Number(item.unit_price || 0) * Number(item.requirement || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Area + ROS + WBS */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Area of Utilization</label>
                        <input
                          placeholder="e.g. Block A, Mine 3"
                          value={item.area || ''}
                          onChange={(e) => handleItemUpdate(index, 'area', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">R.O.S (Urgency)</label>
                        <select
                          value={item.ros || 'Normal'}
                          onChange={(e) => handleItemUpdate(index, 'ros', e.target.value)}
                          className={inputCls}
                        >
                          <option value="Immediate">Immediate</option>
                          <option value="Normal">Normal</option>
                          <option value="Deferred">Deferred</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">WBS Code</label>
                        <input
                          list={`wbs-item-${index}`}
                          placeholder="Search WBS..."
                          value={item.wbs || ''}
                          onChange={(e) => handleItemUpdate(index, 'wbs', e.target.value)}
                          className={inputCls}
                        />
                        <datalist id={`wbs-item-${index}`}>
                          {wbsCodes.map(w => (
                            <option key={w.id} value={w.code}>{w.description}</option>
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-[11px] font-black uppercase text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Calculated Total</span>
                    <span className="text-lg font-black text-gray-900">
                      ${form.items.reduce((acc, item) => acc + (Number(item.value) || 0), 0)?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Document Upload & AI" icon={<UploadCloud size={15} />}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={handleAttachment}
                className="hidden"
              />
              {!attachment ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-gray-900 bg-gray-50 rounded-xl py-8 transition-colors group"
                >
                  <UploadCloud size={24} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  <div className="text-center">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-tighter group-hover:text-gray-900 transition-colors">Attach Quotation</p>
                    <p className="text-[10px] text-gray-400 mt-1 lowercase">pdf, jpg, png</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-black text-white rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="opacity-50 flex-shrink-0" />
                      <p className="text-[11px] font-bold truncate">{attachment.name}</p>
                    </div>
                    <button type="button" onClick={removeAttachment} className="hover:text-red-400 flex-shrink-0 ml-2">
                      <X size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={parsing}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-indigo-100 hover:border-indigo-200 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {parsing ? 'Processing AI...' : 'AI Auto-fill Form'}
                  </button>
                </div>
              )}
            </Section>

            <Section title="Supporting Attachments" icon={<Paperclip size={15} />}>
              <input
                ref={extraFileInputRef}
                type="file"
                multiple
                onChange={handleExtraAttachments}
                className="hidden"
              />
              {additionalFiles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => extraFileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-gray-900 bg-gray-50 rounded-xl py-6 transition-colors group"
                >
                  <Paperclip size={20} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                  <p className="text-[10px] font-black text-gray-400 uppercase">Add Supporting Docs</p>
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => extraFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 text-[10px] font-black uppercase py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={14} /> Add More Files
                  </button>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {additionalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-2.5 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip size={12} className="text-gray-400 flex-shrink-0" />
                          <p className="text-[10px] font-bold text-gray-700 truncate">{file.name}</p>
                        </div>
                        <button type="button" onClick={() => removeExtraAttachment(idx)} className="hover:text-red-500 text-gray-300 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Approvers" icon={<Plus size={15} />}>
              <div className="space-y-4">
                <ApproverField
                  label="1. Indentor"
                  value={form.indentorEmail}
                  onChange={(v) => handleChange('indentorEmail', v)}
                  approvers={approvers}
                />
                <ApproverField
                  label="2. PR Approver (S1)"
                  value={form.approverS1}
                  onChange={(v) => handleChange('approverS1', v)}
                  approvers={approvers}
                />
                <ApproverField
                  label="3. Verifier (S2)"
                  value={form.verifierS2}
                  onChange={(v) => handleChange('verifierS2', v)}
                  approvers={approvers}
                />
                <ApproverField
                  label="4. Final Approver (S3)"
                  value={form.finalApproverS3}
                  onChange={(v) => handleChange('finalApproverS3', v)}
                  approvers={approvers}
                />
              </div>
            </Section>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2 text-xs border border-red-100 animate-in fade-in duration-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span className="font-semibold leading-snug">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:bg-gray-800 transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
              {submitting ? 'SAVING DRAFT...' : 'CREATE PR DRAFT'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AiQuotationParser;
