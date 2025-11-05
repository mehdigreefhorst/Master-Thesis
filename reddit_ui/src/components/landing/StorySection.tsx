'use client';

export const StorySection = () => {
  return (
    <section id="how-it-works" className="py-20 bg-[#FFF5F5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Story */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Why We Built This
            </h2>

            {/* Pain */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-5 h-5 text-[#E63946]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">The Problem</h3>
                  <p className="text-gray-700 leading-relaxed">
                    You have a hunch about your market — but all you find online are opinions, not data. Traditional research is slow and expensive, and Reddit's goldmine of real pain points is buried under millions of threads.
                  </p>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Our Solution</h3>
                  <p className="text-gray-700 leading-relaxed">
                    VibeResearch automates Reddit exploration. We transform messy discussions into structured market signals, showing you exactly what customers struggle with — and how often.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Founder Bio */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E63946] to-[#F9844A] flex items-center justify-center text-white text-2xl font-bold">
                  VR
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900">Our Story</h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  Built by product researchers who were frustrated by building products that nobody needs, VibeResearch was born from a simple question: <strong>how do we quantify what the market needs using Reddit users' complaints or needs?</strong>
                </p>
                <p className="text-gray-700 leading-relaxed text-sm">
                  Our team combined data scraping, data science, and growth marketing experience to help founders replace assumptions with proof. We believe the best market research comes from listening to real conversations — at scale.
                </p>

                {/* Badge */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                    <svg className="w-5 h-5 text-[#E63946]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Built by researchers, for researchers</span>
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
