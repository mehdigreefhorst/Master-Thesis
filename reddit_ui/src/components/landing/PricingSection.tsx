'use client';

import Link from 'next/link';

export const PricingSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Getting Started
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            VibeResearch is currently free to use while in beta. You'll need a Reddit API key to get started.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-200 p-8 md:p-12 relative overflow-hidden">
            {/* Accent decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E63946]/10 to-[#F9844A]/10 rounded-full blur-3xl -z-10" />

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Info */}
              <div className="space-y-6">
                <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
                  Free Beta Access
                </div>

                <h3 className="text-3xl font-bold text-gray-900">
                  Start Researching Today
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong className="text-gray-900">Unlimited subreddit searches</strong>
                      <p className="text-gray-600 text-sm">Discover related communities and map your audience</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong className="text-gray-900">AI-powered pain point extraction</strong>
                      <p className="text-gray-600 text-sm">Quantify customer needs with NLP analysis</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong className="text-gray-900">Interactive insights dashboard</strong>
                      <p className="text-gray-600 text-sm">Visualize clusters, verify labels, and export data</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <strong className="text-gray-900">Public Reddit data only</strong>
                      <p className="text-gray-600 text-sm">GDPR compliant, ethical data use</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: CTA */}
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Required to get started:</div>
                    <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <svg className="w-6 h-6 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold text-gray-900">Reddit API Key</div>
                        <div className="text-sm text-gray-600">Free to obtain from Reddit</div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/login"
                    className="block w-full px-6 py-4 bg-gradient-to-r from-[#E63946] to-[#F9844A] text-white font-bold text-center rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    Get Started Free →
                  </Link>

                  <div className="text-center text-sm text-gray-500">
                    No credit card required · Free forever
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
