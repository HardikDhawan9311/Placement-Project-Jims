import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import useAuthStore from '../store/useAuthStore';
import { ProtectedRoute } from './ProtectedRoute';

// Lazy load pages
const LoginPage = lazy(() => import('../pages/LoginPage').then(module => ({ default: module.LoginPage })));
const SignUp = lazy(() => import('../pages/SignUp').then(module => ({ default: module.SignUp })));
const MainDashboard = lazy(() => import('../pages/MainDashboard').then(module => ({ default: module.MainDashboard })));
const DashboardOverview = lazy(() => import('../pages/DashboardOverview').then(module => ({ default: module.DashboardOverview })));
const StudentList = lazy(() => import('../pages/StudentList').then(module => ({ default: module.StudentList })));
const AdminUploadPanel = lazy(() => import('../pages/AdminUploadPanel').then(module => ({ default: module.AdminUploadPanel })));
const UserApproval = lazy(() => import('../pages/UserApproval').then(module => ({ default: module.UserApproval })));
const Companies = lazy(() => import('../pages/Companies').then(module => ({ default: module.Companies })));
const CompanyImportPanel = lazy(() => import('../pages/CompanyImportPanel').then(module => ({ default: module.CompanyImportPanel })));
const CieMarksImportPanel = lazy(() => import('../pages/CieMarksImportPanel').then(module => ({ default: module.CieMarksImportPanel })));
const MockTestsImportPanel = lazy(() => import('../pages/MockTestsImportPanel').then(module => ({ default: module.MockTestsImportPanel })));
const UserPending = lazy(() => import('../pages/UserPending').then(module => ({ default: module.UserPending })));

const LoadingFallback = () => (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-indigo-600 font-medium">Loading application...</p>
    </div>
);

export default function AppRoutes() {
    const { isAuthenticated, user } = useAuthStore();

    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route
                    path="/login"
                    element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/signup"
                    element={!isAuthenticated ? <SignUp /> : <Navigate to="/" replace />}
                />
                
                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <MainDashboard />
                        </ProtectedRoute>
                    }
                >
                    {/* Role-based default redirect handled in MainDashboard useEffect */}
                    <Route path="dashboard" element={<DashboardOverview />} />
                    <Route path="students" element={<StudentList />} />
                    <Route path="admin" element={<AdminUploadPanel />} />
                    <Route path="user-approval" element={<UserApproval />} />
                    <Route path="companies" element={<Companies />} />
                    <Route path="company-import" element={<CompanyImportPanel />} />
                    <Route path="cie-import" element={<CieMarksImportPanel />} />
                    <Route path="mock-import" element={<MockTestsImportPanel />} />
                    <Route path="pending" element={<UserPending />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>

            </Routes>
        </Suspense>
    );
}
