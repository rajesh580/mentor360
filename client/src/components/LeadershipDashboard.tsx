import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  BookOpen,
  Filter,
  RefreshCw,
  BarChart3,
} from 'lucide-react';

interface LeadershipDashboardProps {
  token: string;
  apiBase: string;
  userRole: string;
}

export const LeadershipDashboard: React.FC<LeadershipDashboardProps> = ({ token, apiBase, userRole }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/reports/leadership-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load leadership summary.');
        const result = await res.json();
        setData(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, apiBase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Computing Institutional Executive Performance Analytics…</p>
      </div>
    );
  }

  const overview = data?.overview || {};
  const departments = (data?.departments || []).filter((d: any) =>
    selectedDeptFilter ? d.code === selectedDeptFilter : true
  );

  const getRoleTitle = () => {
    if (userRole === 'PRINCIPAL') return 'Principal / Director Cockpit';
    if (userRole === 'DEAN') return 'Dean Academics Monitoring Hub';
    if (userRole === 'HOD') return 'Departmental Leadership Overview';
    return 'Institutional Leadership Cockpit';
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Institutional Executive Governance
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              {userRole}
            </span>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{getRoleTitle()}</h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300">
            SRS Section 3.2 & 5.11: Academic Performance, Mentoring Compliance & Departmental Comparative Scorecards.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800/90 text-white px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500"
          >
            <option value="">All Departments</option>
            {data?.departments?.map((d: any) => (
              <option key={d.id} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Student Enrollment</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{overview.totalStudents || 0}</div>
          <p className="text-xs text-slate-500 mt-1">{overview.totalFaculty || 0} faculty guides assigned</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Mentoring Coverage</span>
          <div className="text-3xl font-black text-sky-600 font-mono mt-2">{overview.coveragePercent || 0}%</div>
          <p className="text-xs text-slate-500 mt-1">Allocated to proctor groups</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Attendance Risk Flag</span>
          <div className={`text-3xl font-black font-mono mt-2 ${overview.shortageCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {overview.shortageCount || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Students below 75% VTU threshold</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Open Student Concerns</span>
          <div className={`text-3xl font-black font-mono mt-2 ${overview.openIssues > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {overview.openIssues || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">{overview.completedMeetings || 0} meetings completed</p>
        </div>
      </div>

      {/* Departmental Comparative Scorecard Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Departmental Comparative Performance Scorecard</h3>
            <p className="text-xs text-slate-500">Multi-department academic monitoring and mentoring metrics</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-bold font-mono">
            {departments.length} Departments Analyzed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-3 text-right">Students</th>
                <th className="py-3 px-3 text-right">Faculty</th>
                <th className="py-3 px-3 text-right">Proctor Ratio</th>
                <th className="py-3 px-3 text-right">Avg SGPA</th>
                <th className="py-3 px-3 text-right">Attendance Shortage</th>
                <th className="py-3 px-3 text-right">Open Concerns</th>
                <th className="py-3 px-4 text-center">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d: any) => {
                const stuCount = parseInt(d.student_count) || 0;
                const facCount = parseInt(d.faculty_count) || 0;
                const ratio = facCount > 0 ? `1:${(stuCount / facCount).toFixed(1)}` : 'N/A';
                const shortages = parseInt(d.shortage_students) || 0;
                const concerns = parseInt(d.open_concerns) || 0;

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-800">
                          {d.code}
                        </span>
                        {d.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{stuCount}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{facCount}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">{ratio}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-700">
                      {d.avg_sgpa || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span className={shortages > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {shortages}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono">
                      <span className={concerns > 0 ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                        {concerns}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        shortages === 0 && concerns === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : shortages > 2
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {shortages === 0 && concerns === 0 ? 'EXCELLENT' : shortages > 2 ? 'ATTENTION NEEDED' : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
