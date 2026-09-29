'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { LeaderboardTable } from '../../components/LeaderboardTable';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { LeaderboardEntry } from '../../types';
import { Trophy, ArrowLeft, Radio } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState('First Year Algorithmic Sprint 2026');
  const [loading, setLoading] = useState(true);
  const [submittedStudentsCount, setSubmittedStudentsCount] = useState<number>(0);
  const [isLeaderboardStarted, setIsLeaderboardStarted] = useState<boolean>(false);

  useEffect(() => {
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
    };

    socket.on('leaderboard:update', onLeaderboardUpdate);

    // Periodic sync
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5000);

    return () => {
      socket.off('leaderboard:update', onLeaderboardUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await apiRequest('/student/leaderboard');
      if (res.success && res.leaderboard) {
        setLeaderboard(res.leaderboard);
        if (res.assessmentTitle) {
          setAssessmentTitle(res.assessmentTitle);
        }
        if (typeof res.submittedStudentsCount === 'number') {
          setSubmittedStudentsCount(res.submittedStudentsCount);
        }
        if (typeof res.isLeaderboardStarted === 'boolean') {
          setIsLeaderboardStarted(res.isLeaderboardStarted);
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const backUrl = user?.role === 'admin' ? '/admin' : user?.role === 'student' ? '/student' : '/login';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[28px] p-5 sm:p-6 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              href={backUrl}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Return to Workspace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[2px] shadow-md shadow-violet-500/20">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  LiveCode<span className="text-violet-600">Arena</span> Leaderboard
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {assessmentTitle} • Section D Official Rankings
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              Real-Time Sync Active
            </span>
          </div>
        </div>

        {/* Full Leaderboard Table */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/90 shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading live assessment rankings...</p>
            </div>
          ) : (
            <LeaderboardTable
              entries={leaderboard}
              currentStudentId={user?.id}
              isProjectorMode={true}
              submittedStudentsCount={submittedStudentsCount}
              isLeaderboardStarted={isLeaderboardStarted}
            />
          )}
        </div>
      </div>
    </div>
  );
}
