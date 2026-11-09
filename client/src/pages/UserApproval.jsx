import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Check, X, Shield, Clock, UserCheck } from 'lucide-react';

export function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/admin/pending-users');
      setPendingUsers(response.data);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      toast.error('Failed to load pending users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    try {
      await axiosInstance.post(`/admin/approve-user/${userId}`);
      toast.success('User approved successfully');
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Approval error:', err);
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject and delete this registration?')) return;
    try {
      await axiosInstance.delete(`/admin/reject-user/${userId}`);
      toast.success('User rejected and removed');
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Rejection error:', err);
      toast.error('Failed to reject user');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Approvals</h2>

        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">
            {pendingUsers.length} Pending Requests
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {pendingUsers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
            <p className="text-gray-500 mt-1">There are no pending registration requests at the moment.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead>User Details</TableHead>
                <TableHead>Requested Role</TableHead>
                <TableHead>Registered At</TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{user.name}</span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${user.role === 'admin' ? 'border-red-200 text-red-700 bg-red-50' :
                        user.role === 'placement_officer' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                          'border-blue-200 text-blue-700 bg-blue-50'
                        }`}
                    >
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                        onClick={() => handleReject(user.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleApprove(user.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>


    </div>
  );
}
