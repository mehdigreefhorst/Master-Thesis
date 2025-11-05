'use client';

import { useState } from 'react';

interface HeroSectionProps {
  onGetStarted: (value: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onGetStarted(input);
    }
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-20 right-10 w-96 h-96 bg-[#E63946] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#06B6D4] rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-[slideInLeft_600ms_ease-out]">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Find What Your Market{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E63946] to-[#F9844A]">
                  Complains About
                </span>{' '}
                — Before Your Competitors Do.
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                VibeResearch turns Reddit conversations into quantified customer insights, so you can validate pain points with real data — not guesses.
              </p>
            </div>

            {/* CTA Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter subreddit or topic (e.g., r/SaaS)"
                className="flex-1 px-5 py-4 border-2 border-gray-300 rounded-lg focus:border-[#E63946] focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 transition-all"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-gradient-to-r from-[#E63946] to-[#F9844A] text-white font-bold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200 whitespace-nowrap"
              >
                Analyze My Niche →
              </button>
            </form>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free to use
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Public Reddit data
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative animate-[slideInRight_600ms_ease-out]">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
              {/* Dashboard Mockup */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Pain Point Clusters</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                    Live Data
                  </span>
                </div>

                {/* Heatmap visualization */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-8 bg-gradient-to-r from-[#E63946] to-[#F9844A] rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-white text-sm font-semibold">Food choices difficulty</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-12">37%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-8 bg-gradient-to-r from-[#06B6D4] to-[#06B6D4]/60 rounded-lg relative overflow-hidden" style={{ width: '75%' }}>
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-white text-sm font-semibold">Time management</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-12">28%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-8 bg-gradient-to-r from-[#F9844A] to-[#F9844A]/60 rounded-lg relative overflow-hidden" style={{ width: '60%' }}>
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-white text-sm font-semibold">Finding alternatives</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-12">22%</span>
                  </div>
                </div>

                {/* Reddit thread preview */}
                <div className="mt-6 space-y-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Sample Mentions</p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                    "I can't find a solution that works for my ADHD..."
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                    "Need alternatives to current tools, nothing fits..."
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl px-4 py-3 border-2 border-[#E63946] animate-[pulse_2s_ease-in-out_infinite]">
              <div className="text-xs text-gray-600">Data Detected</div>
              <div className="text-2xl font-bold text-[#E63946]">250+ mentions</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
