import { importDataFromExcel } from '../services/migrationService.js';
import { generateFullDatabaseExport } from '../services/backupService.js';

export const importData = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { type } = req.body;
        const log = await importDataFromExcel(req.file.buffer, type);

        res.status(200).json({
            message: 'Import processed',
            log: log
        });

    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Failed to process import', details: error.message });
    }
};

export const exportFullDatabaseExcel = async (req, res) => {
    try {
        console.log("--- GENERATING FULL DATABASE COMPREHENSIVE EXCEL EXPORT ---");
        const buffer = await generateFullDatabaseExport();

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=ProcurementSystem_Backup_${new Date().toISOString().split('T')[0]}.xlsx`
        });

        res.send(buffer);
    } catch (error) {
        console.error('Database Export Trace:', error);
        res.status(500).json({ error: 'Failed to generate database export', details: error.message });
    }
};
