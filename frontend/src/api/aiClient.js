import axios from './axios';

/**
 * Sends a file to the backend for AI extraction.
 * @param {File} file - The document to analyze.
 * @param {Object} metadata - Optional metadata (Indent No, Department, etc.)
 */
export const extractQuotationDetails = async (file, metadata = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await axios.post('/documents/extractions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('AI Client Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.details || error.response?.data?.error || "AI processing failed.");
  }
};

/**
 * Downloads the PR data as an Excel file using the corporate template.
 * @param {Object} prData - The full PR data (Items + Metadata).
 * @param {string} indentNo - The indent number for the filename.
 */
export const exportPRExcel = async (prData, indentNo) => {
    try {
        const response = await axios.post('/documents/exports', prData, {
            responseType: 'blob', // Important for handling binary file downloads
        });

        // Create a dedicated download link for the blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `PR-${indentNo || 'Export'}.xlsx`);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export Client Error:', error.response?.data || error.message);
        throw new Error("Failed to generate Excel file.");
    }
};

/**
 * Saves the AI-extracted PR to the persistent tracking list.
 * @param {Object} prData - The full PR data (Items + Metadata).
 */
export const saveAiPr = async (prData, file = null, additionalFiles = []) => {
    try {
        let payload = prData;
        let headers = {};
        
        if (file || additionalFiles.length > 0) {
            payload = new FormData();
            payload.append('data', JSON.stringify(prData));
            if (file) payload.append('file', file);
            additionalFiles.forEach(f => payload.append('additionalFiles', f));
            headers = { 'Content-Type': 'multipart/form-data' };
        }

        const response = await axios.post('/prs', payload, { headers });
        return response.data;
    } catch (error) {
        console.error('Save AI PR Client Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Failed to save PR to tracking list.");
    }
};
