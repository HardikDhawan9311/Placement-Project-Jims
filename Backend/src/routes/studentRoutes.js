const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken } = require('../middleware/authMiddleware');

// All student routes require authentication
router.use(verifyToken);

// Get all students (with optional filters)
router.get('/', studentController.getAllStudents);

// Get a single student profile with full academic history
router.get('/:id/academic-history', studentController.getStudentAcademicHistory);

// Bulk upload students
router.post('/bulk', studentController.bulkUploadStudents);

router.post('/send-to-company', studentController.sendStudentsToCompany);
router.post('/notify-students', studentController.notifyStudents);

module.exports = router;
