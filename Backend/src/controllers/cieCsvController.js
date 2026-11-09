const cieCsvService = require('../services/cieCsvService');

const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const result = await cieCsvService.processUpload(
            req.file.buffer,
            req.file.originalname,
            req.user.id
        );
        res.status(200).json({ message: 'File parsed successfully', ...result });
    } catch (error) {
        console.error('CIE CSV upload error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

const confirmImport = async (req, res) => {
    try {
        const { batchId } = req.body;
        if (!batchId) return res.status(400).json({ error: 'batchId is required' });
        const result = await cieCsvService.commitImport(batchId);
        res.status(200).json({ message: 'Import completed', ...result });
    } catch (error) {
        console.error('CIE CSV confirm error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

const getImportHistory = async (req, res) => {
    try {
        const history = await cieCsvService.getHistory();
        res.status(200).json(history);
    } catch (error) {
        console.error('CIE history error:', error);
        res.status(500).json({ error: 'Failed to fetch import history' });
    }
};

module.exports = { uploadFile, confirmImport, getImportHistory };
