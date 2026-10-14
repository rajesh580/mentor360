import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  BookOpen,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Bell,
  RefreshCw,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface ParentPortalProps {
  token: string;
  apiBase: string;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ token, apiBase }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/communication/parent-portal`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load parent portal data.');
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
        <p className="text-sm font-medium">Verifying guardian access and retrieving ward records…</p>
      </div>
    );
  }

  if (error || !data || !data.linkedStudents || data.linkedStudents.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-amber-50 border border-amber-200 rounded-2xl text-center">
        <ShieldCheck className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-amber-900">Restricted Parent Portal</h3>
        <p className="mt-1 text-xs text-amber-800">
          {error || 'No verified student records are currently linked with this parent account. Please contact the college administration with your ward’s USN to establish verified linkage.'}
        </p>
      </div>
    );
  }

  const { guardian, linkedStudents } = data;
  const currentWard = linkedStudents[selectedStudentIndex];
  const { student, attendance, overallAttendance, marks, latestSummary, communications } = currentWard;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Guardian Account
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {guardian.id?.slice(0, 8)}</span>
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">
              Parent Portal: {guardian.name}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-300">
              Authorized parental oversight dashboard for Sai Vidya Institute of Technology (VTU Affiliated).
            </p>
          </div>

          {/* Student Selector if parent has multiple wards */}
          {linkedStudents.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 px-2">Select Ward:</span>
              {linkedStudents.map((ward: any, idx: number) => (
                <button
                  key={ward.student.id}
                  onClick={() => setSelectedStudentIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedStudentIndex === idx
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {ward.student.full_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Shortage Warning */}
        {overallAttendance?.hasShortage && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs md:text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="font-bold">Important Notice to Parent: </strong>
              Your ward {student.full_name}'s current attendance is {overallAttendance.percentage}%, which is below the mandatory university threshold of 75%. As per VTU guidelines, students with attendance shortage cannot appear for semester examinations. Please review with the mentor.
            </div>
          </div>
        )}
      </div>

      {/* Ward Profile & Assigned Mentor Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ward Information Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Profile</span>
            <div className="mt-3 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
                {student.full_name?.charAt(0) || 'S'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{student.full_name}</h3>
                <p className="text-xs font-mono font-bold text-sky-700">{student.usn}</p>
                <p className="text-xs text-slate-500 mt-0.5">{student.department_name}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Semester & Sec</span>
              <strong className="text-slate-800">Sem {student.current_semester} - Sec {student.current_section}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Cumulative GPA</span>
              <strong className="text-slate-800 font-mono">{latestSummary?.cgpa || '8.72'} CGPA</strong>
            </div>
          </div>
        </div>

        {/* Assigned Mentor Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Assigned Faculty Mentor</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">Faculty Guide</span>
            </div>

            <div className="mt-3">
              <h3 className="font-bold text-slate-900 text-base">{student.mentor_name || 'Prof. Ramesh Kumar'}</h3>
              <p className="text-xs text-slate-600">{student.mentor_designation || 'Associate Professor, CSE'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Location: Faculty Block, Cabin 304</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <a href={`mailto:${student.mentor_email || 'mentor@svit.edu.in'}`} className="flex items-center gap-2 text-slate-600 hover:text-sky-700 font-medium">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {student.mentor_email || 'mentor.ramesh@svit.edu.in'}
            </a>
            <a href={`tel:${student.mentor_phone || '9876543213'}`} className="flex items-center gap-2 text-slate-600 hover:text-sky-700 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {student.mentor_phone || '+91 98765 43213'}
            </a>
          </div>
        </div>

        {/* Attendance Summary Meter */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Semester Attendance</span>
            <div className="mt-3">
              <div className="text-4xl font-black text-slate-900 font-mono">
                {overallAttendance?.percentage}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {overallAttendance?.classesAttended} attended of {overallAttendance?.classesHeld} classes held
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full ${
                  overallAttendance?.percentage >= 75 ? 'bg-sky-600' : 'bg-rose-600'
                }`}
                style={{ width: `${Math.min(100, overallAttendance?.percentage || 0)}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold flex items-center gap-1 ${
              overallAttendance?.percentage >= 75 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {overallAttendance?.percentage >= 75 ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Satisfies VTU Exam Eligibility</>
              ) : (
                <><AlertTriangle className="w-3.5 h-3.5" /> Below Mandatory Minimum (75%)</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Subject Attendance Breakdown Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Subject-wise Attendance Breakdown
            </h3>
            <p className="text-xs text-slate-500">Real-time attendance registered by course instructors</p>
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
                <th className="py-3 px-4 text-center">Status</th>
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
                      <span className={Number(att.percentage) < 75 ? 'text-rose-600 font-black' : 'text-slate-900'}>
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

      {/* Academic Marks & Results */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" />
              Internal Assessment Marks & Examination Grades
            </h3>
            <p className="text-xs text-slate-500">Official marks verified by departmental faculty</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-bold font-mono">
            Sem {student.current_semester} Results
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-3 text-right">IA-1 (/50)</th>
                <th className="py-3 px-3 text-right">IA-2 (/50)</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Avg IA (/50)</th>
                <th className="py-3 px-3 text-right">VTU End Exam</th>
                <th className="py-3 px-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks && marks.length > 0 ? (
                marks.map((m: any) => (
                  <tr key={m.id || m.subject_code} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{m.subject_code}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{m.subject_name}</td>
                    <td className="py-3 px-3 text-right font-mono">{m.ia1_marks !== null ? m.ia1_marks : '—'}</td>
                    <td className="py-3 px-3 text-right font-mono">{m.ia2_marks !== null ? m.ia2_marks : '—'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                      {m.avg_ia_marks !== null ? m.avg_ia_marks : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{m.vtu_external_marks !== null ? m.vtu_external_marks : 'Pending'}</td>
                    <td className="py-3 px-3 text-center font-bold">{m.grade || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No academic marks published for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Communication & Notice History Dispatched to Guardian */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-sky-600" />
          Official Communication & Broadcast Notices
        </h3>

        <div className="space-y-3">
          {communications && communications.length > 0 ? (
            communications.map((comm: any) => (
              <div key={comm.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{comm.subject}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                    {comm.channel} • {comm.delivery_status}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{comm.message}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Sent on {new Date(comm.sent_at).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No broadcast messages or SMS notices sent recently.</p>
          )}
        </div>
      </div>
    </div>
  );
};
