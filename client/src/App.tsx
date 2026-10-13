import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  Award,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  X,
  FileText,
  UserCheck,
  BookOpen,
  Phone,
  Mail,
  Building2,
  Eye,
  LogOut,
  RefreshCw,
  TrendingUp,
  ExternalLink,
  Upload,
  LockKeyhole,
} from 'lucide-react';

// API base URL configuration: uses Vite proxy in dev (/api) or custom VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'proctors' | 'meetings' | 'interventions' | 'counselling' | 'import'>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [proctors, setProctors] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [counsellingSessions, setCounsellingSessions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [proctorFile, setProctorFile] = useState<any>(null);
  const [loadingProctorFile, setLoadingProctorFile] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignData, setReassignData] = useState({ studentId: '', newFacultyId: '', reason: '' });

  // Import preview state
  const [importResult, setImportResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Restore the user's own session; never sign in with a seeded account automatically.
  useEffect(() => {
    const savedToken = localStorage.getItem('mentor360_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error('Your session has expired. Please sign in again.');
        const data = await res.json();
        const user = data.user;
        setCurrentUser({ ...user, fullName: user.full_name, roleCode: user.role_code, institutionName: user.institution_name });
        setToken(savedToken);
        void fetchData(savedToken, user.role_code);
      })
      .catch(() => localStorage.removeItem('mentor360_token'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to sign in. Please try again.');
      localStorage.setItem('mentor360_token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      void fetchData(data.token, data.user.roleCode);
    } catch (err: any) {
      setAuthError(err.message || 'Could not connect to the server. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mentor360_token');
    setToken(null);
    setCurrentUser(null);
    setStats(null);
    setStudents([]);
    setProctors([]);
    setMeetings([]);
    setInterventions([]);
    setCounsellingSessions([]);
    setActiveTab('dashboard');
  };

  const fetchData = async (authToken: string, roleCode = currentUser?.roleCode || currentUser?.role_code) => {
    const headers = { Authorization: `Bearer ${authToken}` };
    try {
      const requests: Promise<Response>[] = [
        fetch(`${API_BASE}/api/reports/dashboard-stats`, { headers }),
        fetch(`${API_BASE}/api/students`, { headers }),
        fetch(`${API_BASE}/api/proctors/workload`, { headers }),
        fetch(`${API_BASE}/api/interventions`, { headers }),
        fetch(`${API_BASE}/api/meetings`, { headers }),
      ];
      if (['COUNSELLOR', 'SUPER_ADMIN'].includes(roleCode)) requests.push(fetch(`${API_BASE}/api/counselling/sessions`, { headers }));
      const [statsRes, studentsRes, proctorsRes, issuesRes, meetingsRes, counsellingRes] = await Promise.all(requests);

      if (statsRes.ok) setStats(await statsRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (proctorsRes.ok) setProctors(await proctorsRes.json());
      if (issuesRes.ok) setInterventions(await issuesRes.json());
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      if (counsellingRes?.ok) setCounsellingSessions(await counsellingRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const viewProctorFile = async (studentId: string) => {
    if (!token) return;
    setLoadingProctorFile(true);
    try {
      const res = await fetch(`${API_BASE}/api/students/${studentId}/proctor-file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProctorFile(data);
      setSelectedStudent(data.student);
    } catch (err) {
      console.error('Error loading proctor file:', err);
    } finally {
      setLoadingProctorFile(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/proctors/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reassignData),
      });
      if (res.ok) {
        alert('Proctor reassigned successfully with full audit trail preserved!');
        setReassignModalOpen(false);
        fetchData(token);
        if (selectedStudent) viewProctorFile(selectedStudent.id);
      }
    } catch (err) {
      alert('Failed to reassign proctor.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !token) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch(`${API_BASE}/api/reports/import-preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
    } catch (err) {
      alert('Error validating file upload');
    } finally {
      setUploading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.usn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-500">Restoring your session…</div>;

  if (!token || !currentUser) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-600 text-xl font-bold text-white">M</div>
            <div><h1 className="text-xl font-extrabold tracking-tight">Mentor360</h1><p className="text-sm text-slate-500">Student mentoring platform</p></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in with your institution account.</p>
          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
              <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="you@institution.edu" />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" placeholder="Enter your password" />
            </div>
            {authError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{authError}</p>}
            <button disabled={signingIn} type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60">
              <LockKeyhole className="h-4 w-4" />{signingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Your access is secured by your institution account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Application header */}
      <header className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 sticky top-0 z-40">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">Mentor360</span>
                <span className="text-xs bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded border border-sky-400/30">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {currentUser.institutionName || 'Institution workspace'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-white">{currentUser.fullName || currentUser.full_name}</p>
              <p className="text-[11px] text-sky-400 font-medium">{currentUser.roleCode || currentUser.role_code}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-sky-700 text-sky-100 flex items-center justify-center font-bold text-xs">
              {(currentUser.fullName || currentUser.full_name || currentUser.email || 'U')[0]}
            </div>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800" aria-label="Sign out">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-[61px] z-30">
        <div className="w-full px-6 flex space-x-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Overview', icon: TrendingUp },
            { id: 'students', label: 'Students & Proctor Book', icon: GraduationCap },
            { id: 'proctors', label: 'Proctor Allocations', icon: Users },
            { id: 'meetings', label: 'Mentoring Meetings', icon: Calendar },
            { id: 'interventions', label: 'Concerns & Interventions', icon: AlertTriangle },
            { id: 'counselling', label: 'Confidential Counselling', icon: ShieldCheck, restricted: !['COUNSELLOR', 'SUPER_ADMIN'].includes(currentUser.roleCode || currentUser.role_code) },
            { id: 'import', label: 'Bulk Marks Import', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            if (tab.restricted) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <main className="w-full px-6 py-8 flex-1">
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Institutional Proctoring & Mentoring Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">A live view of student mentoring and support activity.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Workspace
              </span>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <button
                onClick={() => setActiveTab('students')}
                className="text-left bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-sky-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-sky-600 transition">Total Enrolled</span>
                  <GraduationCap className="w-5 h-5 text-sky-500" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalStudents ?? 0}</p>
                <span className="text-xs text-slate-500 font-medium">Students in this workspace</span>
              </button>

              <button
                onClick={() => setActiveTab('proctors')}
                className="text-left bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-indigo-600 transition">Faculty Mentors</span>
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalFaculty ?? 0}</p>
                <span className="text-xs text-slate-500 font-medium">Faculty mentors</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className="text-left bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm hover:border-rose-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-rose-600">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-rose-700 transition">Attendance &lt; 75%</span>
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <p className="text-3xl font-extrabold text-rose-700 mt-2">{stats?.attendanceShortages ?? 0}</p>
                <span className="text-xs text-rose-600 font-medium">Action Plans Triggered</span>
              </button>

              <button
                onClick={() => setActiveTab('interventions')}
                className="text-left bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm hover:border-amber-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-amber-600">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-700 transition">Open Concerns</span>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-3xl font-extrabold text-amber-700 mt-2">{stats?.openConcerns ?? 0}</p>
                <span className="text-xs text-amber-700 font-medium">Under active follow-up</span>
              </button>

              <button
                onClick={() => setActiveTab('meetings')}
                className="text-left bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-emerald-600 transition">Mentoring Logs</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.completedMeetings ?? 0}</p>
                <span className="text-xs text-slate-500 font-medium">Recorded mentoring meetings</span>
              </button>
            </div>

            {/* Recent Alerts & Student Quick Access */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Student directory</h2>
                  <button onClick={() => setActiveTab('students')} className="text-xs font-semibold text-sky-600 hover:underline">
                    View all students &rarr;
                  </button>
                </div>
                <div className="space-y-3">
                  {students.slice(0, 4).map((student) => (
                    <button key={student.id} onClick={() => viewProctorFile(student.id)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50/40">
                      <span><span className="block text-sm font-semibold text-slate-900">{student.full_name}</span><span className="mt-1 block text-xs text-slate-500">{student.usn || 'No student number'}</span></span>
                      <span className="text-xs font-semibold text-sky-700">Open record <ChevronRight className="ml-1 inline h-4 w-4" /></span>
                    </button>
                  ))}
                  {students.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No students are available for this account.</p>}
                </div>
              </div>

              {/* Proctor Workload Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4">Mentor Workload Balance</h2>
                <div className="space-y-4">
                  {proctors.map((p) => (
                    <div key={p.faculty_id} className="border border-slate-100 p-3 rounded-lg bg-slate-50">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span>{p.faculty_name}</span>
                        <span className="text-xs text-sky-600">{p.active_mentees_count} / {p.max_mentees} Mentees</span>
                      </div>
                      <p className="text-xs text-slate-500">{p.designation} • {p.department_code}</p>
                      <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-sky-500 h-2 rounded-full"
                          style={{ width: `${p.max_mentees ? Math.min(100, (p.active_mentees_count / p.max_mentees) * 100) : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENTS & DIGITAL PROCTOR BOOK */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Digital Student Success Records (Proctor Files)</h1>
                <p className="text-sm text-slate-500">
                  Consolidated academic performance, internal assessments, attendance, and mentoring continuity.
                </p>
              </div>

              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by Name or USN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">USN</th>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Semester & Sec</th>
                    <th className="px-6 py-3.5">Assigned Proctor</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-mono font-bold text-sky-700">{s.usn}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{s.full_name}</td>
                      <td className="px-6 py-4 text-slate-600">{s.department_code}</td>
                      <td className="px-6 py-4 text-slate-600">Sem {s.current_semester} - {s.current_section}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{s.mentor_name || 'Unassigned'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => viewProctorFile(s.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs border border-sky-200 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Proctor File
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PROCTOR ALLOCATIONS */}
        {activeTab === 'proctors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Proctor Allocation & Workload Management</h1>
                <p className="text-sm text-slate-500">Balance student mentoring quotas and manage historical faculty reassignments.</p>
              </div>
              <button
                onClick={() => setReassignModalOpen(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 flex items-center gap-2 shadow-sm"
              >
                <ArrowRightLeft className="w-4 h-4" /> Reassign Student Proctor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proctors.map((p) => (
                <div key={p.faculty_id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{p.faculty_name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{p.designation} • Dept of {p.department_code}</p>
                      <p className="text-xs text-sky-600 mt-1">{p.faculty_email}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 font-bold rounded-md bg-slate-100 text-slate-700">
                      ID: {p.employee_id}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                      <span>Mentee Capacity</span>
                      <span>{p.active_mentees_count} / {p.max_mentees} Students</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${(p.active_mentees_count / p.max_mentees) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Mentees:</p>
                    <div className="flex flex-wrap gap-2">
                      {students
                        .filter((s) => s.faculty_id === p.faculty_id)
                        .map((s) => (
                          <span
                            key={s.id}
                            onClick={() => viewProctorFile(s.id)}
                            className="cursor-pointer text-xs font-medium px-2.5 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                          >
                            {s.full_name} ({s.usn})
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MENTORING MEETINGS */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Mentoring Sessions & Meeting Logs</h1>
                <p className="text-sm text-slate-500">
                  Track schedule, student attendance, discussion notes, and proactive follow-ups.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meetings.length === 0 ? (
                <div className="col-span-2 bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                  No mentoring meetings recorded yet.
                </div>
              ) : (
                meetings.map((m) => (
                  <div key={m.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">
                          {m.meeting_type}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 mt-1">{m.title}</h3>
                        <p className="text-xs text-slate-500">
                          Mentor: <strong className="text-slate-700">{m.mentor_name}</strong>
                        </p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 font-bold rounded-full ${
                        m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p><strong>Scheduled:</strong> {new Date(m.scheduled_at).toLocaleString()}</p>
                      <p><strong>Venue:</strong> {m.venue}</p>
                      {m.general_remarks && <p><strong>Remarks:</strong> {m.general_remarks}</p>}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        Attendance: <strong>{m.present_count ?? 0} / {m.total_students ?? 0} Students</strong>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CONCERNS & INTERVENTIONS */}
        {activeTab === 'interventions' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Student Risk & Intervention Management</h1>
              <p className="text-sm text-slate-500">Track academic drop-offs, attendance shortages, action plans, and resolution outcomes.</p>
            </div>

            <div className="space-y-4">
              {interventions.map((issue) => (
                <div key={issue.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        issue.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {issue.severity} RISK
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {issue.category}
                      </span>
                      <h3 className="font-bold text-base text-slate-900">{issue.title}</h3>
                    </div>
                    <span className="text-xs px-2.5 py-1 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Status: {issue.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{issue.description}</p>

                  <div className="flex items-center gap-6 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>
                      Student:{' '}
                      <button
                        type="button"
                        onClick={() => viewProctorFile(issue.student_id)}
                        className="font-bold text-sky-600 hover:underline hover:text-sky-800 transition"
                      >
                        {issue.student_name} ({issue.usn})
                      </button>
                    </span>
                    <span>Logged By: <strong className="text-slate-800">{issue.raised_by_name}</strong></span>
                    <span>Action Plans Active: <strong className="text-slate-800">{issue.total_action_plans}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CONFIDENTIAL COUNSELLING (STRICT ZERO-LEAK ACL) */}
        {activeTab === 'counselling' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong className="font-bold">Confidential records:</strong> Only counsellors and super administrators can access this area. Opening an individual record is audit logged.
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Counselling sessions</h2>
              {counsellingSessions.length ? counsellingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div><p className="text-sm font-semibold text-slate-900">{session.student_name} <span className="font-normal text-slate-500">({session.usn})</span></p><p className="mt-1 text-xs text-slate-500">Counsellor: {session.counsellor_name || 'Assigned counsellor'}</p></div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{session.general_status || 'OPEN'}</span>
                </div>
              )) : <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No counselling sessions are recorded.</p>}
            </div>
          </div>
        )}

        {/* TAB 6: BULK MARKS EXCEL IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bulk Academic Marks & Attendance Import Engine</h1>
              <p className="text-sm text-slate-500">
                Upload institutional Excel spreadsheets (.xlsx) with automated row-level validation, VTU IA calculation rules, and preview error logs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 text-center hover:border-sky-500 transition">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-base text-slate-900">Upload Academic Marks Excel Spreadsheet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                File must include columns: <code>USN</code>, <code>SubjectCode</code>, <code>Semester</code>, <code>IA1</code> (0-50), <code>IA2</code> (0-50), and <code>VTU_External</code>.
              </p>

              <label className="mt-4 inline-block px-5 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-semibold cursor-pointer hover:bg-sky-700 transition shadow-sm">
                {uploading ? 'Validating Workbook...' : 'Select .xlsx Spreadsheet'}
                <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {importResult && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Validation Pre-flight Summary</h3>
                    {importResult.file && (
                      <p className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Spreadsheet stored into database (File ID: {importResult.file.id.slice(0, 8)}...)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      Valid Rows: {importResult.validCount}
                    </span>
                    <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                      Error Rows: {importResult.errorCount}
                    </span>
                  </div>
                </div>

                {importResult.validPreview?.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">USN</th>
                          <th className="p-2">Subject</th>
                          <th className="p-2">Sem</th>
                          <th className="p-2">IA 1</th>
                          <th className="p-2">IA 2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importResult.validPreview.map((r: any) => (
                          <tr key={r.rowNumber}>
                            <td className="p-2 text-slate-400">{r.rowNumber}</td>
                            <td className="p-2 font-mono font-bold text-sky-700">{r.usn}</td>
                            <td className="p-2">{r.subjectCode}</td>
                            <td className="p-2">{r.semester}</td>
                            <td className="p-2">{r.ia1 ?? '-'}</td>
                            <td className="p-2">{r.ia2 ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FULL DIGITAL PROCTOR FILE MODAL */}
      {proctorFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white rounded-t-2xl flex justify-between items-start sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-extrabold text-xl shadow">
                  {proctorFile.student.full_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{proctorFile.student.full_name}</h2>
                    <span className="text-xs bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-400/30">
                      {proctorFile.student.usn}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {proctorFile.student.programme_name} • Sem {proctorFile.student.current_semester} ({proctorFile.student.current_section})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProctorFile(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body: 360-degree Student Success Sections */}
            <div className="p-6 space-y-6">
              {/* Mentor & Guardian Info Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 text-xs space-y-1">
                  <span className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">Assigned Faculty Proctor</span>
                  <p className="font-bold text-sm text-slate-900">{proctorFile.currentMentor?.mentor_name || 'Not Allocated'}</p>
                  <p className="text-slate-600">{proctorFile.currentMentor?.designation}</p>
                  <p className="text-slate-500 font-mono">{proctorFile.currentMentor?.mentor_email}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Verified Parent / Guardian</span>
                  <p className="font-bold text-sm text-slate-900">{proctorFile.guardians?.[0]?.name || 'Not Linked'}</p>
                  <p className="text-slate-600">Relation: {proctorFile.guardians?.[0]?.relation} • Phone: {proctorFile.guardians?.[0]?.phone}</p>
                  <p className="text-slate-500 font-mono">{proctorFile.guardians?.[0]?.email}</p>
                </div>
              </div>

              {/* Academic Marks & Attendance Matrix */}
              <div>
                <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600" /> Academic Marks (IA & VTU Examination)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Subject Code</th>
                        <th className="p-3">Subject Title</th>
                        <th className="p-3">IA 1 (/50)</th>
                        <th className="p-3">IA 2 (/50)</th>
                        <th className="p-3">Avg IA (/50)</th>
                        <th className="p-3">Attendance %</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proctorFile.marks?.map((m: any, idx: number) => {
                        const att = proctorFile.attendance?.find((a: any) => a.subject_id === m.subject_id);
                        return (
                          <tr key={m.id || idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-800">{m.subject_code}</td>
                            <td className="p-3 font-medium text-slate-900">{m.subject_name}</td>
                            <td className="p-3 font-mono">{m.ia1_marks ?? '-'}</td>
                            <td className="p-3 font-mono">{m.ia2_marks ?? '-'}</td>
                            <td className="p-3 font-mono font-bold text-sky-700">{m.avg_ia_marks ?? '-'}</td>
                            <td className="p-3 font-mono font-bold">
                              <span className={att?.is_shortage ? 'text-rose-600' : 'text-emerald-700'}>
                                {att ? `${att.percentage}%` : '-'}
                              </span>
                            </td>
                            <td className="p-3">
                              {att?.is_shortage ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                  SHORTAGE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  REGULAR
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mentoring Meeting History */}
              <div>
                <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Mentoring Discussions & Meeting History
                </h3>
                <div className="space-y-3">
                  {proctorFile.mentoringHistory?.length > 0 ? (
                    proctorFile.mentoringHistory.map((m: any) => (
                      <div key={m.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-sm text-slate-900">{m.title}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            {m.attendance_status}
                          </span>
                        </div>
                        <p className="text-slate-700"><strong>Discussion:</strong> {m.discussion_notes}</p>
                        <p className="text-slate-500"><strong>Conducted By:</strong> {m.conducted_by_name} • Venue: {m.venue}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No previous mentoring meetings recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Student Development, Goals & Certifications */}
              {proctorFile.development && (
                <div>
                  <h3 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Student Development, Goals & Certifications
                  </h3>

                  {/* Certifications with credential links */}
                  {proctorFile.development.certificates?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Earned Certifications:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {proctorFile.development.certificates.map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900">{c.title}</span>
                              {c.verified && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                  VERIFIED
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500">Issuer: {c.issuing_org} • {new Date(c.issue_date).toLocaleDateString()}</p>
                            {c.certificate_url && (
                              <a
                                href={c.certificate_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold pt-1 text-[11px] transition"
                              >
                                View Verified Certificate <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goals */}
                  {proctorFile.development.goals?.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Development Goals:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {proctorFile.development.goals.map((g: any) => (
                          <div key={g.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs space-y-1.5">
                            <div className="flex justify-between font-semibold">
                              <span>{g.title}</span>
                              <span className="text-sky-600 font-bold">{g.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-500 h-2 rounded-full transition-all"
                                style={{ width: `${g.progress_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* In-Database Stored Documents & Attachments */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600" /> Stored Student Documents (Local Database)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Files are securely stored directly in PostgreSQL (BYTEA) without cloud storage dependencies.
                    </p>
                  </div>

                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold border border-sky-200 transition shadow-xs">
                    <Upload className="w-3.5 h-3.5" /> Upload File to Database
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !token || !proctorFile?.student?.id) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('category', 'CERTIFICATE');
                        fd.append('title', file.name);
                        try {
                          const res = await fetch(`${API_BASE}/api/students/${proctorFile.student.id}/documents`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd,
                          });
                          if (res.ok) {
                            alert('File successfully saved into the local database!');
                            viewProctorFile(proctorFile.student.id);
                          } else {
                            alert('Failed to store document in database.');
                          }
                        } catch (err) {
                          alert('Error connecting to API server.');
                        }
                      }}
                    />
                  </label>
                </div>

                {proctorFile.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {proctorFile.documents.map((doc: any) => (
                      <div key={doc.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-900">{doc.title}</span>
                          <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded border border-sky-200">
                            {doc.category}
                          </span>
                        </div>
                        <p className="text-slate-500">
                          {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'Binary Blob'} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <a
                            href={`${API_BASE}${doc.file_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold text-[11px] transition"
                          >
                            View File <ExternalLink className="w-3 h-3" />
                          </a>
                          <a
                            href={`${API_BASE}${doc.file_url}/download`}
                            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800 font-medium text-[11px] transition"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/40">
                    No documents stored in the database for this student yet. Click "Upload File to Database" to attach marks cards, Aadhar, or certificates.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setProctorFile(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
              >
                Close Digital Proctor File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN PROCTOR MODAL */}
      {reassignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Reassign Student Proctor</h3>
              <button onClick={() => setReassignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassign} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Student</label>
                <select
                  required
                  value={reassignData.studentId}
                  onChange={(e) => setReassignData({ ...reassignData, studentId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.usn})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Faculty Proctor</label>
                <select
                  required
                  value={reassignData.newFacultyId}
                  onChange={(e) => setReassignData({ ...reassignData, newFacultyId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="">-- Choose Faculty --</option>
                  {proctors.map((p) => (
                    <option key={p.faculty_id} value={p.faculty_id}>{p.faculty_name} ({p.department_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Reassignment (Audit Trail)</label>
                <textarea
                  required
                  placeholder="e.g. End-of-semester batch rotation, workload rebalancing, or student request."
                  value={reassignData.reason}
                  onChange={(e) => setReassignData({ ...reassignData, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md h-20"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
