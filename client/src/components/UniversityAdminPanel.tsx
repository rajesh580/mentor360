import React, { useState, useEffect } from 'react';
import {
  Building2,
  GraduationCap,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

interface UniversityAdminPanelProps {
  token: string;
  apiBase: string;
}

export const UniversityAdminPanel: React.FC<UniversityAdminPanelProps> = ({ token, apiBase }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/institution/university-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load university summary.');
        const result = await res.json();
        setData(result);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, apiBase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Loading University Affiliation & Academic Standards Portal…</p>
      </div>
    );
  }

  const totals = data?.universityTotals || {};
  const institutions = data?.institutions || [];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Visvesvaraya Technological University (VTU)
          </span>
          <span className="text-xs text-slate-400 font-mono">University Portal</span>
        </div>
        <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">
          University-Wide Academic Standards & Affiliated Colleges
        </h1>
        <p className="mt-1 text-xs md:text-sm text-slate-300">
          SRS Section 3.2: Multi-Institution Oversight, Syllabus Alignment & University-Level Accreditation Analytics.
        </p>
      </div>

      {/* University Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Affiliated Institutions</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">
            {totals.totalAffiliatedInstitutions || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Colleges on Mentor360</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">University Enrollment</span>
          <div className="text-3xl font-black text-sky-600 font-mono mt-2">
            {totals.totalStudents || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">{totals.totalFaculty || 0} faculty mentors active</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Mentee Ratio Standard</span>
          <div className="text-3xl font-black text-emerald-600 font-mono mt-2">
            {totals.averageMenteeRatio || '1:18'}
          </div>
          <p className="text-xs text-slate-500 mt-1">VTU Guideline: &le; 1:20</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Total Mentoring Sessions</span>
          <div className="text-3xl font-black text-indigo-600 font-mono mt-2">
            {totals.totalMeetings || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Logged across all institutions</p>
        </div>
      </div>

      {/* Affiliated Colleges Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Affiliated Colleges Overview</h3>
          <span className="text-xs text-slate-500">Real-time telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">College Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3 text-right">Students</th>
                <th className="py-3 px-3 text-right">Faculty Mentors</th>
                <th className="py-3 px-3 text-right">Avg SGPA</th>
                <th className="py-3 px-3 text-right">Attendance Shortages</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutions.map((inst: any) => (
                <tr key={inst.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    {inst.name}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-sky-700">{inst.code}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{inst.student_count}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{inst.faculty_count}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-700">{inst.avg_sgpa || '—'}</td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    <span className={inst.shortage_students > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                      {inst.shortage_students}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {inst.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
