const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// All admin routes require authentication + admin authorization
router.use(verifyToken);
router.use(isAdmin);

router.get('/pending-users', adminController.getPendingUsers);
router.post('/approve-user/:id', adminController.approveUser);
router.delete('/reject-user/:id', adminController.rejectUser);

module.exports = router;
