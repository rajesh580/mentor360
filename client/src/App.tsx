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
  UserPlus,
  Layers,
  Send,
  BarChart3,
  Settings,
  ShieldAlert,
  Download,
  UserX,
  KeyRound,
  Activity,
  PlusCircle,
  Filter,
  MessageSquare,
  Bell,
  ChevronDown,
  Menu,
  Sparkles,
} from 'lucide-react';

// API base URL configuration: uses Vite proxy in dev (/api) or custom VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || '';

const USER_ROLE_OPTIONS = [
  ['UNIVERSITY_ADMIN', 'University Administrator'],
  ['INSTITUTION_ADMIN', 'Institution Administrator'],
  ['PRINCIPAL', 'Principal / Director'],
  ['DEAN', 'Dean Academics'],
  ['HOD', 'Head of Department (HOD)'],
  ['PROCTOR_COORDINATOR', 'Proctor Coordinator'],
  ['PROCTOR', 'Faculty / Proctor / Mentor'],
  ['COUNSELLOR', 'Student Counsellor'],
  ['STUDENT', 'Student'],
  ['PARENT', 'Parent / Guardian'],
  ['PLACEMENT_OFFICER', 'Placement Officer'],
  ['IQAC_ADMIN', 'IQAC / Accreditation Admin'],
  ['SUPER_ADMIN', 'Super Administrator'],
];

