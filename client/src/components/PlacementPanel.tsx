import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Award,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Users,
  Target,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface PlacementPanelProps {
  token: string;
  apiBase: string;
}

export const PlacementPanel: React.FC<PlacementPanelProps> = ({ token, apiBase }) => {
  const [summary, setSummary] = useState<any>(null);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'overview' | 'internships' | 'certifications' | 'drive-filter'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Eligibility filter params
  const [minCgpa, setMinCgpa] = useState(7.0);
  const [maxBacklogs, setMaxBacklogs] = useState(0);
  const [minAttendance, setMinAttendance] = useState(75);
  const [filtering, setFiltering] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/development/placement-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load placement summary.');
        const result = await res.json();
        setSummary(result);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, apiBase, refreshKey]);

  const loadEligibleStudents = async () => {
    setFiltering(true);
    try {
      const res = await fetch(
        `${apiBase}/api/development/placement-eligible?minCgpa=${minCgpa}&maxBacklogs=${maxBacklogs}&minAttendance=${minAttendance}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to filter eligible students.');
      const result = await res.json();
      setEligibleStudents(Array.isArray(result) ? result : []);
    } catch (err: any) {
      alert(err.message || 'Error filtering students.');
    } finally {
      setFiltering(false);
    }
  };

  useEffect(() => {
    if (subTab === 'drive-filter') {
      loadEligibleStudents();
    }
  }, [subTab, minCgpa, maxBacklogs, minAttendance]);

  const handleVerifyCert = async (certId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${apiBase}/api/development/certificates/${certId}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified: !currentStatus }),
      });
      if (!res.ok) throw new Error('Verification update failed.');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Error updating certificate verification.');
    }
  };

  const exportEligibleCsv = () => {
    if (!eligibleStudents || eligibleStudents.length === 0) return;
    const headers = ['USN', 'Full Name', 'Department', 'Semester', 'CGPA', 'Active Backlogs', 'Attendance %', 'Email', 'Phone'];
    const rows = eligibleStudents.map((s) => [
      s.usn,
      s.full_name,
      s.department_code,
      s.current_semester,
      s.cgpa,
      s.active_backlogs,
      `${s.attendance_percentage}%`,
      s.email,
      s.phone || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((f) => `"${f}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Placement_Eligible_Students_CGPA_${minCgpa}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Loading Placement & Career Readiness Metrics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" /> Training & Placement Directorate
            </span>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">
            Placement & Career Readiness Intelligence
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300">
            SRS Section 5.9: Student Skills Matrix, Industry Internships & Campus Recruitment Eligibility Filter.
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition self-start md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Registered Candidates</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{summary?.totalStudents || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Total student profiles</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Internship Placements</span>
          <div className="text-3xl font-black text-emerald-600 font-mono mt-2">
            {summary?.studentsWithInternships || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Students with industry internship</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Verified Certifications</span>
          <div className="text-3xl font-black text-indigo-600 font-mono mt-2">
            {summary?.verifiedCertificates || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">NPTEL, Coursera & AWS verified</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Tracked Skills</span>
          <div className="text-3xl font-black text-sky-600 font-mono mt-2">
            {summary?.skillsDistribution?.length || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Technical & soft competencies</p>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setSubTab('overview')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            subTab === 'overview'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Skills Matrix & Overview
        </button>
        <button
          onClick={() => setSubTab('internships')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            subTab === 'internships'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Industry Internships ({summary?.internships?.length || 0})
        </button>
        <button
          onClick={() => setSubTab('certifications')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            subTab === 'certifications'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Certifications Verification ({summary?.certificates?.length || 0})
        </button>
        <button
          onClick={() => setSubTab('drive-filter')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
            subTab === 'drive-filter'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Campus Drive Eligibility Filter
        </button>
      </div>

      {/* SUBTAB 1: Skills Matrix */}
      {subTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Competency & Skill Inventory Breakdown</h3>
            <div className="space-y-3">
              {summary?.skillsDistribution && summary.skillsDistribution.length > 0 ? (
                summary.skillsDistribution.map((sk: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{sk.skill_name}</span>
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                        {sk.category}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                      {sk.student_count} students
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4">No skills mapped yet.</p>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Top Recruiting Companies Offering Internships</h3>
            <div className="space-y-3">
              {summary?.internships && summary.internships.length > 0 ? (
                summary.internships.slice(0, 5).map((i: any) => (
                  <div key={i.id} className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{i.company_name}</span>
                      <span className="font-mono font-bold text-emerald-800 text-[11px]">
                        {i.stipend_amount ? `₹${Number(i.stipend_amount).toLocaleString()}/mo` : 'Stipendiary'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      Role: <strong>{i.role}</strong> • Intern: {i.student_name} ({i.usn})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4">No internships registered yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Internships Table */}
      {subTab === 'internships' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-3">Start Date</th>
                  <th className="py-3 px-3 text-right">Stipend</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.internships?.map((i: any) => (
                  <tr key={i.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{i.student_name}</div>
                      <div className="font-mono text-[11px] text-sky-700">{i.usn} • {i.department_code}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{i.company_name}</td>
                    <td className="py-3 px-4 text-slate-700">{i.role}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(i.start_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {i.stipend_amount ? `₹${Number(i.stipend_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {i.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Certifications Verification */}
      {subTab === 'certifications' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Certificate Title</th>
                  <th className="py-3 px-4">Issuing Body</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-center">Verification Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.certificates?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.student_name}</div>
                      <div className="font-mono text-[11px] text-sky-700">{c.usn} • {c.department_code}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.title}</td>
                    <td className="py-3 px-4 text-slate-600">{c.issuing_org}</td>
                    <td className="py-3 px-3 text-slate-500">{c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.verified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleVerifyCert(c.id, c.verified)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          c.verified
                            ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {c.verified ? 'Revoke' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Drive Eligibility Filter */}
      {subTab === 'drive-filter' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Minimum CGPA
                </label>
                <select
                  value={minCgpa}
                  onChange={(e) => setMinCgpa(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value={6.0}>6.0 CGPA</option>
                  <option value={6.5}>6.5 CGPA</option>
                  <option value={7.0}>7.0 CGPA</option>
                  <option value={7.5}>7.5 CGPA</option>
                  <option value={8.0}>8.0 CGPA</option>
                  <option value={8.5}>8.5 CGPA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Max Active Backlogs
                </label>
                <select
                  value={maxBacklogs}
                  onChange={(e) => setMaxBacklogs(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value={0}>0 (Strictly No Backlogs)</option>
                  <option value={1}>Max 1 Backlog</option>
                  <option value={2}>Max 2 Backlogs</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Minimum Attendance
                </label>
                <select
                  value={minAttendance}
                  onChange={(e) => setMinAttendance(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value={75}>75% (VTU Standard)</option>
                  <option value={80}>80%</option>
                  <option value={85}>85%</option>
                </select>
              </div>
            </div>

            <button
              onClick={exportEligibleCsv}
              disabled={eligibleStudents.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export Candidate List (CSV)
            </button>
          </div>

          {/* Results Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                {eligibleStudents.length} Candidates Qualified for Campus Drive
              </span>
              <span className="text-xs text-slate-500">Filtered in real-time</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">USN</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3">Dept</th>
                    <th className="py-3 px-3 text-right">CGPA</th>
                    <th className="py-3 px-3 text-right">Backlogs</th>
                    <th className="py-3 px-3 text-right">Attendance</th>
                    <th className="py-3 px-4">Contact Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibleStudents.length > 0 ? (
                    eligibleStudents.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-sky-700">{s.usn}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{s.full_name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{s.department_code}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{s.cgpa}</td>
                        <td className="py-3 px-3 text-right font-mono">{s.active_backlogs}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                          {s.attendance_percentage}%
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {s.email} {s.phone ? `• ${s.phone}` : ''}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No students match these criteria. Try adjusting the CGPA or backlog filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
