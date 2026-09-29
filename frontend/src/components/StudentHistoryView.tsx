'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { SubmissionItem } from '../types';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  UserCheck,
  Trophy,
  ExternalLink,
  Camera,
  Maximize2,
  X,
  FileCode,
  Flame,
  AlertCircle,
  Award,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface StudentHistoryViewProps {
  studentId: string;
  onBack: () => void;
  onSelectSubmission: (submission: SubmissionItem) => void;
  refreshTrigger?: number;
}

export const StudentHistoryView: React.FC<StudentHistoryViewProps> = ({
  studentId,
  onBack,
  onSelectSubmission,
  refreshTrigger = 0
}) => {
  const backendHost = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [enlargedScreenshot, setEnlargedScreenshot] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchStudentHistory();
  }, [studentId, refreshTrigger]);

  const fetchStudentHistory = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest(`/submissions/student/${encodeURIComponent(studentId)}`);
      if (res.success) {
        setStudentData(res);
      } else {
        setErrorMsg(res.message || 'Failed to fetch student submission history.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const formatSubmissionDate = (dateString?: string | Date) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const day = d.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };

  const getImgUrl = (url?: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${backendHost}${url}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] p-12 border border-slate-200/90 shadow-sm text-center space-y-4">
        <div className="w-9 h-9 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Loading student submission history...</p>
      </div>
    );
  }

  if (errorMsg || !studentData) {
    return (
      <div className="bg-white rounded-[32px] p-8 border border-slate-200/90 shadow-sm space-y-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to All Submissions</span>
        </button>
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg || 'Student history could not be loaded.'}</span>
        </div>
      </div>
    );
  }

  const { student, stats, submissions } = studentData;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Navigation Bar: Back button */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition-all flex items-center gap-2 shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-violet-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>← Back to All Submissions</span>
        </button>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Viewing individual candidate history • Evaluator Mode
        </span>
      </div>

      {/* 3. Student Summary Box */}
      <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden space-y-6">
        
        {/* Profile Details Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[2px] shadow-md shadow-violet-500/20 shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center font-black text-slate-900 text-xl">
                {student?.name?.charAt(0) || 'S'}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                  Student Profile
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Section: {student?.section || 'D'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {student?.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 font-medium">
                <span>
                  Roll No: <strong className="text-slate-800">{student?.studentId || '24CSE001'}</strong>
                </span>
                <span>•</span>
                <span>
                  Email: <strong className="text-slate-800">{student?.email}</strong>
                </span>
                <span>•</span>
                <span>{student?.department || 'Computer Science & Engineering'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start xl:self-auto">
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xs">
              {stats?.totalSubmissions || 0} / {stats?.totalAssigned || 6} Questions Submitted
            </span>
          </div>
        </div>

        {/* Dynamic KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Submissions
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {stats?.totalSubmissions ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Evaluated
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block">
              {stats?.evaluatedCount ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center relative overflow-hidden">
            {(stats?.pendingCount ?? 0) > 0 && (
              <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Pending
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-600 mt-1 block">
              {stats?.pendingCount ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Score
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-violet-700">
                {stats?.totalMarks ?? 0}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                /{stats?.maxPossibleMarks ?? 80}
              </span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Accuracy
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 block">
              {stats?.percentage ?? 0}%
            </span>
          </div>
        </div>

      </div>

      {/* 4. Complete Questions & Submission History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-600" />
            Assigned Problem Set & Submission History ({submissions?.length || 0})
          </h3>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Click &quot;View Submission&quot; or &quot;Edit Marks&quot; to review solution in Evaluation Studio
          </span>
        </div>

        {submissions && submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((item: any, idx: number) => {
              const imgUrl = getImgUrl(item.screenshotUrl);
              const isNotSubmitted = item.status === 'NOT_SUBMITTED';
              const isEvaluated = item.status === 'EVALUATED';
              const isPending = item.status === 'PENDING' || item.status === 'UNDER_REVIEW' || item.status === 'SUBMITTED';

              return (
                <div
                  key={item.questionId || idx}
                  className={`bg-white rounded-[26px] p-5 sm:p-6 border transition-all ${
                    isEvaluated
                      ? 'border-emerald-200 shadow-sm hover:border-emerald-300'
                      : isPending
                      ? 'border-rose-200/90 shadow-sm hover:border-rose-300'
                      : 'border-slate-200/80 bg-slate-50/40'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    
                    {/* Left: Question info & tags */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-800">
                          Q{item.order || idx + 1}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            item.difficulty === 'easy'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.difficulty === 'medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {item.difficulty || 'easy'}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {item.category || 'General'}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`text-[11px] font-bold px-3 py-0.5 rounded-full border flex items-center gap-1 ${
                            isEvaluated
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : isPending
                              ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {isEvaluated ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Status: Evaluated</span>
                            </>
                          ) : isPending ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              <span>Status: Pending Review</span>
                            </>
                          ) : (
                            <span>Status: Not Submitted</span>
                          )}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {item.questionTitle}
                      </h4>

                      {/* Timestamps & Score Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        {item.submittedAt ? (
                          <span>
                            Submitted: <strong className="text-slate-800">{formatSubmissionDate(item.submittedAt)}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No submission received yet</span>
                        )}

                        <span>•</span>

                        <span>
                          Max Marks: <strong className="text-slate-800">{item.maxMarks} pts</strong>
                        </span>

                        <span>•</span>

                        <span>
                          Score:{' '}
                          {isEvaluated ? (
                            <strong className="text-emerald-700 font-black">
                              {item.awardedMarks} / {item.maxMarks}
                            </strong>
                          ) : (
                            <strong className="text-slate-400">—</strong>
                          )}
                        </span>
                      </div>

                      {/* Faculty Feedback (if evaluated) */}
                      {item.feedback && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 mt-2 font-medium">
                          <span className="font-bold text-slate-900">Evaluator Feedback:</span> &quot;{item.feedback}&quot;
                        </div>
                      )}
                    </div>

                    {/* Right: Screenshot Preview & Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                      
                      {/* Screenshot thumbnail (if submitted) */}
                      {imgUrl ? (
                        <div
                          onClick={() => setEnlargedScreenshot({ url: imgUrl, title: item.questionTitle })}
                          className="w-full sm:w-36 h-24 rounded-2xl bg-slate-950 border border-slate-200 overflow-hidden relative group cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
                          title="Click to view full screenshot"
                        >
                          <img
                            src={imgUrl}
                            alt="Screenshot"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white text-[10px] font-bold transition-opacity">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Enlarge</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full sm:w-36 h-24 rounded-2xl bg-slate-100 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-[11px] font-medium shrink-0">
                          <Camera className="w-5 h-5 mb-1 text-slate-300" />
                          <span>No Screenshot</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        {isEvaluated && item.submission ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onSelectSubmission(item.submission)}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Submission</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectSubmission(item.submission)}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>Edit Marks</span>
                            </button>
                          </>
                        ) : isPending && item.submission ? (
                          <button
                            type="button"
                            onClick={() => onSelectSubmission(item.submission)}
                            className="w-full px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-violet-600/20"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Review Submission</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full px-4 py-2 rounded-full bg-slate-100 text-slate-400 text-xs font-medium border border-slate-200 cursor-not-allowed text-center"
                          >
                            Not Submitted
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200 text-slate-500 text-xs font-medium">
            No assigned questions or submission history found for this student.
          </div>
        )}
      </div>

      {/* Screenshot Lightbox Modal */}
      {enlargedScreenshot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedScreenshot(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl p-3 border border-slate-800 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-800 text-white text-xs font-bold">
              <div>
                <span className="text-violet-400 font-extrabold">{student?.name}</span>
                <span className="text-slate-400 font-normal"> — {enlargedScreenshot.title}</span>
              </div>
              <button
                onClick={() => setEnlargedScreenshot(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label="Close lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={enlargedScreenshot.url}
                alt={enlargedScreenshot.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
