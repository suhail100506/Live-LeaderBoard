'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { OvalSidebar } from '../components/OvalSidebar';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { EvaluationModal } from '../components/EvaluationModal';
import { QuestionDetailModal } from '../components/QuestionDetailModal';
import { QuestionBankModal } from '../components/QuestionBankModal';
import { AuditLogModal } from '../components/AuditLogModal';
import { StudentSubmissionsGroup } from '../components/StudentSubmissionsGroup';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { CompilerClashLogin } from '../components/CompilerClashLogin';
import { apiRequest } from '../lib/api';
import { getSocket } from '../lib/socket';
import { LeaderboardEntry, AssignedQuestionItem, SubmissionItem, DashboardStats } from '../types';
import {
  Trophy,
  Code,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  UserCheck,
  Sparkles,
  Layers,
  Search,
  Plus,
  History,
  FileCode,
  Flame,
  AlertTriangle,
  Lock,
  BookOpen
} from 'lucide-react';

export default function Home() {
  const { user, login } = useAuth();

  // Common State
  const [activeTab, setActiveTab] = useState<'questions' | 'leaderboard' | 'submissions' | 'bank'>('questions');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [assessmentInfo, setAssessmentInfo] = useState<{ id: string; title: string; status: string } | null>(null);

  // Student State
  const [studentStats, setStudentStats] = useState<any>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<AssignedQuestionItem[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Admin State
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [subFilter, setSubFilter] = useState<'ALL' | 'PENDING' | 'EVALUATED'>('PENDING');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [questionsBank, setQuestionsBank] = useState<any[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Login Form State
  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Socket.IO Real-time listeners
  useEffect(() => {
    const socket = getSocket();

    const onLeaderboardUpdate = (data: { assessmentId: string; leaderboard: LeaderboardEntry[] }) => {
      console.log('[Socket.IO] Leaderboard updated in real time:', data);
      setLeaderboard(data.leaderboard);
      if (user?.role === 'admin') {
        fetchAdminDashboard();
      } else if (user?.role === 'student') {
        fetchStudentDashboard();
      }
    };

    const onScoreUpdate = (data: any) => {
      console.log('[Socket.IO] Private student score updated:', data);
      fetchStudentDashboard();
    };

    socket.on('leaderboard:update', onLeaderboardUpdate);
    socket.on('student:score_update', onScoreUpdate);

    return () => {
      socket.off('leaderboard:update', onLeaderboardUpdate);
      socket.off('student:score_update', onScoreUpdate);
    };
  }, [user]);

  // Initial Data Fetching based on role (Only after login!)
  useEffect(() => {
    if (user?.role === 'student') {
      fetchStudentDashboard();
      fetchLeaderboard();
      setActiveTab('questions');
    } else if (user?.role === 'admin') {
      fetchAdminDashboard();
      fetchSubmissions();
      fetchLeaderboard();
      fetchQuestionBank();
      setActiveTab('submissions');
    }
  }, [user]);

  // Periodic refresher for live data sync every 5 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (user.role === 'admin') {
        fetchAdminDashboard();
        fetchSubmissions();
      } else if (user.role === 'student') {
        fetchStudentDashboard();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const res = await apiRequest('/student/leaderboard');
      if (res.success && res.leaderboard) {
        setLeaderboard(res.leaderboard);
        if (res.assessmentTitle) {
          setAssessmentInfo({
            id: 'assessment-active',
            title: res.assessmentTitle,
            status: res.assessmentStatus || 'LIVE'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchStudentDashboard = async () => {
    try {
      const res = await apiRequest('/student/dashboard');
      if (res.success) {
        setStudentStats(res.stats);
        setAssignedQuestions(res.questions || []);
        if (res.assessment) {
          setAssessmentInfo({
            id: res.assessment.id,
            title: res.assessment.title,
            status: res.assessment.status
          });
          getSocket().emit('join:assessment', res.assessment.id);
        }
      }
    } catch (err) {
      console.error('Error fetching student dashboard:', err);
    }
  };

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

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    const res = await login(emailInput, passInput);
    if (!res.success) {
      setLoginError(res.message || 'Login failed');
    }
    setLoginLoading(false);
  };

  /* ------------------------------------------------------------- */
  /* UN-AUTHENTICATED: LIGHT THEME LANDING & LOGIN PAGE            */
  /* (Leaderboard is strictly hidden until logged in!)             */
  /* ------------------------------------------------------------- */
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center bg-[#f8fafc] py-6 sm:py-10">
        <CompilerClashLogin />
      </main>
    );
  }

  /* ------------------------------------------------------------- */
  /* AUTHENTICATED: STUDENT PORTAL (With Oval Sidebar)             */
  /* ------------------------------------------------------------- */
  if (user.role === 'student') {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-[1560px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Oval Shape Navigation Sidebar */}
          <OvalSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            completedQuestions={studentStats?.completedQuestions ?? 0}
            totalQuestions={studentStats?.totalQuestions ?? 6}
            onOpenSettings={() => setShowSettingsModal(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 w-full min-w-0 space-y-6">
            
            {/* Student Welcome & Symmetrical Metrics Banner */}
            <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
                    Student Assessment Portal
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
                    Welcome, {user.name} 👋
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                    {user.department || 'Computer Science & Engineering'} • Section {user.section || 'D'}
                  </p>
                </div>

                {/* Symmetrical KPI Cards */}
                <div className="grid grid-cols-3 gap-3 w-full xl:w-auto shrink-0">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[110px]">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Score
                    </span>
                    <div className="flex items-baseline justify-center gap-1 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900">
                        {studentStats?.totalMarks ?? 0}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/{studentStats?.maxPossibleMarks ?? 80}</span>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[110px]">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Current Rank
                    </span>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span className="text-2xl sm:text-3xl font-black text-amber-700">
                        #{studentStats?.currentRank ?? '-'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[110px]">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Solved
                    </span>
                    <div className="flex items-baseline justify-center gap-1 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-violet-700">
                        {studentStats?.completedQuestions ?? 0}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">/{studentStats?.totalQuestions ?? 6}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB 1: Assigned Questions Grid (Responsive 2-column Grid for Q1 to Q6) */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-600" />
                    Your Deterministically Assigned Problem Set
                  </h3>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    Click any question to view details & submit screenshot
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedQuestions.map((q, idx) => (
                    <div
                      key={q.questionId || idx}
                      onClick={() => setSelectedQuestionId(q.questionId)}
                      className="bg-white rounded-[22px] p-4 sm:p-4.5 cursor-pointer border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all flex flex-col justify-between group min-h-[165px]"
                    >
                      <div>
                        {/* Top tags */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-800">
                            Q{q.order}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              q.difficulty === 'easy'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : q.difficulty === 'medium'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {q.difficulty}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                              {q.marks} pts
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm sm:text-[15px] font-bold text-slate-900 group-hover:text-violet-600 transition-colors leading-snug">
                          {q.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{q.category}</p>
                      </div>

                      {/* Status badge & action */}
                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        {q.isEvaluated ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Awarded: {q.marksObtained}/{q.marks}</span>
                          </div>
                        ) : q.isSubmitted ? (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                            <Clock className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                            <span>Under Review</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Pending</span>
                        )}

                        <span className="text-xs font-bold text-violet-600 group-hover:text-indigo-600 flex items-center gap-1 shrink-0">
                          Solve →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Live Leaderboard (Visible after login!) */}
            {activeTab === 'leaderboard' && (
              <LeaderboardTable
                entries={leaderboard}
                currentStudentId={user.id}
              />
            )}

          </main>
        </div>

        {/* Question Solving Modal */}
        {selectedQuestionId && (
          <QuestionDetailModal
            questionId={selectedQuestionId}
            assessmentId={assessmentInfo?.id || ''}
            onClose={() => setSelectedQuestionId(null)}
            onSubmitted={() => {
              fetchStudentDashboard();
              fetchLeaderboard();
            }}
          />
        )}

        {/* Settings / Change Password Modal */}
        <ChangePasswordModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------- */
  /* AUTHENTICATED: ADMIN / FACULTY PORTAL (With Oval Sidebar)     */
  /* ------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1560px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Oval Shape Navigation Sidebar */}
        <OvalSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={adminStats?.pendingEvaluations ?? 0}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          
          {/* Admin Header with KPI Cards */}
          <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/90 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Evaluation & Contest Control Room
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2.5">
                  Faculty Evaluator Studio
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Review student screenshots, award marks per question, and watch the leaderboard recalculate live.
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

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Students</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{adminStats?.totalStudents || 66}</span>
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

          {/* TAB 2: Leaderboard Projection View (Visible after login!) */}
          {activeTab === 'leaderboard' && (
            <LeaderboardTable
              entries={leaderboard}
              isProjectorMode={true}
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
