const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { 
    getCompanies, 
    getTrackingData, 
    getNonApplicants, 
    sendMassMail,
    createCompany
} = require('../controllers/companyController');

// All company routes require authentication
router.use(verifyToken);

// Define routes
router.get('/', getCompanies);
router.post('/', createCompany);
router.get('/tracking', getTrackingData);
router.get('/non-applicants', getNonApplicants);
router.post('/send-mail', sendMassMail);

module.exports = router;
