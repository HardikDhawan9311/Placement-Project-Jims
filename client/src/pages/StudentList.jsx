import { useState } from 'react';
import { StudentFilters } from '../components/StudentFilters';
import { StudentTable } from '../components/StudentTable';
import { SelectionActionBar } from '../components/SelectionActionBar';
import { EmailModal } from '../components/EmailModal';
import { NotifyStudentsModal } from '../components/NotifyStudentsModal';
import { StudentProfile } from './StudentProfile';
import { BulkPasteModal } from '../components/BulkPasteModal';
import { BulkSearchIndicator } from '../components/BulkSearchIndicator';
import { FilterResultIndicator } from '../components/ui/FilterResultIndicator';
import { EmptySearchState } from '../components/ui/EmptySearchState';
import useStudentStore from '../store/useStudentStore';
import useAuthStore from '../store/useAuthStore';

export function StudentList() {
  const { user } = useAuthStore();
  const userRole = user?.role;
  const {
    students,
    filteredStudents,
    filters,
    searchTokens,
    allSkills,
    setFilters,
    setSearchTokens,
    resetFilters,
  } = useStudentStore();

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isBulkPasteModalOpen, setIsBulkPasteModalOpen] = useState(false);

  const matchedCount = filteredStudents.length;
  const totalCount = students.length;

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = (selected) => {
    setSelectedStudents(selected ? filteredStudents.map(s => s.student_id) : []);
  };

  if (selectedStudent) {
    return (
      <StudentProfile 
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
        onNotify={() => {
          setSelectedStudents([selectedStudent.student_id]);
          setIsNotifyModalOpen(true);
        }}
        onSendToCompany={() => {
          setSelectedStudents([selectedStudent.student_id]);
          setIsEmailModalOpen(true);
        }}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student</h2>
          </div>
        </div>
        
        <BulkSearchIndicator 
          activeSearchCount={searchTokens.length}
          onClearAll={() => setSearchTokens([])}
        />
        
        <StudentFilters
          filters={filters}
          onFilterChange={setFilters}
          onApplyFilters={() => {}}
          onResetFilters={resetFilters}
          userRole={userRole}
          allStudents={students}
          searchTokens={searchTokens}
          onSearchTokensChange={setSearchTokens}
          onBulkPasteClick={() => setIsBulkPasteModalOpen(true)}
          allSkills={allSkills}
        />
        
        <FilterResultIndicator
          matchedCount={matchedCount}
          totalCount={totalCount}
          searchTokenCount={searchTokens.length}
        />
        
        {matchedCount === 0 ? (
          <EmptySearchState onClear={() => { setSearchTokens([]); resetFilters(); }} />
        ) : (
          <StudentTable
            students={filteredStudents}
            selectedStudents={selectedStudents}
            onSelectStudent={handleSelectStudent}
            onSelectAll={handleSelectAll}
            onViewProfile={setSelectedStudent}
            searchTokens={searchTokens}
          />
        )}
      </div>

      <SelectionActionBar
        selectedCount={selectedStudents.length}
        onSendToCompany={() => setIsEmailModalOpen(true)}
        onNotifyStudents={() => setIsNotifyModalOpen(true)}
      />

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        selectedStudents={students.filter(s => selectedStudents.includes(s.student_id))}
      />

      <NotifyStudentsModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        selectedStudents={students.filter(s => selectedStudents.includes(s.student_id))}
      />

      <BulkPasteModal
        isOpen={isBulkPasteModalOpen}
        onClose={() => setIsBulkPasteModalOpen(false)}
        onApply={(names) => setSearchTokens([...searchTokens, ...names])}
      />
    </>
  );
}
