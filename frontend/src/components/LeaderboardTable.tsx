'use client';

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import {
  Trophy,
  Search,
  Clock,
  Sparkles,
  Crown,
  Medal,
  Award,
  X,
  Lock,
  Users,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentStudentId?: string;
  isProjectorMode?: boolean;
  submittedStudentsCount?: number;
  isLeaderboardStarted?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  currentStudentId,
  isProjectorMode = false,
  submittedStudentsCount,
  isLeaderboardStarted
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Count distinct students who have made submissions or have score
  const submittedCountFromEntries = entries.filter(
    (e) => Boolean(e.hasSubmission || e.completedQuestions > 0 || e.totalMarks > 0)
  ).length;

  const actualSubmittedCount = typeof submittedStudentsCount === 'number'
    ? Math.max(submittedStudentsCount, submittedCountFromEntries)
    : submittedCountFromEntries;

  // Leaderboard starts after at least 3 student submissions
  const isStarted = typeof isLeaderboardStarted === 'boolean'
    ? isLeaderboardStarted
    : actualSubmittedCount >= 3;

  // Top 3 entries from the sorted leaderboard
  const topThree = entries.slice(0, 3);
  // Entries starting from 4th place onwards
  const remainingEntries = entries.slice(3);

  // Filter all entries when search is active
  const filteredAll = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Trigger celebration if current student is rank 1 and leaderboard is started
  useEffect(() => {
    if (isStarted && currentStudentId && entries.length > 0) {
      const me = entries.find((e) => e.studentId === currentStudentId);
      if (me && me.rank === 1 && me.totalMarks > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [entries, currentStudentId, isStarted]);

  // Rank badge helper for table rows
  const getTableRankBadge = (actualRank: number, displayPosition: number) => {
    if (displayPosition === 1) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs shadow-sm">
          <span>🥇</span>
          <span>1st</span>
        </div>
      );
    }
    if (displayPosition === 2) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-xs shadow-sm">
          <span>🥈</span>
          <span>2nd</span>
        </div>
      );
    }
    if (displayPosition === 3) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-extrabold text-xs shadow-sm">
          <span>🥉</span>
          <span>3rd</span>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-inner">
        #{displayPosition}
      </div>
    );
  };

  return (
    <div className={`w-full glass-panel rounded-3xl overflow-hidden shadow-xl bg-white border border-slate-200 ${isProjectorMode ? 'p-6 sm:p-8' : 'p-5 sm:p-7'}`}>
      
      {/* Table Header with Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                Live Competition Leaderboard
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            Rankings recalculate instantly as submissions are evaluated runtime
          </p>
        </div>

        {/* Search only shown when leaderboard is started and not projector mode */}
        {isStarted && !isProjectorMode && (
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONDITION: If fewer than 3 students have submitted, display the awaiting/locked state */}
      {!isStarted ? (
        <div className="my-8 py-12 px-6 sm:px-10 rounded-[32px] bg-gradient-to-br from-slate-50 via-violet-50/40 to-amber-50/30 border border-slate-200/90 text-center relative overflow-hidden">
          {/* Glowing Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black mb-5 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>LEADERBOARD LOCKED • 3 SUBMISSIONS REQUIRED</span>
          </div>

          <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center mx-auto mb-4 text-amber-500">
            <Trophy className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Leaderboard Starts After 3 Student Submissions
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto font-medium leading-relaxed">
            The Live Competition Leaderboard and Top 3 Podium will officially activate once at least 3 students have submitted their solutions.
          </p>

          {/* Progress Tracker Card */}
          <div className="max-w-md mx-auto mt-7 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold mb-2.5">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-violet-600" />
                Submissions Received:
              </span>
              <span className="text-violet-700 font-extrabold text-sm">
                {actualSubmittedCount} / 3 Students
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/80">
              <div
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-amber-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (actualSubmittedCount / 3) * 100)}%` }}
              />
            </div>

            {/* 3 Step Milestone Indicators */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-[11px] font-bold">
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  actualSubmittedCount >= 1
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <span>{actualSubmittedCount >= 1 ? '✓ Student 1' : '1st Student'}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  actualSubmittedCount >= 2
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <span>{actualSubmittedCount >= 2 ? '✓ Student 2' : '2nd Student'}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  actualSubmittedCount >= 3
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <span>{actualSubmittedCount >= 3 ? '✓ Student 3' : '3rd Student'}</span>
              </div>
            </div>
          </div>

          {/* Real-time Socket Indicator */}
          <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Listening for incoming submissions via real-time WebSocket...</span>
          </div>
        </div>
      ) : (
        /* ACTIVE LEADERBOARD: Displays Podium (2nd Left, 1st Center, 3rd Right) and Table */
        <>
          {/* TOP THREE PODIUM CARDS */}
          {entries.length > 0 && (
            <div className="mt-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Top Performers Podium
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Top 3 of {entries.length} participants
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 items-end">
                {/* 2nd Place Card (Silver) - LEFT on desktop, 2nd on mobile */}
                <div className="order-2 md:order-1 flex flex-col h-full justify-end">
                  {topThree[1] ? (
                    <TopPerformerCard
                      entry={topThree[1]}
                      place={2}
                      displayPosition={2}
                      isMe={Boolean(currentStudentId && topThree[1].studentId === currentStudentId)}
                    />
                  ) : (
                    <EmptyPodiumCard place={2} />
                  )}
                </div>

                {/* 1st Place Card (Gold) - CENTER on desktop, 1st on mobile (elevated) */}
                <div className="order-1 md:order-2 flex flex-col h-full justify-end md:-translate-y-2.5 z-10">
                  {topThree[0] ? (
                    <TopPerformerCard
                      entry={topThree[0]}
                      place={1}
                      displayPosition={1}
                      isMe={Boolean(currentStudentId && topThree[0].studentId === currentStudentId)}
                    />
                  ) : (
                    <EmptyPodiumCard place={1} />
                  )}
                </div>

                {/* 3rd Place Card (Bronze) - RIGHT on desktop, 3rd on mobile */}
                <div className="order-3 md:order-3 flex flex-col h-full justify-end">
                  {topThree[2] ? (
                    <TopPerformerCard
                      entry={topThree[2]}
                      place={3}
                      displayPosition={3}
                      isMe={Boolean(currentStudentId && topThree[2].studentId === currentStudentId)}
                    />
                  ) : (
                    <EmptyPodiumCard place={3} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TABLE CONTENT (Continues from 4th place downwards) */}
          <div className="overflow-x-auto mt-2 pt-2 border-t border-slate-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Questions Solved</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Accuracy %</th>
                  <th className="py-3 px-4">Last Eval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(searchTerm ? filteredAll : remainingEntries).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      {searchTerm
                        ? `No students found matching "${searchTerm}"`
                        : entries.length <= 3
                        ? 'All participating students are shown in the Top 3 podium above.'
                        : 'No additional participating students found.'}
                    </td>
                  </tr>
                ) : (
                  (searchTerm ? filteredAll : remainingEntries).map((entry, idx) => {
                    const isMe = currentStudentId && entry.studentId === currentStudentId;
                    const displayPosition = searchTerm
                      ? entries.findIndex((e) => e.studentId === entry.studentId) + 1
                      : idx + 4;

                    return (
                      <tr
                        key={entry.studentId}
                        className={`transition-colors duration-200 group ${
                          isMe
                            ? 'bg-violet-50/80 border-l-4 border-violet-600 shadow-sm'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getTableRankBadge(entry.rank, displayPosition)}
                        </td>

                        {/* Student Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs ${
                                displayPosition <= 3
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {entry.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
                                  {entry.name}
                                </span>
                                {isMe && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-600 text-white shadow-sm">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium">
                                {entry.department || 'Computer Science & Engineering'} • Section {entry.section || 'D'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Questions Solved */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (entry.completedQuestions / (entry.totalAssignedQuestions || 6)) * 100
                                  )}%`
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                              {entry.completedQuestions}/{entry.totalAssignedQuestions || 6}
                            </span>
                          </div>
                        </td>

                        {/* Total Marks */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                              {entry.totalMarks}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                              /{entry.maxPossibleMarks}
                            </span>
                          </div>
                        </td>

                        {/* Percentage */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                              entry.percentage >= 80
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : entry.percentage >= 50
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {entry.percentage}%
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                          {entry.lastEvaluationTime ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(entry.lastEvaluationTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer Info */}
      <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 font-medium">
        <span>⚡ Socket.IO Connected: Real-time broadcast pushed directly from server</span>
        <span>Requirement: Leaderboard activates upon 3 student submissions</span>
      </div>

    </div>
  );
};

/**
 * Top Performer Podium Card Component
 */
interface TopPerformerCardProps {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  displayPosition: number;
  isMe: boolean;
}

const TopPerformerCard: React.FC<TopPerformerCardProps> = ({
  entry,
  place,
  displayPosition,
  isMe
}) => {
  const configs = {
    1: {
      title: '1st Place',
      subtitle: 'Leader',
      badgeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/20',
      badgeIcon: <Crown className="w-3.5 h-3.5" />,
      borderClass: 'border-2 border-amber-300 ring-2 ring-amber-400/20 bg-gradient-to-b from-amber-50/60 via-white to-amber-50/20 shadow-md shadow-amber-500/5',
      avatarBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-4 ring-amber-100 shadow-md',
      scoreColor: 'text-amber-600',
      tag: '🥇'
    },
    2: {
      title: '2nd Place',
      subtitle: 'Runner-up',
      badgeClass: 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/20',
      badgeIcon: <Medal className="w-3.5 h-3.5" />,
      borderClass: 'border border-slate-300 ring-1 ring-slate-200 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/20 shadow-sm',
      avatarBg: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white ring-4 ring-slate-100 shadow-sm',
      scoreColor: 'text-slate-700',
      tag: '🥈'
    },
    3: {
      title: '3rd Place',
      subtitle: 'Second Runner-up',
      badgeClass: 'bg-gradient-to-r from-amber-700 to-orange-600 text-white shadow-orange-500/20',
      badgeIcon: <Award className="w-3.5 h-3.5" />,
      borderClass: 'border border-orange-200 ring-1 ring-orange-200/50 bg-gradient-to-b from-orange-50/60 via-white to-orange-50/20 shadow-sm',
      avatarBg: 'bg-gradient-to-br from-amber-600 to-orange-700 text-white ring-4 ring-orange-100 shadow-sm',
      scoreColor: 'text-amber-800',
      tag: '🥉'
    }
  };

  const cfg = configs[place];

  return (
    <div
      className={`relative rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${
        cfg.borderClass
      } ${isMe ? 'ring-2 ring-violet-500 shadow-violet-500/10' : ''}`}
    >
      {/* Top Bar with Place Badge & YOU indicator */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm ${cfg.badgeClass}`}>
            {cfg.badgeIcon}
            <span>{cfg.title}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isMe && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-600 text-white shadow-sm">
                YOU
              </span>
            )}
            <span className="text-[11px] font-bold text-slate-500 bg-white/80 border border-slate-200/70 px-2 py-0.5 rounded-lg shadow-2xs">
              {entry.percentage}% Acc
            </span>
          </div>
        </div>

        {/* Student Avatar + Name */}
        <div className="flex items-center gap-3.5 my-2">
          <div className="relative shrink-0">
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-lg ${cfg.avatarBg}`}>
              {entry.name.charAt(0)}
            </div>
            <span className="absolute -bottom-1 -right-1 text-sm drop-shadow-sm">
              {cfg.tag}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="font-extrabold text-slate-900 text-base truncate leading-snug" title={entry.name}>
              {entry.name}
            </h4>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {entry.department || 'Computer Science & Engineering'}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold truncate">
              Section {entry.section || 'D'} • {entry.rollNumber || 'Student'}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Score & Progress */}
      <div className="mt-4 pt-3.5 border-t border-slate-200/60">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Total Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${cfg.scoreColor}`}>
                {entry.totalMarks}
              </span>
              <span className="text-xs font-bold text-slate-400">
                /{entry.maxPossibleMarks} pts
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Solved
            </span>
            <span className="text-xs font-black text-slate-700">
              {entry.completedQuestions}/{entry.totalAssignedQuestions || 6}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              place === 1
                ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                : place === 2
                ? 'bg-gradient-to-r from-slate-400 to-slate-600'
                : 'bg-gradient-to-r from-amber-600 to-orange-600'
            }`}
            style={{
              width: `${Math.min(
                100,
                (entry.completedQuestions / (entry.totalAssignedQuestions || 6)) * 100
              )}%`
            }}
          />
        </div>

        {/* Last Evaluated Time */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-2.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {entry.lastEvaluationTime
              ? new Date(entry.lastEvaluationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Pending eval'}
          </span>
          <span className="font-semibold text-slate-500">
            Rank #{displayPosition}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Placeholder for empty podium place if fewer than 3 contestants
 */
const EmptyPodiumCard: React.FC<{ place: 1 | 2 | 3 }> = ({ place }) => {
  const titles = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };
  const tags = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div className="rounded-3xl p-5 border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center min-h-[220px]">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl mb-2 text-slate-400">
        {tags[place]}
      </div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {titles[place]}
      </span>
      <p className="text-[11px] text-slate-400 mt-1">
        Awaiting contestant submission...
      </p>
    </div>
  );
};
