import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Toaster } from '../components/ui/sonner';
import { Sidebar } from '../components/Sidebar';
import useStudentStore from '../store/useStudentStore';
import useAuthStore from '../store/useAuthStore';
import { UserPending } from './UserPending';

export function MainDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const userRole = user?.role;


  const {
    students,
    isLoading,
    error,
    fetchStudents,
  } = useStudentStore();

  const path = location.pathname.replace(/^\/+/, '');
  const activeView = path || (userRole === 'user' ? 'pending' : 'dashboard');

  useEffect(() => {
    if (location.pathname === '/') {
      const isValidRole = userRole === 'admin' || userRole === 'placement_officer' || userRole === 'user';
      if (!isValidRole) {
        logout(); // Force logout to clear invalid session and gracefully break infinite redirects
      } else {
        // Redirect to appropriate starting view
        const targetView = userRole === 'user' ? '/pending' : '/dashboard';
        navigate(targetView, { replace: true });
      }
    }
  }, [location.pathname, navigate, userRole, logout]);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = (view) => {
    navigate(`/${view}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Render Student's Pending View if role is student ('user')
  if (userRole === 'user') {
    return <UserPending />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userRole={userRole}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && students.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error && students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-red-500 font-medium">{error}</p>
              <button 
                onClick={fetchStudents}
                className="mt-4 text-indigo-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
