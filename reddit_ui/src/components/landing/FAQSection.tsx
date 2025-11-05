'use client';

import { useState } from 'react';

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Why Reddit? My customers aren't all there.",
      answer: "Reddit is the web's largest open-conversation dataset where people can vent without repercussions. If your audience talks online, they leave a footprint here — even in adjacent communities. Our smart subreddit discovery finds related communities you didn't know existed.",
    },
    {
      question: "How accurate is the data?",
      answer: "All statements by our system can be verified by looking at the proof we give through number of mentions, AI analysis, and your own subjective intuition. You can review the original Reddit posts, see the context, and validate the findings yourself. Our dashboard shows you both the quantified data and the raw conversations.",
    },
    {
      question: "Can I analyze private subreddits?",
      answer: "Only public subreddits are possible to search in for now. We respect Reddit's privacy settings and community guidelines. However, public Reddit contains millions of valuable conversations that provide incredible market insights.",
    },
    {
      question: "How do you ensure ethical data use?",
      answer: "We adhere to Reddit's terms of use to make sure Reddit users stay protected. We only analyze public Reddit data and comply with EU data protection standards (GDPR). We never collect personal information, and all data is anonymized for analysis purposes.",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about VibeResearch
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden transition-all duration-300 hover:border-[#E63946]"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors"
              >
                <span className="font-semibold text-gray-900 text-lg pr-4">
                  {faq.question}
                </span>
                <svg
                  className={`w-6 h-6 text-gray-500 shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-5 text-gray-700 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* GDPR Notice */}
        <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-blue-600 shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Privacy & Compliance</h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                We only analyze public Reddit data and comply with EU data protection standards (GDPR). All data processing is done ethically and in accordance with Reddit's terms of service. We never store personal information or share data with third parties.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
