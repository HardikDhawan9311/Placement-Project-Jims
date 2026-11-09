import { useState, useEffect } from 'react';
import { ArrowLeft, Github, Linkedin, Code, Mail, Phone, FileText, ExternalLink, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PlacementReadinessCard } from '../components/PlacementReadinessCard';
import { SemesterAccordion } from '../components/SemesterAccordion';
import { PerformanceCharts } from '../components/PerformanceCharts';
import axiosInstance from '../api/axiosInstance';

export function StudentProfile({ student, onBack, onNotify, onSendToCompany }) {
  const [profileData, setProfileData] = useState(null);
  const [academicData, setAcademicData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        setIsLoading(true);
        // Using the new refactored endpoint
        const response = await axiosInstance.get(`/students/${student.student_id}/academic-history`);
        const data = response.data;

        setProfileData(data.details);

        // Map academic history (CIE / mock rows match CSV import: subject + marks, test_name + marks)
        const formattedHistory = data.academicHistory.map(sem => ({
          semesterNumber: sem.semester_number,
          sgpa: parseFloat(sem.sgpa || 0),
          cieMarks: (sem.cieMarks || []).map(cie => ({
            subject: cie.subject,
            marks: parseFloat(cie.marks ?? 0),
          })),
          mockTests: (sem.mockTests || []).map(test => ({
            testName: test.test_name,
            score: parseFloat(test.marks ?? 0),
          })),
          avgCIE: sem.cieMarks?.length > 0
            ? sem.cieMarks.reduce((sum, c) => sum + parseFloat(c.marks ?? 0), 0) / sem.cieMarks.length
            : 0,
          avgMockTest: sem.mockTests?.length > 0
            ? sem.mockTests.reduce((sum, t) => sum + parseFloat(t.marks ?? 0), 0) / sem.mockTests.length
            : 0,
        }));

        setAcademicData(formattedHistory);
        setError(null);
      } catch (err) {
        console.error('Error fetching student profile:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullProfile();
  }, [student.student_id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-gray-500 animate-pulse">Loading comprehensive profile...</p>
      </div>
    );
  }

  const totalMockTests = academicData.reduce((sum, sem) => sum + (sem.mockTests?.length || 0), 0);
  const avgMockScore = totalMockTests > 0
    ? academicData.reduce((sum, sem) =>
      sum + (sem.mockTests?.reduce((s, t) => s + (t.score || 0), 0) || 0), 0
    ) / totalMockTests
    : 0;

  // Get Graduation agg from academics table
  const graduationLevel = profileData?.academics?.find(a => a.level === 'Graduation');
  const aggregatePercentage = graduationLevel?.percentage || 0;

  // Calculate placement readiness score
  const placementReadiness = Math.min(100, Math.round(
    (aggregatePercentage / 10) * 10 +
    (avgMockScore * 0.3) +
    (academicData.length > 0 ? 10 : 0)
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onNotify}
            className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Mail className="w-4 h-4" />
            Notify Student
          </Button>
          <Button 
            onClick={onSendToCompany}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <ExternalLink className="w-4 h-4" />
            Send to Company
          </Button>
        </div>
      </div>

      {/* Main Profile & Personal Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{student.name}</CardTitle>
                  <p className="text-indigo-100 mt-1">{student.enrollment_no}</p>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  {student.college_shift} Shift
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Gender</p>
                  <p className="font-medium mt-1">{student.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">DOB</p>
                  <p className="font-medium mt-1">{student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Residence</p>
                  <p className="font-medium mt-1">{student.residence_type || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs text-gray-500">Primary Email</p>
                    <p className="text-sm font-medium">{student.primary_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="text-sm font-medium">{student.phone}</p>
                  </div>
                </div>
                {student.linkedin && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Linkedin className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-500">LinkedIn Profile</p>
                      <a href={student.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
                        View Profile <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    </div>
                  </div>
                )}
                {student.github && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Github className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-500">GitHub Profile</p>
                      <a href={student.github} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
                        View Profile <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    </div>
                  </div>
                )}
                {student.skills && student.skills.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Code className="w-4 h-4 text-indigo-600 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Technical Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {student.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-white border-indigo-100 text-indigo-700">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Academic Summary (10th/12th/Grad) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                Academic History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profileData?.academics?.map((edu, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-white shadow-sm">
                    <Badge variant="outline" className="mb-2">{edu.level}</Badge>
                    <p className="text-sm font-bold text-gray-900">{edu.percentage}%</p>
                    <p className="text-xs text-gray-500 mt-1">{edu.stream}</p>
                    <p className="text-xs text-gray-400">{edu.board_or_college} ({edu.passing_year})</p>
                  </div>
                ))}
              </div>
              {profileData?.gaps ? (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <div className="text-amber-600 font-bold text-sm shrink-0">Gap year</div>
                  <p className="text-sm text-amber-800">
                    {profileData.gaps.reason || (
                      <span className="text-amber-700/80 italic">Exists , Reason Not Found</span>
                    )}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info (Family & Address) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Family Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData?.family && (
                <>
                  <div className="pb-4 border-b">
                    <p className="text-sm font-semibold text-gray-900">{profileData.family.father_name}</p>
                    <p className="text-xs text-gray-500">Father • {profileData.family.father_occupation}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{profileData.family.mother_name}</p>
                    <p className="text-xs text-gray-500">Mother • {profileData.family.mother_occupation}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData?.addresses?.map((addr, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">{addr.type} Address</p>
                    <p className="text-sm text-gray-700 leading-snug">{addr.address}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Experience & Placement Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Experience & Internships</CardTitle>
          </CardHeader>
          <CardContent>
            {profileData?.experiences?.has_experience ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 font-medium">{profileData.experiences.description}</p>
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
                  <strong>Details:</strong> {profileData.experiences.internship_details}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No professional experience recorded.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Placement Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${profileData?.placement?.status === 'Placed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {profileData?.placement?.status === 'Placed' ? '✓' : '?'}
            </div>
            <div>
              <Badge variant={profileData?.placement?.status === 'Placed' ? 'success' : 'outline'}>
                {profileData?.placement?.status || 'Active'}
              </Badge>
              <h4 className="font-bold text-xl mt-1 text-gray-900">{profileData?.placement?.company || 'N/A'}</h4>
              <p className="text-sm text-gray-500 mt-1">{profileData?.placement?.details}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graduation Performance Section (Charts & Semesters) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Graduation Performance (BCA)</h2>
        </div>

        <PerformanceCharts semesters={academicData} />

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Semester-wise Details</h3>
          <SemesterAccordion semesters={academicData} />
        </div>
      </div>
    </div>
  );
}
