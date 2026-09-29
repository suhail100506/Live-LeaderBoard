'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { OvalSidebar } from '../../components/navigation/OvalSidebar';
import { LeaderboardTable } from '../../components/LeaderboardTable';
import { EvaluationModal } from '../../components/EvaluationModal';
import { QuestionBankModal } from '../../components/QuestionBankModal';
import { AuditLogModal } from '../../components/AuditLogModal';
import { StudentSubmissionsGroup } from '../../components/StudentSubmissionsGroup';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { LeaderboardEntry, SubmissionItem, DashboardStats } from '../../types';
import {
  Trophy,
  Flame,
  Plus,
  History,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';

export default function AdminPage({ initialTab = 'submissions' }: { initialTab?: 'submissions' | 'leaderboard' | 'bank' } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'submissions' | 'leaderboard' | 'bank'>(initialTab);
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [subFilter, setSubFilter] = useState<'ALL' | 'PENDING' | 'EVALUATED'>('PENDING');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [questionsBank, setQuestionsBank] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [submittedStudentsCount, setSubmittedStudentsCount] = useState<number>(0);
  const [isLeaderboardStarted, setIsLeaderboardStarted] = useState<boolean>(false);

  // Authentication Guard
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'admin') {
        router.push('/student');
      }
    }
  }, [user, loading, router]);

  // Initial Fetch & WebSocket Listeners
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    fetchAdminDashboard();
    fetchSubmissions();
    fetchLeaderboard();
    fetchQuestionBank();

    const socket = getSocket();

    const onLeaderboardUpdate = (data: {
      assessmentId: string;
      leaderboard: LeaderboardEntry[];
      submittedStudentsCount?: number;
      isLeaderboardStarted?: boolean;
    }) => {
      setLeaderboard(data.leaderboard);
      if (typeof data.submittedStudentsCount === 'number') {
        setSubmittedStudentsCount(data.submittedStudentsCount);
      }
      if (typeof data.isLeaderboardStarted === 'boolean') {
        setIsLeaderboardStarted(data.isLeaderboardStarted);
      }
      fetchAdminDashboard();
    };

    socket.on('leaderboard:update', onLeaderboardUpdate);

    // Live sync polling every 5 seconds
    const interval = setInterval(() => {
      fetchAdminDashboard();
      fetchSubmissions();
    }, 5000);

    return () => {
      socket.off('leaderboard:update', onLeaderboardUpdate);
      clearInterval(interval);
    };
  }, [user]);

  const fetchAdminDashboard = async () => {
    try {
      const res = await apiRequest('/admin/dashboard-stats');
      if (res.success && res.stats) {
        setAdminStats({
          ...res.stats,
          totalStudents: res.stats.totalStudents > 0 ? res.stats.totalStudents : 66
        });
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await apiRequest('/admin/submissions');
      if (res.success && res.submissions) {
        setSubmissions(res.submissions);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await apiRequest('/student/leaderboard');
      if (res.success && res.leaderboard) {
        setLeaderboard(res.leaderboard);
        if (typeof res.submittedStudentsCount === 'number') {
          setSubmittedStudentsCount(res.submittedStudentsCount);
        }
        if (typeof res.isLeaderboardStarted === 'boolean') {
          setIsLeaderboardStarted(res.isLeaderboardStarted);
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchQuestionBank = async () => {
    try {
      const res = await apiRequest('/admin/questions');
      if (res.success && res.questions) {
        setQuestionsBank(res.questions);
      }
    } catch (err) {
      console.error('Error fetching question bank:', err);
    }
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      <div className="max-w-[1550px] w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Oval Navigation Sidebar */}
        <OvalSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={adminStats?.pendingEvaluations ?? 0}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {/* Admin Header with KPI Metrics */}
          <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Evaluator Studio & Runtime Marking
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
                  Welcome, {user.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Continuous Assessment Mode • Real-time Marks Sync Active
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="px-4 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white shadow-md shadow-violet-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Problem
                </button>
                <button
                  onClick={() => setShowAuditModal(true)}
                  className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all"
                >
                  <History className="w-4 h-4 text-violet-600" /> Audit Log
                </button>
              </div>
            </div>

            {/* Metric KPI Cards (Always guarantees 66 official students) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Students</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {adminStats?.totalStudents || 66}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Submissions</span>
                <span className="text-2xl font-black text-violet-700 mt-1 block">{adminStats?.totalSubmissions ?? 0}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center relative overflow-hidden">
                {(adminStats?.pendingEvaluations ?? 0) > 0 && (
                  <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Pending Review</span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">{adminStats?.pendingEvaluations ?? 0}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Evaluated</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{adminStats?.evaluatedCount ?? 0}</span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Top Score</span>
                <span className="text-2xl font-black text-amber-700 mt-1 block">{adminStats?.highestScore ?? 0} pts</span>
              </div>
            </div>
          </div>

          {/* TAB 1: Live Submissions Review Workspace (Grouped by Student Candidate) */}
          {activeTab === 'submissions' && (
            <StudentSubmissionsGroup
              submissions={submissions}
              subFilter={subFilter}
              setSubFilter={setSubFilter}
              onSelectSubmission={(sub) => setSelectedSubmission(sub)}
            />
          )}

          {/* TAB 2: Leaderboard Projection View */}
          {activeTab === 'leaderboard' && (
            <LeaderboardTable
              entries={leaderboard}
              isProjectorMode={true}
              submittedStudentsCount={submittedStudentsCount}
              isLeaderboardStarted={isLeaderboardStarted}
            />
          )}

          {/* TAB 3: Question Bank Management */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Active Assessment Question Bank ({questionsBank.length} Questions)
                </h3>
                <button
                  onClick={() => setShowQuestionModal(true)}
                  className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white flex items-center gap-1 shadow-md shadow-violet-600/20"
                >
                  <Plus className="w-3.5 h-3.5" /> New Problem
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questionsBank.map((q) => (
                  <div key={q._id} className="bg-white rounded-[28px] p-5 border border-slate-200/90 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : q.difficulty === 'medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span className="text-xs font-bold text-violet-700">{q.marks} Marks</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{q.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{q.description}</p>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Category: {q.category}</span>
                      <span>Language: {q.language}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Admin Evaluation Modal */}
      {selectedSubmission && (
        <EvaluationModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onEvaluated={() => {
            fetchSubmissions();
            fetchAdminDashboard();
            fetchLeaderboard();
          }}
        />
      )}

      {/* Question Creator Modal */}
      {showQuestionModal && (
        <QuestionBankModal
          onClose={() => setShowQuestionModal(false)}
          onQuestionAdded={() => {
            fetchQuestionBank();
            fetchAdminDashboard();
          }}
        />
      )}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <AuditLogModal onClose={() => setShowAuditModal(false)} />
      )}
    </div>
  );
}
