const db = require('../config/db');

// @desc Get all pending users
// @route GET /api/admin/pending-users
exports.getPendingUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE is_approved = 0');
        console.log(`📊 Database Check: Found ${rows.length} users with is_approved = 0`);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching pending users:', err);
        res.status(500).json({ error: 'Server error fetching pending users' });
    }
};

// @desc Approve a user registration
// @route POST /api/admin/approve-user/:id
exports.approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('UPDATE users SET is_approved = 1 WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User approved successfully' });
    } catch (err) {
        console.error('Error approving user:', err);
        res.status(500).json({ error: 'Server error during user approval' });
    }
};

// @desc Reject/Delete a user registration
// @route DELETE /api/admin/reject-user/:id
exports.rejectUser = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM users WHERE id = ? AND is_approved = 0', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pending user not found' });
        }
        
        res.json({ message: 'User registration rejected and deleted' });
    } catch (err) {
        console.error('Error rejecting user:', err);
        res.status(500).json({ error: 'Server error during user rejection' });
    }
};
