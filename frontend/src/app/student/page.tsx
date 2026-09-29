'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { OvalSidebar } from '../../components/navigation/OvalSidebar';
import { LeaderboardTable } from '../../components/LeaderboardTable';
import { QuestionDetailModal } from '../../components/QuestionDetailModal';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { LeaderboardEntry, AssignedQuestionItem } from '../../types';
import { Trophy, Code, ArrowRight, CheckCircle, Clock } from 'lucide-react';

export default function StudentPage({ initialTab = 'questions' }: { initialTab?: 'questions' | 'leaderboard' } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'questions' | 'leaderboard'>(initialTab);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<AssignedQuestionItem[]>([]);
  const [assessmentInfo, setAssessmentInfo] = useState<{ id: string; title: string; status: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [submittedStudentsCount, setSubmittedStudentsCount] = useState<number>(0);
  const [isLeaderboardStarted, setIsLeaderboardStarted] = useState<boolean>(false);

  // Authentication Guard
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'admin') {
        router.push('/admin');
      }
    }
  }, [user, loading, router]);

  // Initial Fetch & WebSocket Listeners
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    fetchStudentDashboard();
    fetchLeaderboard();

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
      fetchStudentDashboard();
    };

    const onScoreUpdate = () => {
      fetchStudentDashboard();
      fetchLeaderboard();
    };

    socket.on('leaderboard:update', onLeaderboardUpdate);
    socket.on('student:score_update', onScoreUpdate);

    // Live polling every 5 seconds
    const interval = setInterval(() => {
      fetchStudentDashboard();
    }, 5000);

    return () => {
      socket.off('leaderboard:update', onLeaderboardUpdate);
      socket.off('student:score_update', onScoreUpdate);
      clearInterval(interval);
    };
  }, [user]);

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

  if (loading || !user || user.role !== 'student') {
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
                  <Code className="w-4 h-4 text-violet-600" />
                  Assigned Assessment Challenges ({assignedQuestions.length})
                </h3>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Click any challenge card to open code prompt & submit
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

          {/* TAB 2: Live Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <LeaderboardTable
              entries={leaderboard}
              currentStudentId={user.id}
              isProjectorMode={false}
              submittedStudentsCount={submittedStudentsCount}
              isLeaderboardStarted={isLeaderboardStarted}
            />
          )}
        </main>
      </div>

      {/* Question Details / Submission Modal */}
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
