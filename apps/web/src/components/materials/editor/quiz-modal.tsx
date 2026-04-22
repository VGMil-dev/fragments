"use client";

import { useState } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";

export interface QuizData {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export function QuizModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuizData) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctAnswerIndex >= newOptions.length) {
      setCorrectAnswerIndex(0);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || options.some((opt) => !opt)) return;
    onSubmit({ question, options, correctAnswerIndex });
    onClose();
    // Reset state
    setQuestion("");
    setOptions(["", ""]);
    setCorrectAnswerIndex(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold text-white">Configure Quiz</h2>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question here..."
              className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-white/20 text-white placeholder:text-white/20 resize-none transition-colors"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">Options</label>
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Option
              </button>
            </div>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCorrectAnswerIndex(index)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      correctAnswerIndex === index
                        ? "bg-white border-white text-black"
                        : "border-white/20 text-transparent hover:border-white/40"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-grow p-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-white/20 text-white placeholder:text-white/20 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    className="p-2 text-white/30 hover:text-red-400 disabled:opacity-0 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 px-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
            >
              Insert Quiz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
