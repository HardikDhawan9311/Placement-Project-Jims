import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import axiosInstance from '../api/axiosInstance';

export function NotifyStudentsModal({ isOpen, onClose, selectedStudents = [] }) {
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });

  const selectedCount = selectedStudents.length;

  // Generate default message when modal opens
  useEffect(() => {
    if (isOpen && selectedStudents.length > 0) {
      setFormData({
        subject: 'Important Update from JIMS Placement Cell',
        message: `Dear [Student Name],\n\nWe are pleased to inform you about an exciting placement opportunity at JIMS.\n\nYour profile has been selected for consideration. Please ensure your resume and documents are up to date.\n\nFor any queries, contact the Placement Cell directly.\n\nBest regards,\nPlacement Officer\nJIMS Placement Cell\n\n---\nNote: This is an automated notification from the JIMS Placement Portal.`
      });
    }
  }, [isOpen, selectedStudents]);

  const handleSend = async () => {
    if (!formData.subject || !formData.message) {
      toast.error('Please fill in the subject and message');
      return;
    }

    setIsSending(true);
    try {
      const response = await axiosInstance.post('/students/notify-students', {
        studentIds: selectedStudents.map(s => s.student_id),
        subject: formData.subject,
        message: formData.message
      });

      const { sent, failed } = response.data;

      if (sent.length === 0) {
        toast.error('Failed to notify students.', {
          description: `${failed.map(f => `${f.name}: ${f.reason}`).join('; ')}`
        });
      } else if (failed.length === 0) {
        toast.success(`✅ All ${sent.length} student${sent.length > 1 ? 's' : ''} notified successfully!`);
      } else {
        toast.warning(`Sent to ${sent.length} student${sent.length > 1 ? 's' : ''}.`, {
          description: `${failed.length} failed: ${failed.map(f => f.name).join(', ')}`
        });
      }

      setFormData({ subject: '', message: '' });
      onClose();
    } catch (err) {
      console.error('Failed to notify students:', err);
      toast.error(err.response?.data?.error || 'Failed to send notifications. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notify Students</DialogTitle>
          <p className="text-sm text-gray-500">
            Sending individual emails to {selectedCount} selected {selectedCount === 1 ? 'student' : 'students'}
          </p>
        </DialogHeader>

        {/* Student Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700 mb-2">RECIPIENTS ({selectedCount})</p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {selectedStudents.map((s) => (
              <span key={s.student_id} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                {s.name} ({s.student_email || s.primary_email || 'No email'})
              </span>
            ))}
          </div>
        </div>

        {/* Personalization hint */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">✨ PERSONALIZATION TOKENS</p>
          <p className="text-xs text-amber-600">
            Use <code className="bg-amber-100 px-1 rounded">[Student Name]</code>, <code className="bg-amber-100 px-1 rounded">[Enrollment No]</code>, or <code className="bg-amber-100 px-1 rounded">[Course]</code> — they'll be replaced per student automatically.
          </p>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="notify-subject">Email Subject <span className="text-red-500">*</span></Label>
            <Input
              id="notify-subject"
              placeholder="Important update from JIMS Placement Cell"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="notify-message">Message <span className="text-red-500">*</span></Label>
              <span className="text-xs text-indigo-600 font-medium italic">Editable before sending</span>
            </div>
            <Textarea
              id="notify-message"
              placeholder="Type your message here..."
              rows={12}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="font-mono text-sm"
              required
            />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className="bg-green-600 hover:bg-green-700 min-w-[140px]"
            disabled={isSending}
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </div>
            ) : (
              `Notify ${selectedCount} ${selectedCount === 1 ? 'Student' : 'Students'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
