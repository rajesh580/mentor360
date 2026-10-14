import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  LockKeyhole,
  KeyRound,
  Layers,
} from 'lucide-react';

interface SuperAdminTenantsPanelProps {
  token: string;
  apiBase: string;
  onSelectTenant: (institutionId: string) => void;
}

export const SuperAdminTenantsPanel: React.FC<SuperAdminTenantsPanelProps> = ({
  token,
  apiBase,
  onSelectTenant,
}) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal State
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [newTenant, setNewTenant] = useState({
    code: '',
    name: '',
    slug: '',
    maxStudents: 3000,
    university: 'VTU',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/api/institution/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load tenants list.');
        const result = await res.json();
        setTenants(Array.isArray(result) ? result : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, apiBase, refreshKey]);

  const handleStatusChange = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change status to ${nextStatus}?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/institution/tenants/${tenantId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to update tenant status.');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    try {
      const res = await fetch(`${apiBase}/api/institution/tenants`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTenant),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to provision tenant.');
      }
      alert('SaaS Institution and Administrator successfully provisioned!');
      setProvisionModalOpen(false);
      setNewTenant({
        code: '',
        name: '',
        slug: '',
        maxStudents: 3000,
        university: 'VTU',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Error provisioning tenant.');
    } finally {
      setProvisioning(false);
    }
  };

  // Aggregate stats
  let totalStudents = 0;
  let totalFaculty = 0;
  let totalUsers = 0;
  tenants.forEach((t) => {
    totalStudents += parseInt(t.student_count) || 0;
    totalFaculty += parseInt(t.faculty_count) || 0;
    totalUsers += parseInt(t.user_count) || 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Loading Multi-Tenant SaaS Directory…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Multi-Tenant SaaS Master Console
            </span>
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">
            Institutional Tenants & Subscription Management
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-300">
            SRS Section 7.5: Multi-Institution SaaS Architecture, Provisioning, Quotas & Platform Telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setProvisionModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs md:text-sm shadow-md transition flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Provision New College
          </button>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global SaaS Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Active Tenant Colleges</span>
          <div className="text-3xl font-black text-slate-900 font-mono mt-2">{tenants.length}</div>
          <p className="text-xs text-slate-500 mt-1">Multi-tenant instances hosted</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Total Enrolled Students</span>
          <div className="text-3xl font-black text-sky-600 font-mono mt-2">{totalStudents}</div>
          <p className="text-xs text-slate-500 mt-1">Across all institutions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Total Faculty Mentors</span>
          <div className="text-3xl font-black text-indigo-600 font-mono mt-2">{totalFaculty}</div>
          <p className="text-xs text-slate-500 mt-1">Active faculty accounts</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Platform Users</span>
          <div className="text-3xl font-black text-emerald-600 font-mono mt-2">{totalUsers}</div>
          <p className="text-xs text-slate-500 mt-1">Admins, faculty, students, parents</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Registered SaaS Institutional Tenants</h3>
          <span className="text-xs text-slate-500">Strict database tenant isolation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-3">Code / Slug</th>
                <th className="py-3 px-3 text-right">Students</th>
                <th className="py-3 px-3 text-right">Faculty</th>
                <th className="py-3 px-3 text-right">Total Users</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Admin Context Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Created: {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 text-slate-800">
                      {t.code}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.slug}</div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{t.student_count}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{t.faculty_count}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-600">{t.user_count}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleStatusChange(t.id, t.status)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition hover:opacity-80 ${
                        t.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {t.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectTenant(t.id)}
                      className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs border border-sky-200 transition flex items-center gap-1.5 mx-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Switch Context
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVISION NEW TENANT MODAL */}
      {provisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-600" />
              Provision New SaaS Tenant College
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Instantiates a new institution record, isolated academic structure, and root administrator credentials.
            </p>

            <form onSubmit={handleProvisionSubmit} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institution Code *</label>
                  <input
                    type="text"
                    required
                    value={newTenant.code}
                    onChange={(e) => setNewTenant({ ...newTenant, code: e.target.value })}
                    placeholder="e.g. BMSIT-BLR"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Affiliated University</label>
                  <input
                    type="text"
                    value={newTenant.university}
                    onChange={(e) => setNewTenant({ ...newTenant, university: e.target.value })}
                    placeholder="e.g. VTU"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Full Name *</label>
                <input
                  type="text"
                  required
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="e.g. BMS Institute of Technology & Management"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">URL Identifier (Slug)</label>
                  <input
                    type="text"
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                    placeholder="e.g. bmsit-bangalore"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Quota Limit</label>
                  <input
                    type="number"
                    value={newTenant.maxStudents}
                    onChange={(e) => setNewTenant({ ...newTenant, maxStudents: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2">Initial Institution Administrator Account</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Administrator Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newTenant.adminName}
                      onChange={(e) => setNewTenant({ ...newTenant, adminName: e.target.value })}
                      placeholder="e.g. Dr. Mohan Kumar (Principal)"
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Admin Email *</label>
                      <input
                        type="email"
                        required
                        value={newTenant.adminEmail}
                        onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                        placeholder="admin@college.edu.in"
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Temporary Password *</label>
                      <input
                        type="password"
                        required
                        value={newTenant.adminPassword}
                        onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
                        placeholder="Min 8 characters"
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProvisionModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {provisioning ? 'Provisioning Tenant…' : 'Provision College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
