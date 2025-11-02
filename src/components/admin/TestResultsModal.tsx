import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Download, Eye } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  total_marks: number;
}

interface AttemptResult {
  id: string;
  user_id: string;
  score: number;
  total_marks: number;
  time_taken_seconds: number | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  user: {
    full_name: string;
    email: string;
  };
}

export const TestResultsModal = ({ test, onClose }: { test: Test; onClose: () => void }) => {
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    const { data, error } = await supabase
      .from('test_attempts')
      .select(`
        *,
        users:user_id (
          full_name,
          email
        )
      `)
      .eq('test_id', test.id)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map(item => ({
        ...item,
        user: Array.isArray(item.users) ? item.users[0] : item.users,
      }));
      setResults(formatted);
    }
    setLoading(false);
  };

  const loadDetailedAnswers = async (attemptId: string) => {
    const { data, error } = await supabase
      .from('attempt_answers')
      .select(`
        *,
        questions:question_id (
          question_text,
          question_type,
          options,
          correct_answers,
          marks
        )
      `)
      .eq('attempt_id', attemptId)
      .order('created_at');

    if (!error && data) {
      setDetailedAnswers(data);
      setSelectedAttempt(attemptId);
    }
  };

  const downloadCSV = () => {
    const headers = [
      'Student Name',
      'Email',
      'Score',
      'Total Marks',
      'Percentage',
      'Time Taken',
      'Status',
      'Started At',
      'Submitted At',
    ];

    const rows = results.map(result => [
      result.user.full_name,
      result.user.email,
      result.score,
      result.total_marks,
      ((result.score / result.total_marks) * 100).toFixed(2) + '%',
      result.time_taken_seconds
        ? result.time_taken_seconds < 60
          ? `${result.time_taken_seconds}s`
          : `${Math.round(result.time_taken_seconds / 60)} min`
        : 'N/A',
      result.status,
      new Date(result.started_at).toLocaleString(),
      result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${test.title.replace(/\s+/g, '_')}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPercentage = (score: number, total: number) => ((score / total) * 100).toFixed(1);

  // =====================
  // Detailed Answers Modal
  // =====================
  if (selectedAttempt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">Detailed Answers</h2>
            <button
              onClick={() => setSelectedAttempt(null)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            <div className="space-y-6">
              {detailedAnswers.map((answer, index) => {
                const question = answer.questions;
                const selectedAnswers = answer.selected_answers || [];
                const correctAnswers = question.correct_answers || [];
                const options = question.options || [];

                return (
                  <div key={answer.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-slate-900">Question {index + 1}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          answer.is_correct
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {answer.is_correct ? 'Correct' : 'Incorrect'} ({answer.marks_obtained}/{question.marks})
                      </span>
                    </div>

                    <p className="text-slate-700 mb-4">{question.question_text}</p>

                    {/* All Options Display */}
                    <div className="space-y-2">
                      {options.map((opt: any, i: number) => {
                        const isCorrect = correctAnswers.includes(opt.id);
                        const isSelected = selectedAnswers.includes(opt.id);

                        let bg = 'bg-slate-50 border-slate-200 text-slate-800';
                        if (isCorrect && isSelected)
                          bg = 'bg-green-200 border-green-600 text-green-900';
                        else if (isCorrect)
                          bg = 'bg-green-50 border-green-400 text-green-800';
                        else if (isSelected && !isCorrect)
                          bg = 'bg-red-200 border-red-500 text-red-900';

                        return (
                          <div key={i} className={`border rounded-md p-2 text-sm ${bg}`}>
                            <span className="font-medium">{String.fromCharCode(65 + i)}.</span>{' '}
                            {opt.text}
                            {isCorrect && (
                              <span className="ml-2 text-green-700 font-semibold">(Correct Answer)</span>
                            )}
                            {isSelected && !isCorrect && (
                              <span className="ml-2 text-red-700 font-semibold">(Your Answer)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-slate-200">
            <button
              onClick={() => setSelectedAttempt(null)}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================
  // Main Results Table
  // =====================
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Test Results</h2>
            <p className="text-slate-600">{test.title}</p>
          </div>
          <div className="flex items-center gap-3">
            {results.length > 0 && (
              <button
                onClick={downloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg">No attempts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Student</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Email</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900">Score</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900">Percentage</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900">Time</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">{result.user.full_name}</td>
                      <td className="py-3 px-4 text-slate-600">{result.user.email}</td>
                      <td className="py-3 px-4 text-center font-medium">
                        {result.score}/{result.total_marks}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            parseFloat(getPercentage(result.score, result.total_marks)) >= 60
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {getPercentage(result.score, result.total_marks)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        {result.time_taken_seconds
                          ? result.time_taken_seconds < 60
                            ? `${result.time_taken_seconds}s`
                            : `${Math.round(result.time_taken_seconds / 60)} min`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            result.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : result.status === 'auto_submitted'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {result.status === 'auto_submitted' ? 'Auto Submitted' : result.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => loadDetailedAnswers(result.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