type ActiveTabType =
  | 'dashboard'
  | 'students'
  | 'proctors'
  | 'meetings'
  | 'interventions'
  | 'counselling'
  | 'import'
  | 'users'
  | 'institution'
  | 'communication'
  | 'analytics';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Core Data states
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
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [studentSemFilter, setStudentSemFilter] = useState('');

  // Modals state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignData, setReassignData] = useState({ studentId: '', newFacultyId: '', reason: '' });

  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    usn: '',
    fullName: '',
    email: '',
    phone: '',
    departmentId: '',
    currentSemester: 1,
    currentSection: 'A',
    guardianName: '',
    guardianRelation: 'Father',
    guardianPhone: '',
  });

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    targetGroup: 'ATTENDANCE_SHORTAGE',
    departmentId: '',
    semester: '',
    channel: 'SMS',
    subject: 'Urgent: Student Attendance Shortage Notification',
    message: 'Dear Parent, this is an official notification from the Proctoring Office regarding your ward\'s attendance shortage below 75%. Please contact the proctor immediately.',
  });

  // Import preview state
  const [importResult, setImportResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // User Management state
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [managedInstitutions, setManagedInstitutions] = useState<any[]>([]);
  const [managedInstitutionId, setManagedInstitutionId] = useState('');
  const [usersRefresh, setUsersRefresh] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState('');
  const [userNotice, setUserNotice] = useState('');
  const [userFilterRole, setUserFilterRole] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [usersSubTab, setUsersSubTab] = useState<'accounts' | 'audit'>('accounts');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    roleCode: 'PROCTOR',
    departmentId: '',
    designation: 'Assistant Professor',
  });

  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Institutional Structure state
  const [structure, setStructure] = useState<any>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [newDeptModalOpen, setNewDeptModalOpen] = useState(false);
  const [newDeptData, setNewDeptData] = useState({ code: '', name: '' });
  const [newAyModalOpen, setNewAyModalOpen] = useState(false);
  const [newAyData, setNewAyData] = useState({ name: '', startDate: '', endDate: '', isCurrent: true });
  const [newProgModalOpen, setNewProgModalOpen] = useState(false);
  const [newProgData, setNewProgData] = useState({ departmentId: '', code: '', name: '', degreeLevel: 'UG', totalSemesters: 8 });
  const [newBatchModalOpen, setNewBatchModalOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({ programmeId: '', name: '', admissionYear: new Date().getFullYear(), graduationYear: new Date().getFullYear() + 4 });

  // Institutional Communication Logs state
  const [parentLogs, setParentLogs] = useState<any[]>([]);
  const [parentLogsLoading, setParentLogsLoading] = useState(false);
  const [commChannelFilter, setCommChannelFilter] = useState('');
  const [commSearchTerm, setCommSearchTerm] = useState('');

  // Analytics & Accreditation State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Header Omnibar, Quick Actions, Popovers & Mobile Navigation
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: '1', title: 'VTU Exam Schedule Announced', message: 'VTU Odd Semester Examination timetable has been uploaded for 2024-25.', time: '10m ago', unread: true },
    { id: '2', title: 'Attendance Shortage Trigger', message: '4 students in Semester 5 CSE attendance fallen below 75%. Action plan required.', time: '1h ago', unread: true },
    { id: '3', title: 'Bi-Weekly Mentoring Review', message: 'Cycle review due this Friday for all assigned proctor groups.', time: '3h ago', unread: false },
  ]);

  const userRole = currentUser?.roleCode || currentUser?.role_code;
  const isHighAdmin = ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PRINCIPAL'].includes(userRole);
  const isAdminRole = ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'PRINCIPAL', 'HOD', 'PROCTOR_COORDINATOR'].includes(userRole);

  // Omnibar keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) {
          input.focus();
          setGlobalSearchFocused(true);
        }
      }
      if (e.key === 'Escape') {
        setGlobalSearchFocused(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setQuickActionsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Restore existing session
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
    setPassword('');
    setAuthError('');
    setStats(null);
    setStudents([]);
    setProctors([]);
    setMeetings([]);
    setInterventions([]);
    setCounsellingSessions([]);
    setManagedUsers([]);
    setStructure(null);
    setParentLogs([]);
    setAnalyticsData([]);
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
      if (['COUNSELLOR', 'SUPER_ADMIN'].includes(roleCode)) {
        requests.push(fetch(`${API_BASE}/api/counselling/sessions`, { headers }));
      }
      const [statsRes, studentsRes, proctorsRes, issuesRes, meetingsRes, counsellingRes] = await Promise.all(requests);

      if (statsRes.ok) setStats(await statsRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (proctorsRes.ok) setProctors(await proctorsRes.json());
      if (issuesRes.ok) setInterventions(await issuesRes.json());
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      if (counsellingRes?.ok) setCounsellingSessions(await counsellingRes.json());

      // Fetch institutional structure in background for filters and modals
      fetch(`${API_BASE}/api/institution/structure`, { headers })
        .then((r) => {
          if (r.ok) r.json().then(setStructure);
        })
        .catch(() => {});
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // Load Users tab data
  useEffect(() => {
    if (activeTab !== 'users' || !token) return;
    const loadUsers = async () => {
      setUsersLoading(true);
      setUserError('');
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if ((currentUser?.roleCode || currentUser?.role_code) === 'SUPER_ADMIN') {
          if (!managedInstitutions.length) {
            const institutionsRes = await fetch(`${API_BASE}/api/users/institutions`, { headers });
            const institutions = await institutionsRes.json();
            if (!institutionsRes.ok) throw new Error(institutions.error || 'Could not load institutions.');
            setManagedInstitutions(institutions);
            if (institutions[0]?.id) setManagedInstitutionId(institutions[0].id);
            return;
          }
          if (!managedInstitutionId) return;
          headers['x-institution-id'] = managedInstitutionId;
        }

        const queryParams = new URLSearchParams();
        if (userFilterRole) queryParams.set('role', userFilterRole);
        if (userFilterStatus) queryParams.set('status', userFilterStatus);
        if (userSearchTerm) queryParams.set('search', userSearchTerm);

        const response = await fetch(`${API_BASE}/api/users?${queryParams.toString()}`, { headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load users.');
        setManagedUsers(data);
      } catch (error: any) {
        setUserError(error.message || 'Could not connect to user service.');
      } finally {
        setUsersLoading(false);
      }
    };
    void loadUsers();
  }, [activeTab, token, currentUser, managedInstitutionId, managedInstitutions.length, usersRefresh, userFilterRole, userFilterStatus, userSearchTerm]);

  // Load Audit logs
  useEffect(() => {
    if (activeTab !== 'users' || usersSubTab !== 'audit' || !token) return;
    const loadAudit = async () => {
      setAuditLoading(true);
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        if (managedInstitutionId) headers['x-institution-id'] = managedInstitutionId;
        const res = await fetch(`${API_BASE}/api/users/audit-logs`, { headers });
        if (res.ok) setAuditLogs(await res.json());
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setAuditLoading(false);
      }
    };
    void loadAudit();
  }, [activeTab, usersSubTab, token, managedInstitutionId, usersRefresh]);

  // Load Structure tab data
  useEffect(() => {
    if (activeTab !== 'institution' || !token) return;
    const loadStructure = async () => {
      setStructureLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/institution/structure`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setStructure(await res.json());
      } catch (err) {
        console.error('Failed to load institution structure:', err);
      } finally {
        setStructureLoading(false);
      }
    };
    void loadStructure();
  }, [activeTab, token]);

  // Load Parent Communication logs
  useEffect(() => {
    if (activeTab !== 'communication' || !token) return;
    const loadParentLogs = async () => {
      setParentLogsLoading(true);
      try {
        const params = new URLSearchParams();
        if (commChannelFilter) params.set('channel', commChannelFilter);
        if (commSearchTerm) params.set('search', commSearchTerm);

        const res = await fetch(`${API_BASE}/api/communication/all-logs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setParentLogs(await res.json());
      } catch (err) {
        console.error('Failed to load parent logs:', err);
      } finally {
        setParentLogsLoading(false);
      }
    };
    void loadParentLogs();
  }, [activeTab, token, commChannelFilter, commSearchTerm]);

  // Load Analytics tab data
  useEffect(() => {
    if ((activeTab !== 'analytics' && activeTab !== 'dashboard') || !token) return;
    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/reports/institutional-analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setAnalyticsData(await res.json());
      } catch (err) {
        console.error('Failed to load institutional analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
  }, [activeTab, token]);

  // User Actions
  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setUserSaving(true);
    setUserError('');
    setUserNotice('');
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      if ((currentUser?.roleCode || currentUser?.role_code) === 'SUPER_ADMIN') headers['x-institution-id'] = managedInstitutionId;
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create account.');
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        roleCode: 'PROCTOR',
        departmentId: '',
        designation: 'Assistant Professor',
      });
      setUserNotice(`Account created successfully for ${data.user.full_name}. Temporary password set.`);
      setUsersRefresh((v) => v + 1);
      fetchData(token);
    } catch (error: any) {
      setUserError(error.message || 'Could not connect to user service.');
    } finally {
      setUserSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsersRefresh((v) => v + 1);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update user status.');
      }
    } catch (err) {
      alert('Error updating user status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !resetTargetUser || !newTempPassword) return;
    setResetSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/${resetTargetUser.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newTempPassword }),
      });
      if (res.ok) {
        alert(`Password for ${resetTargetUser.full_name} has been reset successfully!`);
        setResetPasswordModalOpen(false);
        setResetTargetUser(null);
        setNewTempPassword('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reset password.');
      }
    } catch (err) {
      alert('Error resetting password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Student Actions
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudentData),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Student ${data.student.full_name} (${data.student.usn}) registered successfully!`);
        setAddStudentModalOpen(false);
        setNewStudentData({
          usn: '',
          fullName: '',
          email: '',
          phone: '',
          departmentId: '',
          currentSemester: 1,
          currentSection: 'A',
          guardianName: '',
          guardianRelation: 'Father',
          guardianPhone: '',
        });
        fetchData(token);
      } else {
        alert(data.error || 'Failed to register student.');
      }
    } catch (err) {
      alert('Error registering student.');
    }
  };

  const handleToggleStudentStatus = async (studentId: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'GRADUATED' : 'ACTIVE';
    try {
      const res = await fetch(`${API_BASE}/api/students/${studentId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchData(token);
      } else {
        alert('Failed to update student status.');
      }
    } catch (err) {
      alert('Error updating student status.');
    }
  };

  // Communication Actions
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/communication/broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Broadcast alert dispatched successfully!');
        setBroadcastModalOpen(false);
        if (activeTab === 'communication') {
          const params = new URLSearchParams();
          if (commChannelFilter) params.set('channel', commChannelFilter);
          fetch(`${API_BASE}/api/communication/all-logs?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => {
            if (r.ok) r.json().then(setParentLogs);
          });
        }
      } else {
        alert(data.error || 'Failed to dispatch broadcast notice.');
      }
    } catch (err) {
      alert('Error dispatching broadcast.');
    }
  };

  // Institutional Structure Actions
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/institution/departments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeptData),
      });
      if (res.ok) {
        alert('Department created successfully!');
        setNewDeptModalOpen(false);
        setNewDeptData({ code: '', name: '' });
        fetch(`${API_BASE}/api/institution/structure`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => {
            if (r.ok) r.json().then(setStructure);
          });
      }
    } catch (err) {
      alert('Failed to create department.');
    }
  };

  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/institution/academic-years`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newAyData),
      });
      if (res.ok) {
        alert('Academic Year recorded!');
        setNewAyModalOpen(false);
        setNewAyData({ name: '', startDate: '', endDate: '', isCurrent: true });
        fetch(`${API_BASE}/api/institution/structure`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => {
            if (r.ok) r.json().then(setStructure);
          });
      }
    } catch (err) {
      alert('Failed to create academic year.');
    }
  };

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/institution/programmes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgData),
      });
      if (res.ok) {
        alert('Programme created successfully!');
        setNewProgModalOpen(false);
        setNewProgData({ departmentId: '', code: '', name: '', degreeLevel: 'UG', totalSemesters: 8 });
        fetch(`${API_BASE}/api/institution/structure`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => {
            if (r.ok) r.json().then(setStructure);
          });
      }
    } catch (err) {
      alert('Failed to create programme.');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/institution/batches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newBatchData),
      });
      if (res.ok) {
        alert('Batch created successfully!');
        setNewBatchModalOpen(false);
        setNewBatchData({ programmeId: '', name: '', admissionYear: new Date().getFullYear(), graduationYear: new Date().getFullYear() + 4 });
        fetch(`${API_BASE}/api/institution/structure`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => {
            if (r.ok) r.json().then(setStructure);
          });
      }
    } catch (err) {
      alert('Failed to create batch.');
    }
  };

  // Export Accreditation CSV Helper
  const handleExportAccreditation = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/export-accreditation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data || !data.length) {
        alert('No accreditation records available for export.');
        return;
      }
      const headers = ['USN', 'Student Name', 'Department', 'Semester', 'Section', 'Assigned Mentor', 'Designation', 'Allocation Date', 'Attendance Shortage (<75%)', 'Active Concerns', 'Meetings Attended'];
      const rows = data.map((d: any) => [
        `"${d.usn}"`,
        `"${d.student_name}"`,
        `"${d.department}"`,
        d.current_semester,
        `"${d.current_section}"`,
        `"${d.mentor_name || 'Unassigned'}"`,
        `"${d.mentor_designation || '-'}"`,
        `"${d.allocated_date || '-'}"`,
        d.has_attendance_shortage ? 'YES (<75%)' : 'NO',
        d.active_concerns,
        d.mentoring_meetings_attended,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Mentor360_Accreditation_Proctoring_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export accreditation data.');
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

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.usn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !studentDeptFilter || s.department_code === studentDeptFilter;
    const matchesSem = !studentSemFilter || String(s.current_semester) === studentSemFilter;
    return matchesSearch && matchesDept && matchesSem;
  });

  const matchingStudents = globalSearch.trim().length > 1
    ? students.filter((s) =>
        s.full_name?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        s.usn?.toLowerCase().includes(globalSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  const matchingProctors = globalSearch.trim().length > 1
    ? proctors.filter((p) =>
        p.faculty_name?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        p.employee_id?.toLowerCase().includes(globalSearch.toLowerCase())
      ).slice(0, 3)
    : [];

  const navTabs = [
    { id: 'dashboard', label: 'Overview', icon: TrendingUp },
    { id: 'students', label: 'Students', icon: GraduationCap, badge: students.length },
    { id: 'proctors', label: 'Proctor Allocations', icon: Users, badge: proctors.length },
    { id: 'meetings', label: 'Mentoring Meetings', icon: Calendar, badge: stats?.completedMeetings },
    { id: 'interventions', label: 'Concerns & Risks', icon: AlertTriangle, badge: stats?.openConcerns, badgeAlert: Number(stats?.openConcerns) > 0 },
    { id: 'communication', label: 'Parent Communication', icon: MessageSquare, badge: parentLogs.length, restricted: !isAdminRole && userRole !== 'PROCTOR' },
    { id: 'institution', label: 'Academic Setup', icon: Building2, badge: structure?.departments?.length, restricted: !isAdminRole },
    { id: 'users', label: 'Users & RBAC', icon: UserPlus, badge: managedUsers.length, restricted: !isHighAdmin },
    { id: 'analytics', label: 'Accreditation Analytics', icon: BarChart3, restricted: !isAdminRole && userRole !== 'IQAC_ADMIN' },
    { id: 'import', label: 'Marks Import', icon: FileSpreadsheet, restricted: !isAdminRole },
    { id: 'counselling', label: 'Confidential Counselling', icon: ShieldCheck, restricted: !['COUNSELLOR', 'SUPER_ADMIN'].includes(userRole) },
  ];

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-500">Restoring your session…</div>;
  }

  if (!token || !currentUser) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-600 text-xl font-bold text-white shadow-md">M</div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Mentor360</h1>
              <p className="text-sm text-slate-500">Higher Education Mentoring & Proctoring</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Institutional Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in with your role-authorized credentials.</p>
          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="principal@svit.edu.in"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Enter your password"
              />
            </div>
            {authError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{authError}</p>}
            <button
              disabled={signingIn}
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60 shadow-sm"
            >
              <LockKeyhole className="h-4 w-4" />{signingIn ? 'Signing in…' : 'Sign in to Workspace'}
            </button>
          </form>
          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Demo Institution Accounts:</p>
            <p className="mt-1">Principal / Admin: <code className="text-sky-700">principal@svit.edu.in</code></p>
            <p>HOD CSE: <code className="text-sky-700">hod.cse@svit.edu.in</code></p>
            <p>Mentor: <code className="text-sky-700">mentor.ramesh@svit.edu.in</code></p>
            <p>Password: <code className="text-slate-800">Password@123</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      {/* Backdrop overlay dismisser for open popovers */}
      {(globalSearchFocused || notificationsOpen || userMenuOpen || quickActionsOpen) && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => {
            setGlobalSearchFocused(false);
            setNotificationsOpen(false);
            setUserMenuOpen(false);
            setQuickActionsOpen(false);
          }}
        />
      )}

      {/* Top Application Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Identity */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-base text-white shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Mentor360</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  VTU Affiliate
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[170px] sm:max-w-none">
                <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" /> {currentUser.institutionName || 'SVIT Bangalore'}
              </p>
            </div>
          </div>

          {/* Center: Global Command Omnibar Search (desktop / tablet) */}
          <div className="relative hidden md:block flex-1 max-w-md mx-2 lg:mx-6 z-40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="global-search-input"
                type="text"
                placeholder="Search USN, student name, or mentor... (Ctrl + K)"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setGlobalSearchFocused(true);
                }}
                onFocus={() => setGlobalSearchFocused(true)}
                className="w-full pl-9 pr-14 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
              <kbd className="absolute right-2.5 top-2 pointer-events-none text-[10px] font-mono text-slate-400 bg-slate-700/70 px-1.5 py-0.5 rounded border border-slate-600">
                ⌘K
              </kbd>
            </div>

            {/* Instant Omnibar Search Dropdown */}
            {globalSearchFocused && globalSearch.trim().length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 text-xs">
                <div className="p-2 border-b border-slate-800 flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Matches for "{globalSearch}"</span>
                  <button
                    onClick={() => {
                      setGlobalSearchFocused(false);
                      setGlobalSearch('');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 p-1">
                  {matchingStudents.length > 0 && (
                    <div className="p-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">Students</span>
                      {matchingStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            viewProctorFile(s.id);
                            setGlobalSearch('');
                            setGlobalSearchFocused(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition"
                        >
                          <div>
                            <span className="font-semibold block">{s.full_name}</span>
                            <span className="text-[11px] font-mono text-sky-400">{s.usn} • {s.department_code} Sem {s.current_semester}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">View File &rarr;</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchingProctors.length > 0 && (
                    <div className="p-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">Faculty Mentors</span>
                      {matchingProctors.map((p) => (
                        <button
                          key={p.faculty_id}
                          onClick={() => {
                            setActiveTab('proctors');
                            setGlobalSearch('');
                            setGlobalSearchFocused(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition"
                        >
                          <div>
                            <span className="font-semibold block">{p.faculty_name}</span>
                            <span className="text-[11px] text-slate-400">{p.designation} • Dept of {p.department_code}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">View Workload &rarr;</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchingStudents.length === 0 && matchingProctors.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching records found for "{globalSearch}".
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions, Academic Year, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Academic Cycle Pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-semibold">AY 2024-25</span>
              <span className="text-slate-500 font-normal">Odd Sem</span>
            </div>

            {/* Quick Action Button with Popover */}
            {isAdminRole && (
              <div className="relative">
                <button
                  onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-xs transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Quick Action</span>
                  <ChevronDown className="w-3 h-3 text-sky-200" />
                </button>

                {quickActionsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 text-xs space-y-1">
                    <button
                      onClick={() => {
                        setAddStudentModalOpen(true);
                        setQuickActionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 font-medium"
                    >
                      <GraduationCap className="w-4 h-4 text-sky-600" /> Register New Student
                    </button>
                    <button
                      onClick={() => {
                        setBroadcastModalOpen(true);
                        setQuickActionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 font-medium"
                    >
                      <Send className="w-4 h-4 text-indigo-600" /> Dispatch Parent Alert
                    </button>
                    <button
                      onClick={() => {
                        setNewDeptModalOpen(true);
                        setQuickActionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 font-medium"
                    >
                      <Building2 className="w-4 h-4 text-emerald-600" /> Add Department
                    </button>
                    <button
                      onClick={() => {
                        setNewAyModalOpen(true);
                        setQuickActionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 font-medium"
                    >
                      <Calendar className="w-4 h-4 text-amber-600" /> Add Academic Year
                    </button>
                    <button
                      onClick={() => {
                        handleExportAccreditation();
                        setQuickActionsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 font-medium border-t border-slate-100 pt-2"
                    >
                      <Download className="w-4 h-4 text-slate-600" /> Export NBA/NAAC Report
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell Button & Popover */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.filter((n) => n.unread).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 text-xs">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-sky-600" /> Institutional Notices
                    </span>
                    <button
                      onClick={() => {
                        setNotifications(notifications.map((n) => ({ ...n, unread: false })));
                      }}
                      className="text-[10px] text-sky-600 hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3 space-y-1 ${n.unread ? 'bg-sky-50/40' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400">{n.time || 'Today'}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar with Popover */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-lg border border-slate-700/80 hover:bg-slate-800/80 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-700 text-sky-100 flex items-center justify-center font-bold text-xs shadow-xs">
                  {(currentUser.fullName || currentUser.full_name || currentUser.email || 'U')[0]}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[11px] font-semibold text-white leading-tight truncate max-w-[110px]">
                    {currentUser.fullName || currentUser.full_name}
                  </p>
                  <p className="text-[9px] text-sky-400 font-mono tracking-wide leading-tight truncate max-w-[110px]">
                    {currentUser.roleCode || currentUser.role_code}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 p-3 z-50 text-xs space-y-3">
                  <div className="border-b border-slate-100 pb-2.5">
                    <p className="font-bold text-sm text-slate-900">{currentUser.fullName || currentUser.full_name}</p>
                    <p className="text-slate-500 text-[11px] truncate">{currentUser.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-sky-100 text-sky-800">
                        {currentUser.roleCode || currentUser.role_code}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{currentUser.institutionName}</span>
                    </div>
                  </div>

                  {isHighAdmin && (
                    <button
                      onClick={() => {
                        setActiveTab('users');
                        setUsersSubTab('audit');
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-slate-700 font-medium"
                    >
                      <Activity className="w-3.5 h-3.5 text-slate-500" /> View System Audit Trail
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold pt-2 border-t border-slate-100"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out of Workspace
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Navigation Tabs Bar */}
      <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-16 z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Scrolling Tabs with Badges */}
          <div className="hidden lg:flex space-x-1 overflow-x-auto py-1.5">
            {navTabs.map((tab) => {
              if (tab.restricted) return null;
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTabType)}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        tab.badgeAlert
                          ? 'bg-rose-100 text-rose-700'
                          : isActive
                          ? 'bg-sky-200 text-sky-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Screen Navigation Drawer / Grid */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-3 border-t border-slate-100 space-y-3">
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search student or mentor..."
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setGlobalSearchFocused(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-100 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {navTabs.map((tab) => {
                  if (tab.restricted) return null;
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as ActiveTabType);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-left transition ${
                        isActive
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{tab.label}</span>
                      {tab.badge !== undefined && tab.badge !== null && (
                        <span className="ml-auto text-[10px] font-mono text-slate-400">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Workspace Body */}
      <main className="w-full p-6 flex-1 max-w-7xl mx-auto space-y-6">

        {/* ========================================================================= */}
        {/* TAB: DASHBOARD OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Institutional Proctoring & Mentoring Dashboard</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Real-time telemetry across academic monitoring, attendance shortages, proctor ratios, and accreditation metrics.
                </p>
              </div>

              {isAdminRole && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAddStudentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Register Student
                  </button>
                  <button
                    onClick={() => setBroadcastModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Broadcast Parent Notice
                  </button>
                  <button
                    onClick={handleExportAccreditation}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Export NBA/NAAC CSV
                  </button>
                </div>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <button
                onClick={() => setActiveTab('students')}
                className="text-left bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-sky-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-sky-600">Total Enrolled</span>
                  <GraduationCap className="w-4 h-4 text-sky-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats?.totalStudents ?? 0}</p>
                <span className="text-[11px] text-slate-500">Active students</span>
              </button>

              <button
                onClick={() => setActiveTab('proctors')}
                className="text-left bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-indigo-600">Mentors</span>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats?.totalFaculty ?? 0}</p>
                <span className="text-[11px] text-slate-500">Faculty proctors</span>
              </button>

              <button
                onClick={() => setActiveTab('proctors')}
                className="text-left bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-600">Coverage</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-emerald-700 mt-2">{stats?.coveragePercent ?? 0}%</p>
                <span className="text-[11px] text-slate-500">Students with mentors</span>
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className="text-left bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs hover:border-rose-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-rose-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-700">Attendance &lt; 75%</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl font-black text-rose-700 mt-2">{stats?.attendanceShortages ?? 0}</p>
                <span className="text-[11px] text-rose-600 font-medium">Critical shortage</span>
              </button>

              <button
                onClick={() => setActiveTab('interventions')}
                className="text-left bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs hover:border-amber-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-amber-600">
                  <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-amber-700">Open Concerns</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-black text-amber-700 mt-2">{stats?.openConcerns ?? 0}</p>
                <span className="text-[11px] text-amber-700 font-medium">Active follow-ups</span>
              </button>

              <button
                onClick={() => setActiveTab('meetings')}
                className="text-left bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow transition group"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-600">Completed Sessions</span>
                  <Calendar className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{stats?.completedMeetings ?? 0}</p>
                <span className="text-[11px] text-slate-500">Recorded meetings</span>
              </button>
            </div>

            {/* Department Performance Snapshot & Proctor Workload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Department Mentoring & Academic Snapshot</h2>
                    <p className="text-xs text-slate-500">Cross-departmental comparison for accreditation evidence</p>
                  </div>
                  {isAdminRole && (
                    <button onClick={() => setActiveTab('analytics')} className="text-xs font-semibold text-sky-600 hover:underline">
                      Detailed telemetry &rarr;
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Dept</th>
                        <th className="py-2.5 px-3">Enrolled Students</th>
                        <th className="py-2.5 px-3">Faculty Mentors</th>
                        <th className="py-2.5 px-3">Attendance Shortages</th>
                        <th className="py-2.5 px-3">Open Concerns</th>
                        <th className="py-2.5 px-3">Avg SGPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analyticsData?.departmentBreakdown?.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-bold text-sky-700">{d.code} - {d.name}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{d.student_count}</td>
                          <td className="py-3 px-3 text-slate-600">{d.faculty_count}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              Number(d.shortage_count) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {d.shortage_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-amber-700 font-semibold">{d.open_issues_count}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">{d.avg_sgpa || 'N/A'}</td>
                        </tr>
                      ))}
                      {(!analyticsData?.departmentBreakdown || analyticsData.departmentBreakdown.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">Loading department breakdown…</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Faculty Proctor Workload Balancer Widget */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900">Workload Balancer</h2>
                  <button onClick={() => setActiveTab('proctors')} className="text-xs font-semibold text-sky-600 hover:underline">
                    Manage &rarr;
                  </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {proctors.slice(0, 5).map((p) => {
                    const ratio = p.max_mentees ? Math.round((p.active_mentees_count / p.max_mentees) * 100) : 0;
                    return (
                      <div key={p.faculty_id} className="border border-slate-100 p-3 rounded-lg bg-slate-50/70 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-800">{p.faculty_name}</span>
                          <span className={`${ratio > 90 ? 'text-rose-600' : ratio > 70 ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {p.active_mentees_count} / {p.max_mentees}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.designation} • Dept of {p.department_code}</p>
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              ratio > 90 ? 'bg-rose-500' : ratio > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  {proctors.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No proctors registered.</p>}
                </div>
              </div>
            </div>

            {/* Quick Directory & Recent Alerts */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Recent Student Roster</h2>
                  <p className="text-xs text-slate-500">Click any student to view their 360-degree digital proctor book</p>
                </div>
                <button onClick={() => setActiveTab('students')} className="text-xs font-semibold text-sky-600 hover:underline">
                  View all ({students.length}) &rarr;
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {students.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => viewProctorFile(s.id)}
                    className="p-3 rounded-lg border border-slate-200 text-left hover:border-sky-400 hover:bg-sky-50/40 transition group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-sky-700">{s.usn}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">Sem {s.current_semester}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1 truncate">{s.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">Mentor: {s.mentor_name || 'Unassigned'}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ACADEMIC STRUCTURE & CONFIGURATION (MODULE 5.1) */}
        {/* ========================================================================= */}
        {activeTab === 'institution' && isAdminRole && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Academic Structure & Configuration</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Manage Academic Years, Departments, Programmes, Batches, and Institutional Rules.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setNewAyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Academic Year
                </button>
                <button
                  onClick={() => setNewDeptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Department
                </button>
                <button
                  onClick={() => setNewProgModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Programme
                </button>
                <button
                  onClick={() => setNewBatchModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Batch
                </button>
              </div>
            </div>

            {/* Institution Profile & Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{structure?.institution?.name || 'Institution Workspace'}</h2>
                    <p className="text-xs text-slate-500">Code: <strong className="font-mono text-slate-700">{structure?.institution?.code}</strong> • Status: <span className="text-emerald-700 font-semibold">{structure?.institution?.status}</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Attendance Shortage Threshold</span>
                  <span className="text-base font-bold text-rose-700">75%</span>
                  <p className="text-[11px] text-slate-400 mt-1">Automatic alert triggered below this level</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Target Proctor-to-Student Ratio</span>
                  <span className="text-base font-bold text-sky-700">1 : 30</span>
                  <p className="text-[11px] text-slate-400 mt-1">Institutional maximum mentor capacity</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Affiliating University & Rules</span>
                  <span className="text-base font-bold text-indigo-700">VTU Belagavi</span>
                  <p className="text-[11px] text-slate-400 mt-1">IA Avg /50 & VTU Semester Exam Schema</p>
                </div>
              </div>
            </div>

            {/* Two Column Layout: Academic Years & Departments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Academic Years Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-600" /> Academic Years
                  </h3>
                  <span className="text-xs text-slate-500">{structure?.academicYears?.length ?? 0} cycles</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {structure?.academicYears?.map((ay: any) => (
                    <div key={ay.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{ay.name}</span>
                        <p className="text-slate-500 text-[11px]">
                          {new Date(ay.start_date).toLocaleDateString()} &mdash; {new Date(ay.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      {ay.is_current ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                          CURRENT ACTIVE
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Archived</span>
                      )}
                    </div>
                  ))}
                  {(!structure?.academicYears || structure.academicYears.length === 0) && (
                    <p className="py-4 text-center text-slate-400">No academic years defined.</p>
                  )}
                </div>
              </div>

              {/* Departments Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" /> Departments
                  </h3>
                  <span className="text-xs text-slate-500">{structure?.departments?.length ?? 0} departments</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {structure?.departments?.map((dept: any) => (
                    <div key={dept.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-sky-700 text-xs bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 mr-2">
                          {dept.code}
                        </span>
                        <span className="font-semibold text-slate-800">{dept.name}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">Active</span>
                    </div>
                  ))}
                  {(!structure?.departments || structure.departments.length === 0) && (
                    <p className="py-4 text-center text-slate-400">No departments defined.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Programmes & Batches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Programmes Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600" /> Programmes & Degrees
                  </h3>
                  <span className="text-xs text-slate-500">{structure?.programmes?.length ?? 0} programmes</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {structure?.programmes?.map((prog: any) => (
                    <div key={prog.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900">{prog.name}</span>
                        <p className="text-slate-500 text-[11px]">Code: {prog.code} • Level: {prog.degree_level} • Semesters: {prog.total_semesters}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {prog.department_code || 'DEPT'}
                      </span>
                    </div>
                  ))}
                  {(!structure?.programmes || structure.programmes.length === 0) && (
                    <p className="py-4 text-center text-slate-400">No programmes defined.</p>
                  )}
                </div>
              </div>

              {/* Batches Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" /> Academic Batches
                  </h3>
                  <span className="text-xs text-slate-500">{structure?.batches?.length ?? 0} batches</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {structure?.batches?.map((b: any) => (
                    <div key={b.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                        <p className="text-slate-500 text-[11px]">{b.programme_name || 'Programme'} • {b.admission_year} - {b.graduation_year}</p>
                      </div>
                      <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-bold text-[10px] border border-sky-200">
                        Batch
                      </span>
                    </div>
                  ))}
                  {(!structure?.batches || structure.batches.length === 0) && (
                    <p className="py-4 text-center text-slate-400">No batches defined.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: USERS & RBAC ACCESS MANAGEMENT (MODULE 5.2) */}
        {/* ========================================================================= */}
        {activeTab === 'users' && isHighAdmin && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">User & RBAC Access Management</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Manage accounts across all 13 system roles, status toggles, and system audit trail.
                </p>
              </div>

              {/* Sub-tab Switcher: Accounts vs Audit Trail */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1 text-xs font-semibold">
                <button
                  onClick={() => setUsersSubTab('accounts')}
                  className={`px-3 py-1.5 rounded-md transition ${usersSubTab === 'accounts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  User Accounts ({managedUsers.length})
                </button>
                <button
                  onClick={() => setUsersSubTab('audit')}
                  className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${usersSubTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Activity className="w-3.5 h-3.5" /> System Audit Trail
                </button>
              </div>
            </div>

            {userError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{userError}</p>}
            {userNotice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{userNotice}</p>}

            {/* VIEW 1: USER ACCOUNTS */}
            {usersSubTab === 'accounts' && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Add User Form */}
                <form onSubmit={handleCreateUser} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs xl:col-span-1">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-sky-600" /> Create User Account
                  </h2>

                  <div>
                    <label htmlFor="new-user-name" className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
                    <input
                      id="new-user-name"
                      required
                      minLength={2}
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="Dr. K. Shantala"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-user-email" className="mb-1 block text-xs font-semibold text-slate-700">Official Email</label>
                    <input
                      id="new-user-email"
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="faculty@svit.edu.in"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-user-phone" className="mb-1 block text-xs font-semibold text-slate-700">Mobile Phone</label>
                    <input
                      id="new-user-phone"
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-user-role" className="mb-1 block text-xs font-semibold text-slate-700">System Role (13 SRS Roles)</label>
                    <select
                      id="new-user-role"
                      value={newUser.roleCode}
                      onChange={(e) => setNewUser({ ...newUser, roleCode: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      {USER_ROLE_OPTIONS.map(([code, label]) => (
                        <option key={code} value={code}>{label} ({code})</option>
                      ))}
                    </select>
                  </div>

                  {['PROCTOR', 'HOD', 'DEAN', 'PROCTOR_COORDINATOR'].includes(newUser.roleCode) && structure?.departments && (
                    <div>
                      <label htmlFor="new-user-dept" className="mb-1 block text-xs font-semibold text-slate-700">Department</label>
                      <select
                        id="new-user-dept"
                        value={newUser.departmentId}
                        onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        <option value="">-- Select Department --</option>
                        {structure.departments.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="new-user-password" className="mb-1 block text-xs font-semibold text-slate-700">Temporary Password</label>
                    <input
                      id="new-user-password"
                      type="password"
                      required
                      minLength={8}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="At least 8 characters"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <button
                    disabled={userSaving}
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 shadow-xs"
                  >
                    <UserPlus className="h-4 w-4" />{userSaving ? 'Creating Account…' : 'Create User Account'}
                  </button>
                </form>

                {/* Users List & Filter */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs xl:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-900">Institution Accounts Directory</h2>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={userFilterRole}
                        onChange={(e) => setUserFilterRole(e.target.value)}
                        className="rounded-lg border border-slate-300 text-xs px-2 py-1.5 bg-white"
                      >
                        <option value="">All Roles</option>
                        {USER_ROLE_OPTIONS.map(([code]) => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>

                      <select
                        value={userFilterStatus}
                        onChange={(e) => setUserFilterStatus(e.target.value)}
                        className="rounded-lg border border-slate-300 text-xs px-2 py-1.5 bg-white"
                      >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="rounded-lg border border-slate-300 text-xs px-2.5 py-1.5 w-36"
                      />
                    </div>
                  </div>

                  {usersLoading ? (
                    <p className="py-8 text-center text-xs text-slate-400">Loading accounts…</p>
                  ) : managedUsers.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] text-slate-600 font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {managedUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-3 font-semibold text-slate-900">{u.full_name}</td>
                              <td className="py-3 px-3 text-slate-600">{u.email}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700">
                                  {u.role_code}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right space-x-2">
                                <button
                                  onClick={() => handleToggleUserStatus(u.id, u.status)}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                                    u.status === 'ACTIVE'
                                      ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                      : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => {
                                    setResetTargetUser(u);
                                    setResetPasswordModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
                                >
                                  Reset Pwd
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                      No accounts found matching filter.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: SYSTEM AUDIT TRAIL */}
            {usersSubTab === 'audit' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Institutional System Audit Trail (audit_logs)</h2>
                    <p className="text-xs text-slate-500">Immutable trace of all administrative, proctor reassignment, and student operations</p>
                  </div>
                  <button
                    onClick={() => setUsersRefresh((v) => v + 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {auditLoading ? (
                  <p className="py-8 text-center text-xs text-slate-400">Loading audit records…</p>
                ) : auditLogs.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Performed By</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Entity</th>
                          <th className="py-2.5 px-3">IP Address</th>
                          <th className="py-2.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {log.user_name || 'System / Batch'}
                              <span className="block font-normal text-[10px] text-slate-400">{log.user_role}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-sky-50 text-sky-800 border border-sky-200">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-700">{log.entity_type}</td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                            <td className="py-3 px-3 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                              {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                    No audit records registered yet.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB: PARENT COMMUNICATION CENTER (MODULE 5.10) */}
        {/* ========================================================================= */}
        {activeTab === 'communication' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Parent Communication Center</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Maintain parent notification history, dispatch SMS, Email, and WhatsApp notices for attendance shortages.
                </p>
              </div>

              {isAdminRole && (
                <button
                  onClick={() => setBroadcastModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Compose Parent Notice
                </button>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={commChannelFilter}
                  onChange={(e) => setCommChannelFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 text-xs px-3 py-1.5 bg-white"
                >
                  <option value="">All Channels (SMS, WhatsApp, Email)</option>
                  <option value="SMS">SMS Gateway</option>
                  <option value="WHATSAPP">WhatsApp Notice</option>
                  <option value="EMAIL">Email Alert</option>
                </select>

                <input
                  type="text"
                  placeholder="Search student, USN, or parent..."
                  value={commSearchTerm}
                  onChange={(e) => setCommSearchTerm(e.target.value)}
                  className="rounded-lg border border-slate-300 text-xs px-3 py-1.5 w-64"
                />
              </div>

              <span className="text-xs text-slate-500 font-semibold">
                Total Dispatches: {parentLogs.length}
              </span>
            </div>

            {/* Communications Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {parentLogsLoading ? (
                <p className="py-8 text-center text-xs text-slate-400">Loading communications…</p>
              ) : parentLogs.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] text-slate-600 font-bold">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Guardian Details</th>
                        <th className="py-3 px-4">Channel</th>
                        <th className="py-3 px-4">Subject & Message</th>
                        <th className="py-3 px-4">Dispatched By</th>
                        <th className="py-3 px-4">Sent At</th>
                        <th className="py-3 px-4">Delivery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {log.student_name}
                            <span className="block font-mono text-[11px] font-bold text-sky-700">{log.student_usn}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="font-semibold">{log.guardian_name}</span> ({log.relation})
                            <span className="block text-[11px] text-slate-500 font-mono">{log.guardian_phone}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.channel === 'SMS' ? 'bg-sky-100 text-sky-800' : log.channel === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm">
                            <strong className="text-slate-900 block truncate">{log.subject}</strong>
                            <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{log.message}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{log.sent_by_name}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                            {new Date(log.sent_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {log.delivery_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  No parent communications dispatched yet. Click "Compose Parent Notice" to send notices.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: ACCREDITATION & ANALYTICS (MODULE 5.11 / IQAC) */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Accreditation Evidence & Institutional Analytics</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Accreditation metrics (NBA Criteria 5, NAAC Metric 2.3.4), semester distributions, and proctoring compliance.
                </p>
              </div>

              <button
                onClick={handleExportAccreditation}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download Accreditation CSV Report
              </button>
            </div>

            {/* Department Breakdown Detailed Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Department Performance & Compliance Audit</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px] text-slate-600 font-bold">
                    <tr>
                      <th className="py-3 px-3">Dept Code</th>
                      <th className="py-3 px-3">Department Name</th>
                      <th className="py-3 px-3">Total Students</th>
                      <th className="py-3 px-3">Active Mentors</th>
                      <th className="py-3 px-3">Attendance Shortages</th>
                      <th className="py-3 px-3">Open Risk Concerns</th>
                      <th className="py-3 px-3">Average SGPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyticsData?.departmentBreakdown?.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-sky-700">{d.code}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{d.name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{d.student_count}</td>
                        <td className="py-3 px-3 text-slate-600">{d.faculty_count}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            Number(d.shortage_count) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {d.shortage_count}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-amber-700">{d.open_issues_count}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{d.avg_sgpa || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Issues & Semester Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Issues Risk Matrix */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="font-bold text-base text-slate-900">Student Risk & Concerns Breakdown</h3>
                <div className="space-y-2">
                  {analyticsData?.issuesBreakdown?.map((i: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{i.category}</span>
                        <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          i.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {i.severity}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {i.count} cases
                      </span>
                    </div>
                  ))}
                  {(!analyticsData?.issuesBreakdown || analyticsData.issuesBreakdown.length === 0) && (
                    <p className="text-xs text-slate-400 text-center py-4">No risk issues recorded.</p>
                  )}
                </div>
              </div>

              {/* Semester Distribution */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="font-bold text-base text-slate-900">Semester-wise Student Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {analyticsData?.semesterDistribution?.map((s: any) => (
                    <div key={s.current_semester} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">Semester {s.current_semester}</span>
                      <span className="text-xl font-black text-slate-900 block mt-1">{s.student_count}</span>
                      <span className="text-[10px] text-slate-400">Students</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: STUDENTS & DIGITAL PROCTOR BOOK (MODULE 5.3) */}
        {/* ========================================================================= */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Digital Student Success Records (Proctor Files)</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Consolidated academic performance, internal assessments, attendance, and mentoring continuity.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isAdminRole && (
                  <button
                    onClick={() => setAddStudentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Register New Student
                  </button>
                )}

                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Name or USN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Department & Semester Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter by:
              </span>
              <select
                value={studentDeptFilter}
                onChange={(e) => setStudentDeptFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs bg-white"
              >
                <option value="">All Departments</option>
                {structure?.departments?.map((d: any) => (
                  <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
                ))}
              </select>

              <select
                value={studentSemFilter}
                onChange={(e) => setStudentSemFilter(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs bg-white"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={String(sem)}>Semester {sem}</option>
                ))}
              </select>

              {(studentDeptFilter || studentSemFilter || searchTerm) && (
                <button
                  onClick={() => {
                    setStudentDeptFilter('');
                    setStudentSemFilter('');
                    setSearchTerm('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline ml-2"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Students Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3">USN</th>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Sem & Sec</th>
                    <th className="px-5 py-3">Assigned Proctor</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-sky-700">{s.usn}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{s.full_name}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-semibold">{s.department_code}</td>
                      <td className="px-5 py-3.5 text-slate-600">Sem {s.current_semester} - {s.current_section}</td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">{s.mentor_name || 'Unassigned'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => viewProctorFile(s.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-[11px] border border-sky-200 transition"
                        >
                          <Eye className="w-3 h-3" /> View Proctor File
                        </button>
                        {isAdminRole && (
                          <button
                            onClick={() => handleToggleStudentStatus(s.id, s.status)}
                            className="px-2 py-1 rounded text-[11px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-100"
                          >
                            {s.status === 'ACTIVE' ? 'Graduate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No students found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PROCTOR ALLOCATIONS & WORKLOAD BALANCER (MODULE 5.4) */}
        {/* ========================================================================= */}
        {activeTab === 'proctors' && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Proctor Allocation & Workload Management</h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Balance student mentoring quotas and manage historical faculty reassignments.
                </p>
              </div>

              {isAdminRole && (
                <button
                  onClick={() => setReassignModalOpen(true)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 flex items-center gap-2 shadow-xs"
                >
                  <ArrowRightLeft className="w-4 h-4" /> Reassign Student Proctor
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proctors.map((p) => {
                const ratio = p.max_mentees ? Math.round((p.active_mentees_count / p.max_mentees) * 100) : 0;
                return (
                  <div key={p.faculty_id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">{p.faculty_name}</h3>
                        <p className="text-xs text-slate-500">{p.designation} • Dept of {p.department_code}</p>
                        <p className="text-xs text-sky-600 mt-0.5">{p.faculty_email}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 font-bold rounded bg-slate-100 text-slate-700 font-mono">
                        EMP: {p.employee_id}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                        <span>Workload Ratio ({ratio}%)</span>
                        <span className={ratio > 90 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                          {p.active_mentees_count} / {p.max_mentees} Students
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            ratio > 90 ? 'bg-rose-500' : ratio > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, ratio)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Mentees:</p>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {students
                          .filter((s) => s.faculty_id === p.faculty_id)
                          .map((s) => (
                            <span
                              key={s.id}
                              onClick={() => viewProctorFile(s.id)}
                              className="cursor-pointer text-[11px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                            >
                              {s.full_name} ({s.usn})
                            </span>
                          ))}
                        {students.filter((s) => s.faculty_id === p.faculty_id).length === 0 && (
                          <p className="text-xs text-slate-400 italic">No mentees assigned yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: MENTORING MEETINGS (MODULE 5.5) */}
        {/* ========================================================================= */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Mentoring Sessions & Meeting Logs</h1>
                <p className="text-xs sm:text-sm text-slate-500">
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
                  <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">
                          {m.meeting_type}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 mt-1">{m.title}</h3>
                        <p className="text-xs text-slate-500">
                          Mentor: <strong className="text-slate-700">{m.mentor_name}</strong>
                        </p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 font-bold rounded-full ${
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

        {/* ========================================================================= */}
        {/* TAB: CONCERNS & INTERVENTIONS (MODULE 5.7) */}
        {/* ========================================================================= */}
        {activeTab === 'interventions' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Student Risk & Intervention Management</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Track academic drop-offs, attendance shortages, action plans, and resolution outcomes.
              </p>
            </div>

            <div className="space-y-4">
              {interventions.map((issue) => (
                <div key={issue.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        issue.severity === 'HIGH' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {issue.severity} RISK
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {issue.category}
                      </span>
                      <h3 className="font-bold text-base text-slate-900">{issue.title}</h3>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Status: {issue.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{issue.description}</p>

                  <div className="flex items-center gap-6 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>
                      Student:{' '}
                      <button
                        type="button"
                        onClick={() => viewProctorFile(issue.student_id)}
                        className="font-bold text-sky-600 hover:underline transition"
                      >
                        {issue.student_name} ({issue.usn})
                      </button>
                    </span>
                    <span>Logged By: <strong className="text-slate-800">{issue.raised_by_name}</strong></span>
                    <span>Action Plans: <strong className="text-slate-800">{issue.total_action_plans}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: BULK MARKS EXCEL IMPORT (MODULE 5.6 & 5.11) */}
        {/* ========================================================================= */}
        {activeTab === 'import' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bulk Academic Marks & Attendance Import Engine</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Upload institutional Excel spreadsheets (.xlsx) with automated row-level validation, VTU IA calculation rules, and preview error logs.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 text-center hover:border-sky-500 transition">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-base text-slate-900">Upload Academic Marks Excel Spreadsheet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                File must include columns: <code>USN</code>, <code>SubjectCode</code>, <code>Semester</code>, <code>IA1</code> (0-50), <code>IA2</code> (0-50), and <code>VTU_External</code>.
              </p>

              <label className="mt-4 inline-block px-5 py-2.5 bg-sky-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-sky-700 transition shadow-xs">
                {uploading ? 'Validating Workbook...' : 'Select .xlsx Spreadsheet'}
                <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {importResult && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
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

        {/* ========================================================================= */}
        {/* TAB: CONFIDENTIAL COUNSELLING (MODULE 5.8) */}
        {/* ========================================================================= */}
        {activeTab === 'counselling' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong className="font-bold">Confidential records:</strong> Only counsellors and super administrators can access this area. Opening an individual record is audit logged.
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Counselling sessions</h2>
              {counsellingSessions.length ? counsellingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{session.student_name} <span className="font-normal text-slate-500">({session.usn})</span></p>
                    <p className="mt-1 text-xs text-slate-500">Counsellor: {session.counsellor_name || 'Assigned counsellor'}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{session.general_status || 'OPEN'}</span>
                </div>
              )) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No counselling sessions recorded.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* FULL DIGITAL PROCTOR FILE MODAL */}
      {/* ========================================================================= */}
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
                </div>
              )}

              {/* In-Database Stored Documents & Attachments */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600" /> Stored Student Documents (Local Database BYTEA)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Files are stored directly in PostgreSQL (BYTEA) without cloud storage dependencies.
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
                    No documents stored in the database for this student yet. Click "Upload File to Database" to attach marks cards or certificates.
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

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW STUDENT */}
      {/* ========================================================================= */}
      {addStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">Register New Student Record</h3>
              <button onClick={() => setAddStudentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">USN (University Roll No)</label>
                  <input
                    required
                    placeholder="1VE21CS042"
                    value={newStudentData.usn}
                    onChange={(e) => setNewStudentData({ ...newStudentData, usn: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                  <input
                    required
                    placeholder="Rohit Verma"
                    value={newStudentData.fullName}
                    onChange={(e) => setNewStudentData({ ...newStudentData, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Student Email</label>
                  <input
                    type="email"
                    placeholder="rohit.cs@svit.edu.in"
                    value={newStudentData.email}
                    onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Student Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={newStudentData.phone}
                    onChange={(e) => setNewStudentData({ ...newStudentData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    required
                    value={newStudentData.departmentId}
                    onChange={(e) => setNewStudentData({ ...newStudentData, departmentId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select Dept</option>
                    {structure?.departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Semester</label>
                  <select
                    value={newStudentData.currentSemester}
                    onChange={(e) => setNewStudentData({ ...newStudentData, currentSemester: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Section</label>
                  <input
                    placeholder="A"
                    value={newStudentData.currentSection}
                    onChange={(e) => setNewStudentData({ ...newStudentData, currentSection: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="font-bold text-slate-800 mb-2">Guardian / Parent Contact</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Guardian Name</label>
                    <input
                      placeholder="Mr. Verma"
                      value={newStudentData.guardianName}
                      onChange={(e) => setNewStudentData({ ...newStudentData, guardianName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Relation</label>
                    <select
                      value={newStudentData.guardianRelation}
                      onChange={(e) => setNewStudentData({ ...newStudentData, guardianRelation: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Local Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Parent Phone</label>
                    <input
                      placeholder="+91 98765 11111"
                      value={newStudentData.guardianPhone}
                      onChange={(e) => setNewStudentData({ ...newStudentData, guardianPhone: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddStudentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700"
                >
                  Save Student Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BROADCAST PARENT ALERT / NOTICE */}
      {/* ========================================================================= */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-600" /> Dispatch Parent Alert / Notice
              </h3>
              <button onClick={() => setBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Group</label>
                <select
                  value={broadcastData.targetGroup}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetGroup: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="ATTENDANCE_SHORTAGE">Parents of Students with Attendance &lt; 75%</option>
                  <option value="ALL">All Enrolled Students' Parents</option>
                  <option value="DEPARTMENT">Specific Department</option>
                  <option value="SEMESTER">Specific Semester</option>
                </select>
              </div>

              {broadcastData.targetGroup === 'DEPARTMENT' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Department</label>
                  <select
                    value={broadcastData.departmentId}
                    onChange={(e) => setBroadcastData({ ...broadcastData, departmentId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="">-- Choose Department --</option>
                    {structure?.departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {broadcastData.targetGroup === 'SEMESTER' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Select Semester</label>
                  <select
                    value={broadcastData.semester}
                    onChange={(e) => setBroadcastData({ ...broadcastData, semester: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Communication Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {['SMS', 'WHATSAPP', 'EMAIL'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setBroadcastData({ ...broadcastData, channel: ch })}
                      className={`py-2 text-center rounded-lg border font-semibold ${
                        broadcastData.channel === ch
                          ? 'border-sky-600 bg-sky-50 text-sky-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject / Header</label>
                <input
                  required
                  value={broadcastData.subject}
                  onChange={(e) => setBroadcastData({ ...broadcastData, subject: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notice Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700"
                >
                  Confirm & Dispatch Notices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD */}
      {/* ========================================================================= */}
      {resetPasswordModalOpen && resetTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-sky-600" /> Reset Password
              </h3>
              <button onClick={() => setResetPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Reset temporary sign-in password for <strong>{resetTargetUser.full_name}</strong> ({resetTargetUser.email}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600"
                >
                  Cancel
                </button>
                <button
                  disabled={resetSubmitting}
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700"
                >
                  {resetSubmitting ? 'Resetting…' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD ACADEMIC YEAR */}
      {/* ========================================================================= */}
      {newAyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">Add Academic Year</h3>
              <button onClick={() => setNewAyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAcademicYear} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Academic Year Name</label>
                <input
                  required
                  placeholder="2025-2026"
                  value={newAyData.name}
                  onChange={(e) => setNewAyData({ ...newAyData, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newAyData.startDate}
                    onChange={(e) => setNewAyData({ ...newAyData, startDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newAyData.endDate}
                    onChange={(e) => setNewAyData({ ...newAyData, endDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAyData.isCurrent}
                  onChange={(e) => setNewAyData({ ...newAyData, isCurrent: e.target.checked })}
                  className="rounded text-sky-600"
                />
                <span className="text-slate-700 font-semibold">Set as Current Active Cycle</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewAyModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD DEPARTMENT */}
      {/* ========================================================================= */}
      {newDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">Add New Department</h3>
              <button onClick={() => setNewDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department Code</label>
                <input
                  required
                  placeholder="e.g. ISE, ECE, ME"
                  value={newDeptData.code}
                  onChange={(e) => setNewDeptData({ ...newDeptData, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department Name</label>
                <input
                  required
                  placeholder="Information Science & Engineering"
                  value={newDeptData.name}
                  onChange={(e) => setNewDeptData({ ...newDeptData, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewDeptModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD PROGRAMME */}
      {/* ========================================================================= */}
      {newProgModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">Add Programme</h3>
              <button onClick={() => setNewProgModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProgramme} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <select
                  required
                  value={newProgData.departmentId}
                  onChange={(e) => setNewProgData({ ...newProgData, departmentId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="">-- Select Department --</option>
                  {structure?.departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Programme Code</label>
                <input
                  required
                  placeholder="B_TECH_ISE"
                  value={newProgData.code}
                  onChange={(e) => setNewProgData({ ...newProgData, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Programme Name</label>
                <input
                  required
                  placeholder="Bachelor of Engineering in ISE"
                  value={newProgData.name}
                  onChange={(e) => setNewProgData({ ...newProgData, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Degree Level</label>
                  <select
                    value={newProgData.degreeLevel}
                    onChange={(e) => setNewProgData({ ...newProgData, degreeLevel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DIPLOMA">Diploma</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Semesters</label>
                  <input
                    type="number"
                    value={newProgData.totalSemesters}
                    onChange={(e) => setNewProgData({ ...newProgData, totalSemesters: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewProgModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-slate-800 text-white rounded-md font-semibold hover:bg-slate-900">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BATCH */}
      {/* ========================================================================= */}
      {newBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">Add Academic Batch</h3>
              <button onClick={() => setNewBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Programme</label>
                <select
                  required
                  value={newBatchData.programmeId}
                  onChange={(e) => setNewBatchData({ ...newBatchData, programmeId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                >
                  <option value="">-- Choose Programme --</option>
                  {structure?.programmes?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Batch Name</label>
                <input
                  required
                  placeholder="2023-2027"
                  value={newBatchData.name}
                  onChange={(e) => setNewBatchData({ ...newBatchData, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Admission Year</label>
                  <input
                    type="number"
                    value={newBatchData.admissionYear}
                    onChange={(e) => setNewBatchData({ ...newBatchData, admissionYear: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={newBatchData.graduationYear}
                    onChange={(e) => setNewBatchData({ ...newBatchData, graduationYear: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewBatchModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-sky-600 text-white rounded-md font-semibold hover:bg-sky-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REASSIGN PROCTOR */}
      {/* ========================================================================= */}
      {reassignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">Reassign Student Proctor</h3>
              <button onClick={() => setReassignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassign} className="space-y-3 text-xs">
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
                  placeholder="e.g. Workload balancing, faculty departure, or student request."
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
