import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building2,
  Send,
  PlusCircle,
  FileText,
  Briefcase,
  Target,
  Sparkles,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

interface StudentPortalProps {
  token: string;
  apiBase: string;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ token, apiBase }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Request Meeting Modal State
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingReason, setMeetingReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submittingMeeting, setSubmittingMeeting] = useState(false);
  const [meetingSuccessMsg, setMeetingSuccessMsg] = useState('');

  // Add Goal Modal State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [submittingGoal, setSubmittingGoal] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/students/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load student success portal data.');
        const result = await res.json();
        setData(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, apiBase, refreshKey]);

  const handleRequestMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMeeting(true);
    try {
      const res = await fetch(`${apiBase}/api/students/me/request-meeting`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: meetingReason, preferredDate }),
      });
      if (!res.ok) throw new Error('Failed to submit meeting request.');
      setMeetingSuccessMsg('Mentoring request sent to your mentor successfully!');
      setTimeout(() => {
        setMeetingModalOpen(false);
        setMeetingReason('');
        setPreferredDate('');
        setMeetingSuccessMsg('');
        setRefreshKey((k) => k + 1);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Error submitting meeting request.');
    } finally {
      setSubmittingMeeting(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.student?.id) return;
    setSubmittingGoal(true);
    try {
      const res = await fetch(`${apiBase}/api/development/goals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: data.student.id,
          title: newGoalTitle,
          targetDate: newGoalDate,
        }),
      });
      if (!res.ok) throw new Error('Failed to create goal.');
      setGoalModalOpen(false);
      setNewGoalTitle('');
      setNewGoalDate('');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Error creating goal.');
    } finally {
      setSubmittingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Loading your 360° Student Success Record…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-rose-50 border border-rose-200 rounded-2xl text-center">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-rose-900">Student Profile Not Linked</h3>
        <p className="mt-1 text-xs text-rose-700">
          {error || 'No active student record is linked with your login email. Please contact the institution administrator.'}
        </p>
      </div>
    );
  }

  const { student, currentMentor, marks, attendance, overallAttendance, latestSummary, meetings, interventions, development } = data;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Profile Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-2xl md:text-3xl text-white shadow-md border-2 border-white/20">
              {student.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">{student.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {student.usn}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {student.status || 'ACTIVE'}
                </span>
              </div>
              <p className="mt-1 text-xs md:text-sm text-slate-300 font-medium flex items-center gap-2 flex-wrap">
                <span>{student.department_name} ({student.department_code})</span>
                <span className="text-slate-500">•</span>
                <span>Semester {student.current_semester} - Section {student.current_section}</span>
                <span className="text-slate-500">•</span>
                <span>{student.programme_name || 'B.E. Computer Science'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMeetingModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs md:text-sm shadow-md transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Request Mentoring
            </button>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
              title="Refresh Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Attendance Shortage Alert Banner */}
        {overallAttendance?.hasShortage && (
          <div className="mt-6 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center gap-3 text-xs md:text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <span className="font-bold">VTU Attendance Shortage Warning: </span>
              Your current attendance is below the mandatory 75% threshold ({overallAttendance.percentage}%). Please meet your assigned mentor immediately for attendance recovery planning.
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Metric Cards & Assigned Mentor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Attendance Metric */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Attendance</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
              overallAttendance?.percentage >= 85
                ? 'bg-emerald-100 text-emerald-800'
                : overallAttendance?.percentage >= 75
                ? 'bg-sky-100 text-sky-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {overallAttendance?.percentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {overallAttendance?.percentage}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {overallAttendance?.classesAttended} attended of {overallAttendance?.classesHeld} classes
            </p>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallAttendance?.percentage >= 75 ? 'bg-sky-600' : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, overallAttendance?.percentage || 0)}%` }}
            />
          </div>
        </div>

        {/* Cumulative GPA */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">VTU Academic Standing</span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800">
              {latestSummary?.academic_standing || 'GOOD'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 font-mono">
              {latestSummary?.cgpa || '8.72'} <span className="text-xs text-slate-400 font-normal">CGPA</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Latest SGPA: <strong className="text-slate-800 font-mono">{latestSummary?.sgpa || '8.85'}</strong> • Active Backlogs: <strong className="text-slate-800 font-mono">{latestSummary?.active_backlogs || 0}</strong>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> High Performance Bracket
          </div>
        </div>

        {/* Assigned Faculty Mentor Card */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Assigned Faculty Mentor
            </span>
            <span className="text-[11px] font-mono bg-sky-200/70 text-sky-900 px-2 py-0.5 rounded-md font-semibold">
              Cabin 304
            </span>
          </div>

          {currentMentor ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-sky-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
                  {currentMentor.mentor_name?.charAt(0) || 'M'}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm md:text-base">{currentMentor.mentor_name}</h4>
                  <p className="text-xs text-slate-600">{currentMentor.designation || 'Associate Professor'}</p>
                  <p className="text-[11px] text-slate-500">{currentMentor.specialization || 'Computer Science & Engineering'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-xs text-slate-600">
                <a href={`mailto:${currentMentor.mentor_email}`} className="flex items-center gap-1.5 hover:text-sky-700 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentMentor.mentor_email}
                </a>
                {currentMentor.mentor_phone && (
                  <a href={`tel:${currentMentor.mentor_phone}`} className="flex items-center gap-1.5 hover:text-sky-700 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentMentor.mentor_phone}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-2">No mentor currently assigned. Please contact the Proctor Coordinator.</p>
          )}
        </div>
      </div>

      {/* 3. Academic Marks & IA Breakdown */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              Internal Assessment (IA) & Semester Examination Performance
            </h3>
            <p className="text-xs text-slate-500">VTU 2021 Scheme: IA 1 & IA 2 (out of 50), Semester Average, and Exam Grades</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-bold">
            Semester {student.current_semester}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-3 text-center">Credits</th>
                <th className="py-3 px-3 text-right">IA-1 (/50)</th>
                <th className="py-3 px-3 text-right">IA-2 (/50)</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Avg IA (/50)</th>
                <th className="py-3 px-3 text-right">VTU End Exam</th>
                <th className="py-3 px-3 text-center">Grade</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks && marks.length > 0 ? (
                marks.map((m: any) => (
                  <tr key={m.id || m.subject_code} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{m.subject_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{m.subject_name}</td>
                    <td className="py-3 px-3 text-center font-mono">{m.credits || 3}</td>
                    <td className="py-3 px-3 text-right font-mono">{m.ia1_marks !== null ? m.ia1_marks : '—'}</td>
                    <td className="py-3 px-3 text-right font-mono">{m.ia2_marks !== null ? m.ia2_marks : '—'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                      {m.avg_ia_marks !== null ? m.avg_ia_marks : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{m.vtu_external_marks !== null ? m.vtu_external_marks : 'Pending'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-800">
                        {m.grade || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.is_backlog ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {m.is_backlog ? 'BACKLOG' : 'PASS'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No examination records posted for this academic period yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Subject-wise Attendance Breakdown */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Subject-wise Attendance & Shortage Status
            </h3>
            <p className="text-xs text-slate-500">VTU Mandate: Minimum 75% attendance required in each subject to appear for exams</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-3 text-right">Classes Held</th>
                <th className="py-3 px-3 text-right">Classes Attended</th>
                <th className="py-3 px-3 text-right">Attendance %</th>
                <th className="py-3 px-4 text-center">Shortage Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance && attendance.length > 0 ? (
                attendance.map((att: any) => (
                  <tr key={att.id || att.subject_code} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{att.subject_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{att.subject_name}</td>
                    <td className="py-3 px-3 text-right font-mono">{att.classes_held}</td>
                    <td className="py-3 px-3 text-right font-mono">{att.classes_attended}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={Number(att.percentage) < 75 ? 'text-rose-600' : 'text-slate-900'}>
                        {att.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.is_shortage
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {att.is_shortage ? 'SHORTAGE (< 75%)' : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Mentoring Meetings & Active Action Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mentoring Meetings */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                Mentoring Meeting History & Agendas
              </h3>
              <span className="text-xs font-semibold text-slate-500">{meetings?.length || 0} recorded</span>
            </div>

            <div className="space-y-3">
              {meetings && meetings.length > 0 ? (
                meetings.map((m: any) => (
                  <div key={m.id} className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{m.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.attendance_status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.attendance_status === 'ABSENT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {m.attendance_status || m.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-500 text-[11px]">
                      {new Date(m.scheduled_at).toLocaleDateString()} • Venue: {m.venue}
                    </p>
                    {m.discussion_notes && (
                      <p className="mt-2 text-slate-700 bg-white p-2 rounded-lg border border-slate-200/60 font-mono text-[11px]">
                        <strong>Notes:</strong> {m.discussion_notes}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No mentoring meetings scheduled yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Plans & Concerns */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Intervention Action Plans & Goals
              </h3>
              <span className="text-xs font-semibold text-slate-500">{interventions?.length || 0} active</span>
            </div>

            <div className="space-y-3">
              {interventions && interventions.length > 0 ? (
                interventions.map((si: any) => (
                  <div key={si.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900">{si.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                        {si.severity} • {si.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 text-[11px]">{si.description}</p>
                    {si.action_title && (
                      <div className="mt-2 p-2 rounded-lg bg-white border border-amber-200 text-[11px]">
                        <span className="font-bold text-slate-800">Action Plan: </span>
                        {si.action_title} ({si.action_status})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  No open disciplinary or academic concerns. You are in good standing!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Career Development: Goals, Certifications & Internships */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Career Readiness & Student Development
            </h3>
            <p className="text-xs text-slate-500">Personal Goals, Industry Certifications, and Internship Experience</p>
          </div>
          <button
            onClick={() => setGoalModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add New Goal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Goals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-sky-600" /> Active Goals
            </h4>
            {development?.goals && development.goals.length > 0 ? (
              development.goals.map((g: any) => (
                <div key={g.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                  <p className="font-bold text-slate-900">{g.title}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{g.status}</span>
                    <span>{g.progress_percentage}%</span>
                  </div>
                  <div className="mt-1 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-600 h-full rounded-full" style={{ width: `${g.progress_percentage}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4">No goals added yet.</p>
            )}
          </div>

          {/* Certifications */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600" /> Verified Certifications
            </h4>
            {development?.certificates && development.certificates.length > 0 ? (
              development.certificates.map((c: any) => (
                <div key={c.id} className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950">{c.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Issued by {c.issuing_org}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4">No certificates uploaded yet.</p>
            )}
          </div>

          {/* Internships */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" /> Internships
            </h4>
            {development?.internships && development.internships.length > 0 ? (
              development.internships.map((i: any) => (
                <div key={i.id} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 text-xs">
                  <p className="font-bold text-emerald-950">{i.role}</p>
                  <p className="text-slate-600 text-[11px]">{i.company_name}</p>
                  {i.stipend_amount && (
                    <p className="text-emerald-700 font-mono text-[10px] mt-1 font-semibold">
                      Stipend: ₹{Number(i.stipend_amount).toLocaleString()} / month
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4">No internships listed.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Request Meeting with Mentor */}
      {meetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Request Mentoring Meeting</h3>
            <p className="mt-1 text-xs text-slate-500">
              Submit a discussion request to your assigned mentor {currentMentor?.mentor_name ? `(${currentMentor.mentor_name})` : ''}.
            </p>

            {meetingSuccessMsg ? (
              <div className="my-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {meetingSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleRequestMeeting} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Topic for Discussion</label>
                  <textarea
                    required
                    rows={3}
                    value={meetingReason}
                    onChange={(e) => setMeetingReason(e.target.value)}
                    placeholder="e.g. Discuss IA-1 marks improvement, internship advice, or attendance shortage recovery..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMeetingModalOpen(false)}
                    className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingMeeting}
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {submittingMeeting ? 'Sending Request…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Add New Goal */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Add Academic / Personal Goal</h3>
            <p className="mt-1 text-xs text-slate-500">Track milestones for your semester and career development.</p>

            <form onSubmit={handleAddGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Description</label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Complete AWS Certified Developer exam or score > 9.0 SGPA"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Date</label>
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGoal}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingGoal ? 'Saving Goal…' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
