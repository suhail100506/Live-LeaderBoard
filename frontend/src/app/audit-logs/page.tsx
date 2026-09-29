'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { AuditLogItem } from '../../types';
import { apiRequest } from '../../lib/api';
import { ShieldAlert, History, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/audit-logs');
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } finally {
      setLoading(false);
    }
  };

  const backUrl = user?.role === 'admin' ? '/admin' : '/student';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white rounded-[28px] p-5 sm:p-6 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              href={backUrl}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Return to Workspace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  Score Modification & Audit Trail
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Immutable record of all faculty runtime grading and score adjustments
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Audit Logs List */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/90 shadow-sm">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading audit records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No audit records found</p>
              <p className="text-xs text-slate-400 mt-1">Actions taken by evaluators will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-violet-100 text-violet-700 border border-violet-200 shrink-0 mt-0.5">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{log.adminId?.name || 'Evaluator'}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({log.adminId?.email})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Student: <strong className="text-slate-800">{log.studentId?.name || 'Student'}</strong>
                        {log.details ? ` • ${log.details}` : ''}
                      </p>
                      {(typeof log.oldMarks === 'number' || typeof log.newMarks === 'number') && (
                        <div className="flex items-center gap-2 mt-2 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                            {log.oldMarks ?? 0} pts
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                            {log.newMarks ?? 0} pts
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium self-end sm:self-auto shrink-0">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
