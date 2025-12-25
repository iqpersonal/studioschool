import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BookOpen, Clock, Target, Sparkles, Copy, Printer, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const LessonPlanner: React.FC = () => {
    const functions = getFunctions();
    const [loading, setLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        topic: '',
        subject: '',
        grade: '',
        duration: '45 mins',
        objectives: ''
    });

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setGeneratedPlan(null);

        try {
            const generateLessonPlan = httpsCallable(functions, 'generateLessonPlan');
            const result = await generateLessonPlan(formData);
            const data = result.data as { text: string };
            setGeneratedPlan(data.text);
        } catch (error) {
            console.error("Error generating lesson plan:", error);
            alert("Failed to generate lesson plan. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedPlan) {
            navigator.clipboard.writeText(generatedPlan);
            alert("Lesson plan copied to clipboard!");
        }
    };

    const printPlan = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 print:hidden">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
                    AI Lesson Planner
                </h1>
                <p className="text-gray-500 mt-1">Generate structured, engaging lesson plans in seconds.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Form */}
                <div className="lg:col-span-1 print:hidden">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Mathematics, Science"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                                <select
                                    required
                                    value={formData.grade}
                                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                >
                                    <option value="">-- Select Grade --</option>
                                    {['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                                        <option key={g} value={`Grade ${g}`}>Grade {g}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Photosynthesis, Fractions"
                                    value={formData.topic}
                                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                <select
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                >
                                    <option value="30 mins">30 mins</option>
                                    <option value="45 mins">45 mins</option>
                                    <option value="60 mins">60 mins</option>
                                    <option value="90 mins">90 mins</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Specific Objectives (Optional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Any specific goals or standards to cover..."
                                    value={formData.objectives}
                                    onChange={e => setFormData({ ...formData, objectives: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Plan
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Output Display */}
                <div className="lg:col-span-2">
                    {generatedPlan ? (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-[600px]">
                            <div className="flex justify-end space-x-2 mb-6 print:hidden">
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy
                                </button>
                                <button
                                    onClick={printPlan}
                                    className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print
                                </button>
                            </div>
                            <div className="prose prose-purple max-w-none">
                                <ReactMarkdown>{generatedPlan}</ReactMarkdown>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 print:hidden">
                            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Ready to plan your next lesson?</p>
                            <p className="text-sm mt-2">Fill out the details on the left to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonPlanner;
