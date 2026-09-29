'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import {
  X,
  Camera,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  Maximize2,
  Award,
  Send,
  FileCheck
} from 'lucide-react';

interface QuestionDetailModalProps {
  questionId: string;
  assessmentId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  questionId,
  assessmentId,
  onClose,
  onSubmitted
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Staged / Selected File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileNameText, setFileNameText] = useState<string>('');
  const [fileSizeText, setFileSizeText] = useState<string>('');

  // UI state
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchQuestionDetails();
  }, [questionId]);

  const fetchQuestionDetails = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/student/questions/${questionId}`);
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch question details');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format date like "29 Sep 2026, 10:32 PM"
  const formatSubmissionDate = (dateString?: string | Date) => {
    if (!dateString) return '';
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

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Format check (PNG, JPG, JPEG, WEBP)
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setErrorMsg('Invalid file format. Please upload a PNG, JPG, JPEG, or WEBP image.');
        return;
      }

      // Size check (Max 5 MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('File size exceeds the 5 MB limit. Please select a smaller screenshot.');
        return;
      }

      setSelectedFile(file);
      setFileNameText(file.name);
      setFileSizeText(
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`
      );
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  // Trigger file picker
  const handleChooseScreenshot = () => {
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Remove screenshot: clears selected file, preview, and resets UI to Upload state
  const handleRemoveScreenshot = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileNameText('');
    setFileSizeText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMsg(null);
  };

  // Replace screenshot: triggers file picker to choose another image
  const handleReplace = () => {
    handleChooseScreenshot();
  };

  // Delete/Remove existing submission from server
  const handleDeleteSubmission = async () => {
    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiRequest('/student/submissions', {
        method: 'DELETE',
        body: JSON.stringify({
          questionId,
          assessmentId
        })
      });

      if (res.success) {
        setSuccessMsg('✓ Submission removed successfully. You can now upload a new screenshot.');
        setSelectedFile(null);
        setPreviewUrl(null);
        setFileNameText('');
        setFileSizeText('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setShowConfirmRemove(false);
        setData((prev: any) => (prev ? { ...prev, submission: null, evaluation: null } : null));
        await fetchQuestionDetails();
        onSubmitted();
      } else {
        setErrorMsg(res.message || 'Failed to remove submission');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error removing submission');
    } finally {
      setDeleting(false);
    }
  };

  // Submit for Evaluation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Submission Validation: Requires screenshot
    if (!selectedFile && !data?.submission?.screenshotUrl) {
      setErrorMsg('Please upload your code and output screenshot before submitting.');
      return;
    }

    if (!selectedFile && data?.submission) {
      setErrorMsg('This screenshot is already submitted. To update, click Replace to choose a new screenshot.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('questionId', questionId);
      formData.append('assessmentId', assessmentId);
      formData.append('screenshot', selectedFile!);

      const res = await apiRequest('/student/submissions', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        setSuccessMsg('✓ Screenshot Submitted');
        // Clear local staging
        setSelectedFile(null);
        setPreviewUrl(null);
        // Refresh question details from server to display submitted state
        await fetchQuestionDetails();
        onSubmitted();
      } else {
        setErrorMsg(res.message || 'Submission failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading screenshot');
    } finally {
      setUploading(false);
    }
  };

  const backendHost = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const existingScreenshotUrl = data?.submission?.screenshotUrl
    ? data.submission.screenshotUrl.startsWith('http')
      ? data.submission.screenshotUrl
      : `${backendHost}${data.submission.screenshotUrl}`
    : null;

  const isEvaluated = data?.submission?.status === 'EVALUATED';
  const isSubmitted = !!data?.submission;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-5xl bg-white rounded-[32px] sm:rounded-[36px] border border-slate-200 overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    data?.question?.difficulty === 'easy'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : data?.question?.difficulty === 'medium'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {data?.question?.difficulty || 'easy'}
                </span>
                <span className="text-xs text-slate-500 font-medium">• {data?.question?.category}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
                  {data?.question?.marks || 10} Points
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {loading ? 'Loading Problem...' : data?.question?.title}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          {loading ? (
            <div className="p-16 text-center text-slate-500 font-medium">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading problem specification...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 overflow-y-auto flex-1">
              
              {/* Left Column: Problem Details (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4 pr-0 lg:pr-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Description & Task
                  </h4>
                  {(() => {
                    const desc = data?.question?.description;
                    if (!desc) return null;
                    if (!desc.includes('```')) {
                      return (
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                          {desc}
                        </p>
                      );
                    }
                    const parts = desc.split('```');
                    return (
                      <div className="space-y-3">
                        {parts.map((part: string, i: number) => {
                          if (i % 2 === 1) {
                            let codeText = part;
                            let lang = '';
                            if (part.startsWith('cpp\n') || part.startsWith('cpp\r\n')) {
                              lang = 'C++';
                              codeText = part.replace(/^cpp\r?\n/, '');
                            }
                            return (
                              <div
                                key={i}
                                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden my-2.5 shadow-inner"
                              >
                                {lang && (
                                  <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/70 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <span>{lang} Snippet</span>
                                  </div>
                                )}
                                <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre">
                                  {codeText.trim()}
                                </pre>
                              </div>
                            );
                          } else if (part.trim()) {
                            return (
                              <p
                                key={i}
                                className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium"
                              >
                                {part.trim()}
                              </p>
                            );
                          }
                          return null;
                        })}
                      </div>
                    );
                  })()}
                </div>

                {data?.question?.inputFormat && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Input Format
                    </h5>
                    <p className="text-xs text-slate-700 font-mono whitespace-pre-line">
                      {data?.question?.inputFormat}
                    </p>
                  </div>
                )}

                {data?.question?.outputFormat && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Output Format
                    </h5>
                    <p className="text-xs text-slate-700 font-mono whitespace-pre-line">
                      {data?.question?.outputFormat}
                    </p>
                  </div>
                )}

                {data?.question?.constraints && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Constraints
                    </h5>
                    <p className="text-xs text-slate-600 font-mono whitespace-pre-line">
                      {data?.question?.constraints}
                    </p>
                  </div>
                )}

                {data?.question?.sampleInput && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Sample Input
                      </span>
                      <pre className="text-xs text-emerald-400 font-mono overflow-x-auto">
                        {data?.question?.sampleInput}
                      </pre>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Sample Output
                      </span>
                      <pre className="text-xs text-cyan-300 font-mono overflow-x-auto">
                        {data?.question?.sampleOutput}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Screenshot Upload & Submission Section (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-start bg-slate-50/90 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
                
                <div className="space-y-4">
                  {/* Section Title */}
                  <div className="border-b border-slate-200/80 pb-3">
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-violet-600" />
                      Upload Code & Output Screenshot
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Capture your IDE editor showing the solution code and execution output.
                    </p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Notifications */}
                  {errorMsg && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* SUBMISSION STATE A: NEW SCREENSHOT SELECTED (PREVIEW STATE) */}
                  {previewUrl && (
                    <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5 text-violet-700">
                          <CheckCircle2 className="w-4 h-4 text-violet-600" />
                          Screenshot Preview
                        </span>
                        <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Ready to Submit
                        </span>
                      </div>

                      {/* Image Preview Box */}
                      <div
                        onClick={() => setEnlargedImage(previewUrl)}
                        className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-56 flex items-center justify-center cursor-pointer group"
                        title="Click to view enlarged"
                      >
                        <img
                          src={previewUrl}
                          alt="Screenshot Preview"
                          className="w-full h-auto max-h-52 object-contain group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity">
                          <Maximize2 className="w-4 h-4" />
                          Click to Enlarge
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                          {fileNameText}
                        </span>
                        <span className="text-slate-500 font-medium shrink-0">
                          {fileSizeText}
                        </span>
                      </div>

                      {/* Controls: Remove Screenshot & Replace */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="flex-1 py-2 px-3 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove Screenshot
                        </button>
                        <button
                          type="button"
                          onClick={handleReplace}
                          className="flex-1 py-2 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Replace
                        </button>
                      </div>

                      {/* Submit for Evaluation Button Directly Under Photo & Controls */}
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={uploading}
                          className="w-full py-3 px-5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {uploading ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Submitting for Evaluation...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Submit for Evaluation</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUBMISSION STATE B: PREVIOUSLY SUBMITTED SCREENSHOT (NO NEW FILE SELECTED) */}
                  {!previewUrl && existingScreenshotUrl && (
                    <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                      {/* Status Header */}
                      <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ✓ Screenshot Submitted
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isEvaluated
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            Status: {isEvaluated ? 'Evaluated' : 'Under Review'}
                          </span>
                        </div>
                        {data?.submission?.submittedAt && (
                          <p className="text-[11px] text-slate-600 font-medium">
                            Submitted: {formatSubmissionDate(data.submission.submittedAt)}
                          </p>
                        )}
                      </div>

                      {/* Evaluated Marks Banner */}
                      {isEvaluated && data?.evaluation && (
                        <div className="p-3 rounded-2xl bg-violet-50 border border-violet-200 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-violet-900 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-violet-600" />
                              Faculty Award:
                            </span>
                            <span className="font-black text-violet-800 text-sm">
                              {data.evaluation.marksObtained} / {data.evaluation.maximumMarks} Marks
                            </span>
                          </div>
                          {data.evaluation.feedback && (
                            <p className="text-[11px] text-slate-600 font-medium italic">
                              &quot;{data.evaluation.feedback}&quot;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Image Preview Box */}
                      <div
                        onClick={() => setEnlargedImage(existingScreenshotUrl)}
                        className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-56 flex items-center justify-center cursor-pointer group"
                        title="Click to view enlarged"
                      >
                        <img
                          src={existingScreenshotUrl}
                          alt="Submitted Screenshot"
                          className="w-full h-auto max-h-52 object-contain group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity">
                          <Maximize2 className="w-4 h-4" />
                          Click to Enlarge
                        </div>
                      </div>

                      {/* Filename */}
                      <div className="text-[11px] text-slate-500 font-medium px-1 flex items-center justify-between">
                        <span className="truncate max-w-[200px]">
                          {data?.submission?.screenshotFileName || 'Submitted Screenshot Proof'}
                        </span>
                        <span className="text-slate-400">Click image to enlarge</span>
                      </div>

                      {/* Replace / Remove Controls for Active Submission */}
                      {showConfirmRemove ? (
                        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 animate-in fade-in">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Remove this submission?</span>
                          </div>
                          <p className="text-[11px] text-rose-700 font-medium">
                            This will delete your submitted screenshot and reset the question so you can upload a new solution.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleDeleteSubmission}
                              disabled={deleting}
                              className="flex-1 py-2 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              {deleting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Removing...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Yes, Remove</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowConfirmRemove(false)}
                              disabled={deleting}
                              className="flex-1 py-2 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowConfirmRemove(true)}
                              disabled={deleting}
                              className="flex-1 py-2.5 px-3 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Screenshot</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleReplace}
                              disabled={deleting}
                              className="flex-1 py-2.5 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Replace</span>
                            </button>
                          </div>

                          {isEvaluated ? (
                            <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 font-medium text-center flex items-center justify-center gap-1.5 border border-slate-200/80">
                              <span>🔒 Evaluated & Finalized. Click Remove to delete and re-submit.</span>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-amber-50 text-[11px] text-amber-800 font-semibold text-center border border-amber-200">
                              ⏳ Submission is under faculty review. Click Remove or Replace to update.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBMISSION STATE C: BEFORE SELECTING AN IMAGE (EMPTY STATE) */}
                  {!previewUrl && !existingScreenshotUrl && (
                    <div className="space-y-3">
                      <div
                        onClick={handleChooseScreenshot}
                        className="border-2 border-dashed border-slate-300 hover:border-violet-500 rounded-3xl p-6 sm:p-7 text-center bg-white hover:bg-violet-50/30 transition-all shadow-xs cursor-pointer group space-y-3"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 group-hover:bg-violet-100 text-violet-600 mx-auto flex items-center justify-center transition-colors">
                          <Camera className="w-6 h-6" />
                        </div>

                        <div>
                          <h5 className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                            Upload Screenshot
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            Upload your code & output screenshot
                          </p>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChooseScreenshot();
                            }}
                            className="px-4 py-2 rounded-full bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold transition-colors shadow-2xs"
                          >
                            Choose Screenshot
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-400 font-medium">
                          PNG, JPG, JPEG, WEBP • Max 5 MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleChooseScreenshot}
                        className="w-full py-3 px-5 rounded-full bg-slate-100 hover:bg-violet-50 text-slate-400 hover:text-violet-700 border border-slate-200 hover:border-violet-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4 text-slate-400" />
                        <span>Select Screenshot to Submit</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* Lightbox / Enlarged Screenshot View Modal */}
      {enlargedImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl p-2 border border-slate-800 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-4 py-2 border-b border-slate-800 text-white text-xs font-bold">
              <span>Code & Output Screenshot Preview</span>
              <button
                onClick={() => setEnlargedImage(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                aria-label="Close enlarged preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={enlargedImage}
                alt="Enlarged Screenshot"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
