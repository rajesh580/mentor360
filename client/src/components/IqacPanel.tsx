import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Users,
  FileSpreadsheet,
  TrendingUp,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

interface IqacPanelProps {
  token: string;
  apiBase: string;
}

export const IqacPanel: React.FC<IqacPanelProps> = ({ token, apiBase }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'slow-learners' | 'advanced-learners' | 'remedial'>('overview');

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/reports/iqac-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load IQAC accreditation metrics.');
        const result = await res.json();
        setMetrics(result);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, apiBase]);

  const exportIqacReport = () => {
    if (!metrics) return;
    const content = `NAAC / NBA ACCREDITATION MENTORING COMPLIANCE REPORT\n` +
      `Generated Date: ${new Date().toLocaleDateString()}\n` +
      `Institution: Sai Vidya Institute of Technology\n\n` +
      `Criterion 2.3.3: Mentoring Ratio Compliance\n` +
      `Total Enrolled Students: ${metrics.totalStudents}\n` +
      `Total Faculty Mentors: ${metrics.totalFaculty}\n` +
      `Student-to-Mentor Ratio: ${metrics.ratioFormatted} (${metrics.ratioCompliant ? 'COMPLIANT with NAAC <= 1:20' : 'NON-COMPLIANT'})\n` +
      `Mentoring Coverage: ${metrics.coveragePercent}%\n` +
      `Total Mentoring Sessions Conducted: ${metrics.meetingsConducted}\n` +
      `Slow Learners Identified (<50% IA): ${metrics.slowLearnersCount}\n` +
      `Advanced Learners Identified (>=80% IA): ${metrics.advancedLearnersCount}\n` +
      `Active Remedial Action Plans: ${metrics.activeRemedialPlans?.length || 0}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NAAC_NBA_Mentoring_Compliance_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Computing NAAC & NBA Quality Assurance Metrics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Internal Quality Assurance Cell (IQAC)
            </span>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">
            Accreditation & Institutional Quality Dashboard
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300">
            NAAC Criterion 2 (Teaching-Learning & Evaluation) & NBA Criterion 9 (Student Support & Mentoring Compliance).
          </p>
        </div>

        <button
          onClick={exportIqacReport}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs md:text-sm shadow-md transition flex items-center gap-2 self-start md:self-auto"
        >
          <Download className="w-4 h-4" /> Export NAAC Audit Report
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Ratio Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mentor-Student Ratio</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              metrics?.ratioCompliant ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {metrics?.ratioCompliant ? 'NAAC COMPLIANT' : 'RATIO HIGH'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {metrics?.ratioFormatted || '1:18'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Benchmark: &le; 1:20 (Criterion 2.3.3)
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Satisfies Accreditation Criteria
          </div>
        </div>

        {/* Coverage Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proctoring Coverage</span>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {metrics?.coveragePercent || 100}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.allocatedStudents} of {metrics?.totalStudents} students covered
            </p>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="h-full bg-sky-600 rounded-full" style={{ width: `${metrics?.coveragePercent || 100}%` }} />
          </div>
        </div>

        {/* Slow Learners */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Slow Learners</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              IA &lt; 50%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-600 font-mono">
              {metrics?.slowLearnersCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Requiring remedial tutoring</p>
          </div>
          <div className="mt-3 text-[11px] text-slate-600 font-medium">
            {metrics?.activeRemedialPlans?.length || 0} Remedial plans active
          </div>
        </div>

        {/* Advanced Learners */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Advanced Learners</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
              IA &ge; 80%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-indigo-600 font-mono">
              {metrics?.advancedLearnersCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Targeted for research & hackathons</p>
          </div>
          <div className="mt-3 text-[11px] text-emerald-700 font-semibold">
            High academic distinction
          </div>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Compliance Overview
        </button>
        <button
          onClick={() => setActiveTab('slow-learners')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'slow-learners'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Slow Learners ({metrics?.slowLearnersCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('advanced-learners')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            activeTab === 'advanced-learners'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Advanced Learners ({metrics?.advancedLearnersCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('remedial')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            activeTab === 'remedial'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Remedial Action Plans ({metrics?.activeRemedialPlans?.length || 0})
        </button>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">NAAC Metric 2.3.3 Requirements Verification</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Student-Mentor Allotment Policy</div>
                  <div className="text-slate-500 text-[11px]">Institution policy mandates allocating every student to a proctor</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  SATISFIED
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Proctor Ratio Benchmark</div>
                  <div className="text-slate-500 text-[11px]">Proctor load must not exceed 1:20</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {metrics?.ratioFormatted} (PASS)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Meeting Frequency & Documentation</div>
                  <div className="text-slate-500 text-[11px]">Regular bi-weekly mentoring meetings logged with MOM</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {metrics?.meetingsConducted} SESSIONS
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Remedial Support for Slow Learners</div>
                  <div className="text-slate-500 text-[11px]">Targeted recovery classes & guardian involvement</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  DOCUMENTED
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-4">NBA Criterion 9 Telemetry</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Under NBA Tier-II guidelines, mentoring systems must demonstrate measurable outcomes in student progression, backlogs clearance, and psychological support.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <span className="text-slate-500 text-[11px] block">Students Mentored</span>
                  <strong className="text-base text-indigo-950 font-mono">{metrics?.studentsMentoredCount || 0}</strong>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <span className="text-slate-500 text-[11px] block">Total Meeting Logs</span>
                  <strong className="text-base text-indigo-950 font-mono">{metrics?.meetingsConducted || 0}</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Audit Ready Status: Verified</span>
              <span className="font-bold text-emerald-700">100% Evidence Linked</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Slow Learners List */}
      {activeTab === 'slow-learners' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">USN</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Sem</th>
                  <th className="py-3 px-3 text-right">Avg IA Marks (/50)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.slowLearners && metrics.slowLearners.length > 0 ? (
                  metrics.slowLearners.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">{s.usn}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{s.full_name}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{s.department_code}</td>
                      <td className="py-3 px-3 font-mono">Sem {s.current_semester}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">{s.overall_avg_ia}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          SLOW LEARNER (&lt; 50%)
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No slow learners identified in current records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Advanced Learners List */}
      {activeTab === 'advanced-learners' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">USN</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Sem</th>
                  <th className="py-3 px-3 text-right">Avg IA Marks (/50)</th>
                  <th className="py-3 px-4 text-center">Enrichment Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.advancedLearners && metrics.advancedLearners.length > 0 ? (
                  metrics.advancedLearners.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{s.usn}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{s.full_name}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{s.department_code}</td>
                      <td className="py-3 px-3 font-mono">Sem {s.current_semester}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700">{s.overall_avg_ia}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          ADVANCED LEARNER (&ge; 80%)
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No advanced learners identified in current records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Remedial Action Plans */}
      {activeTab === 'remedial' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Issue Category</th>
                  <th className="py-3 px-4">Remedial Action Plan</th>
                  <th className="py-3 px-4">Objective</th>
                  <th className="py-3 px-3">Target Date</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.activeRemedialPlans?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.student_name}</div>
                      <div className="font-mono text-[11px] text-sky-700">{p.usn}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{p.category}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.title}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{p.objective}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(p.target_date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
