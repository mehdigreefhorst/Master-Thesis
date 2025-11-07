'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { StorySection } from '@/components/landing/StorySection';
import { TestimonialCarousel } from '@/components/landing/TestimonialCarousel';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTABar } from '@/components/landing/CTABar';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const [email, setEmail] = useState('');

  const handleGetStarted = (inputValue: string) => {
    console.log('Getting started with:', inputValue);
    // TODO: Navigate to signup or handle email submission
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/landing" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#E63946] to-[#F9844A] rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">VibeResearch</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-[#E63946] transition-colors font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-[#E63946] transition-colors font-medium">
                How It Works
              </a>
              <a href="#faq" className="text-gray-600 hover:text-[#E63946] transition-colors font-medium">
                FAQ
              </a>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-gradient-to-r from-[#E63946] to-[#F9844A] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20">
        <HeroSection onGetStarted={handleGetStarted} />

        {/* Quick Snapshot */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              <strong className="text-gray-900">VibeResearch scans Reddit to uncover what people actually struggle with inside your target niche.</strong> You enter a subreddit or audience idea — we map related communities, extract problem-focused discussions, and quantify unmet needs. Perfect for founders, marketers, and researchers validating new products.
            </p>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-[#E63946] font-semibold hover:gap-3 transition-all"
            >
              See how it works
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </section>

        <FeatureGrid />
        <StorySection />
        <TestimonialCarousel />
        <PricingSection />
        <FAQSection />
      </main>

      <CTABar onSubmit={handleGetStarted} />
      <LandingFooter />
    </div>
  );
}
