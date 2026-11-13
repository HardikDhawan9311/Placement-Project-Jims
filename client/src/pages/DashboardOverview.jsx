import { DashboardOverviewCharts } from '../components/DashboardOverviewCharts';
import useStudentStore from '../store/useStudentStore';

export function DashboardOverview() {
  const { students } = useStudentStore();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Placed Students</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {students.filter(s => (s.placement_status || '').toLowerCase() === 'placed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">In Process</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">
            {students.filter(s => (s.placement_status || '').toLowerCase() === 'in process').length}
          </p>
        </div>
      </div>

      <DashboardOverviewCharts students={students} />
    </div>
  );
}
