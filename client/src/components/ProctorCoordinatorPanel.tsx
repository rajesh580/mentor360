import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  ArrowRightLeft,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface ProctorCoordinatorPanelProps {
  token: string;
  apiBase: string;
}

export const ProctorCoordinatorPanel: React.FC<ProctorCoordinatorPanelProps> = ({ token, apiBase }) => {
  const [workload, setWorkload] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [unallocated, setUnallocated] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'workload' | 'unallocated' | 'allocations' | 'history'>('workload');
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Bulk Allocation Modal State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetFacultyId, setTargetFacultyId] = useState('');
  const [bulkAllocating, setBulkAllocating] = useState(false);

  // Single Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedAlloc, setSelectedAlloc] = useState<any>(null);
  const [newFacultyId, setNewFacultyId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${apiBase}/api/proctors/workload`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${apiBase}/api/proctors/allocations`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${apiBase}/api/proctors/unallocated`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${apiBase}/api/proctors/reassignment-history`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([wData, aData, uData, hData]) => {
        setWorkload(Array.isArray(wData) ? wData : []);
        setAllocations(Array.isArray(aData) ? aData : []);
        setUnallocated(Array.isArray(uData) ? uData : []);
        setHistory(Array.isArray(hData) ? hData : []);
      })
      .catch((err) => console.error('Failed to load coordinator data:', err))
      .finally(() => setLoading(false));
  }, [token, apiBase, refreshKey]);

  const handleBulkAllocate = async () => {
    if (selectedStudentIds.length === 0 || !targetFacultyId) {
      alert('Please select at least one student and a target faculty mentor.');
      return;
    }
    setBulkAllocating(true);
    try {
      const res = await fetch(`${apiBase}/api/proctors/bulk-allocate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          facultyId: targetFacultyId,
        }),
      });
      if (!res.ok) throw new Error('Bulk allocation failed.');
      alert('Students successfully allocated to mentor!');
      setSelectedStudentIds([]);
      setTargetFacultyId('');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Error executing bulk allocation.');
    } finally {
      setBulkAllocating(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlloc || !newFacultyId || !reassignReason) return;
    setReassigning(true);
    try {
      const res = await fetch(`${apiBase}/api/proctors/reassign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedAlloc.student_id,
          newFacultyId,
          reason: reassignReason,
        }),
      });
      if (!res.ok) throw new Error('Reassignment failed.');
      alert('Student successfully transferred to new mentor.');
      setReassignModalOpen(false);
      setSelectedAlloc(null);
      setNewFacultyId('');
      setReassignReason('');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Error reassigning mentor.');
    } finally {
      setReassigning(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllUnallocated = () => {
    if (selectedStudentIds.length === unallocated.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(unallocated.map((s) => s.id));
    }
  };

  const totalAssigned = allocations.length;
  const totalUnassigned = unallocated.length;
  const totalStudents = totalAssigned + totalUnassigned;
  const coveragePercent = totalStudents > 0 ? Math.round((totalAssigned / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Proctor Coordination Engine
            </span>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">
            Proctor Allocation & Workload Balancing Hub
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300">
            SRS Section 5.4: Mentee Caseload Distribution, Bulk Transfers & Reassignment Audit Trail.
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Mentoring Coverage</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{coveragePercent}%</div>
          <p className="text-xs text-slate-500 mt-1">{totalAssigned} of {totalStudents} assigned</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Unallocated Students</span>
          <div className={`text-3xl font-black font-mono mt-2 ${totalUnassigned > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {totalUnassigned}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pending mentor allocation</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Faculty Mentors</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{workload.length}</div>
          <p className="text-xs text-slate-500 mt-1">Active proctor guides</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Historical Transfers</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{history.length}</div>
          <p className="text-xs text-slate-500 mt-1">Logged in reassignment audit</p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setSubTab('workload')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            subTab === 'workload'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Faculty Workload & Roster ({workload.length})
        </button>
        <button
          onClick={() => setSubTab('unallocated')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
            subTab === 'unallocated'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Unallocated Students ({unallocated.length})
          {unallocated.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              Action Required
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('allocations')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            subTab === 'allocations'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Allocations ({allocations.length})
        </button>
        <button
          onClick={() => setSubTab('history')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition ${
            subTab === 'history'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reassignment History ({history.length})
        </button>
      </div>

      {/* SUBTAB 1: Faculty Workload */}
      {subTab === 'workload' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Faculty Mentee Capacity & Caseload Balance</h3>
            <span className="text-xs text-slate-500">Target: Max 30 mentees per faculty (NAAC Guideline)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-3">Emp ID</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3 text-right">Active Mentees</th>
                  <th className="py-3 px-3 text-right">Max Capacity</th>
                  <th className="py-3 px-4">Caseload Bar</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workload.map((f: any) => {
                  const count = parseInt(f.active_mentees_count) || 0;
                  const max = parseInt(f.max_mentees) || 30;
                  const pct = Math.min(100, Math.round((count / max) * 100));
                  return (
                    <tr key={f.faculty_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{f.faculty_name}</div>
                        <div className="text-[11px] text-slate-400">{f.designation} • {f.faculty_email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{f.employee_id}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                          {f.department_code}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{count}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{max}</td>
                      <td className="py-3 px-4 w-48">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct > 90 ? 'bg-rose-500' : pct > 60 ? 'bg-sky-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          count >= max
                            ? 'bg-rose-100 text-rose-800'
                            : count > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {count >= max ? 'AT CAPACITY' : count > 0 ? 'AVAILABLE' : 'IDLE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Unallocated Students & Bulk Allocation */}
      {subTab === 'unallocated' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllUnallocated}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
              >
                {selectedStudentIds.length === unallocated.length && unallocated.length > 0
                  ? 'Deselect All'
                  : 'Select All Unallocated'}
              </button>
              <span className="text-xs text-slate-500">
                {selectedStudentIds.length} of {unallocated.length} selected
              </span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={targetFacultyId}
                onChange={(e) => setTargetFacultyId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-sky-500 flex-1 md:w-64"
              >
                <option value="">Choose Mentor to Assign…</option>
                {workload.map((f: any) => (
                  <option key={f.faculty_id} value={f.faculty_id}>
                    {f.faculty_name} ({f.department_code} - {f.active_mentees_count}/{f.max_mentees})
                  </option>
                ))}
              </select>

              <button
                onClick={handleBulkAllocate}
                disabled={selectedStudentIds.length === 0 || !targetFacultyId || bulkAllocating}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {bulkAllocating ? 'Allocating…' : `Assign (${selectedStudentIds.length})`}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-10 text-center">Select</th>
                    <th className="py-3 px-4">USN</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Sem & Sec</th>
                    <th className="py-3 px-4">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unallocated.length > 0 ? (
                    unallocated.map((s: any) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`cursor-pointer transition ${isSelected ? 'bg-sky-50/60' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleStudentSelection(s.id)}
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-sky-700">{s.usn}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{s.full_name}</td>
                          <td className="py-3 px-3 font-semibold text-slate-700">{s.department_code}</td>
                          <td className="py-3 px-3">Sem {s.current_semester} - Sec {s.current_section}</td>
                          <td className="py-3 px-4 text-slate-500">{s.email}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        All students are successfully allocated to mentors!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: Active Allocations */}
      {subTab === 'allocations' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">USN</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Sem</th>
                  <th className="py-3 px-4">Assigned Mentor</th>
                  <th className="py-3 px-3">Allocated Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a: any) => (
                  <tr key={a.allocation_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{a.usn}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{a.student_name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{a.department_code}</td>
                    <td className="py-3 px-3">Sem {a.current_semester} - {a.current_section}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{a.mentor_name}</div>
                      <div className="text-[11px] text-slate-400">{a.designation}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{new Date(a.allocated_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedAlloc(a);
                          setReassignModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-1 mx-auto"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Transfer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Reassignment History */}
      {subTab === 'history' && (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" />
              Proctor Reassignment Audit Trail (SRS Section 2.2)
            </h3>
            <span className="text-xs text-slate-500">Tamper-evident transfer records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Previous Mentor</th>
                  <th className="py-3 px-4">New Mentor</th>
                  <th className="py-3 px-4">Transfer Reason</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length > 0 ? (
                  history.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{h.student_name}</div>
                        <div className="text-[11px] font-mono text-sky-700">{h.usn}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{h.previous_mentor_name}</td>
                      <td className="py-3 px-4 font-bold text-sky-900">{h.new_mentor_name}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{h.reason}</td>
                      <td className="py-3 px-3 text-slate-500">{new Date(h.reassignment_date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{h.approved_by_name || 'Coordinator'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No reassignment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REASSIGNMENT MODAL */}
      {reassignModalOpen && selectedAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Transfer Student to New Mentor</h3>
            <p className="mt-1 text-xs text-slate-500">
              Transferring <strong className="text-slate-800">{selectedAlloc.student_name} ({selectedAlloc.usn})</strong> from {selectedAlloc.mentor_name}.
            </p>

            <form onSubmit={handleReassign} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Faculty Mentor</label>
                <select
                  required
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-sky-500"
                >
                  <option value="">Select New Mentor…</option>
                  {workload
                    .filter((f) => f.faculty_id !== selectedAlloc.faculty_id)
                    .map((f) => (
                      <option key={f.faculty_id} value={f.faculty_id}>
                        {f.faculty_name} ({f.department_code} - {f.active_mentees_count}/{f.max_mentees})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Reason for Transfer</label>
                <textarea
                  required
                  rows={3}
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Mentor sabbatical, departmental elective realignment, or student request approved by HOD..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {reassigning ? 'Transferring…' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
