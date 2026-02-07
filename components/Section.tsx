
import React from 'react';

interface SectionProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ step, title, children }) => (
  <section className="bg-[#1e1e1e] rounded-xl p-4 sm:p-6 mb-8 border border-gray-800 shadow-lg">
    <div className="flex items-center gap-4 mb-4 border-b border-gray-700 pb-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex-shrink-0">
        {step}
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="px-2">
      {children}
    </div>
  </section>
);

export default Section;
