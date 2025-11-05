'use client';

import { useState } from 'react';

interface CTABarProps {
  onSubmit: (value: string) => void;
}

export const CTABar: React.FC<CTABarProps> = ({ onSubmit }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input);
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-[#E63946] to-[#F9844A] shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Text */}
          <div className="text-white">
            <h3 className="text-2xl font-bold mb-1">
              Uncover your market's hidden problems today
            </h3>
            <p className="text-white/90 text-sm">
              Start analyzing Reddit conversations in minutes
            </p>
          </div>

          {/* Right: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter subreddit or keyword"
              className="flex-1 md:w-80 px-5 py-3 rounded-lg border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/70 focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-white text-[#E63946] font-bold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              Get Insights Now →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
