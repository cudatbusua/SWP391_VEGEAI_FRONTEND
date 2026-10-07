import React from 'react';
import { Leaf } from 'lucide-react';

export interface AuthLayoutProps {
  children: React.ReactNode;
  bannerImage: string;
  bannerBadge: string;
  bannerTitle: string;
  bannerDescription: string;
  quote?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  bannerImage,
  bannerBadge,
  bannerTitle,
  bannerDescription,
  quote
}) => {
  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#0c3823] via-[#092e1c] to-[#041a10] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* ================= BACKGROUND DECORATIONS: RAU XANH & LÁ CÂY ================= */}
      
      {/* 1. Ambient Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* 2. Top-Left: Cành Rau Thơm & Lá Bạc Hà (Mint / Basil) */}
      <div className="absolute -top-6 -left-6 w-56 h-56 sm:w-72 sm:h-72 pointer-events-none opacity-40 hover:opacity-60 transition duration-700 rotate-12">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-400">
          {/* Main Stem */}
          <path d="M20 180 Q60 100 120 40 Q150 10 180 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          {/* Big Leaf 1 */}
          <path d="M70 120 C40 100 30 60 70 50 C100 60 90 100 70 120 Z" fill="currentColor" opacity="0.4" />
          <path d="M70 120 Q65 80 70 50" stroke="#062617" strokeWidth="1.5" />
          {/* Leaf 2 */}
          <path d="M110 80 C130 50 160 55 170 85 C140 105 120 95 110 80 Z" fill="currentColor" opacity="0.5" />
          <path d="M110 80 Q140 80 170 85" stroke="#062617" strokeWidth="1.5" />
          {/* Leaf 3 */}
          <path d="M130 50 C140 20 170 20 180 40 C170 65 145 60 130 50 Z" fill="currentColor" opacity="0.6" />
          {/* Side baby sprout */}
          <path d="M45 145 C25 130 20 105 45 100 C65 105 60 135 45 145 Z" fill="currentColor" opacity="0.35" />
        </svg>
      </div>

      {/* 3. Top-Right: Nhánh Cải Xoăn & Đậu Hà Lan (Kale / Pea Pods) */}
      <div className="absolute top-4 -right-10 w-60 h-60 sm:w-80 sm:h-80 pointer-events-none opacity-35 -rotate-12">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-300">
          {/* Pea Vine */}
          <path d="M190 20 Q120 50 80 110 Q50 160 20 190" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
          {/* Curled Tendril */}
          <path d="M120 50 Q140 30 160 45 Q175 60 155 70 Q140 75 145 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" fill="none" />
          {/* Pea Pod 1 */}
          <path d="M130 65 C100 80 80 115 90 135 C115 125 135 95 130 65 Z" fill="currentColor" opacity="0.45" />
          {/* Peas inside */}
          <circle cx="102" cy="112" r="5" fill="#0c3823" opacity="0.5" />
          <circle cx="112" cy="98" r="5" fill="#0c3823" opacity="0.5" />
          <circle cx="120" cy="84" r="5" fill="#0c3823" opacity="0.5" />
          {/* Curled Leaf */}
          <path d="M70 120 C40 110 30 80 60 70 C80 80 85 105 70 120 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* 4. Bottom-Left: Nhánh Rau Mùi & Lá Xà Lách (Coriander / Lettuce) */}
      <div className="absolute -bottom-10 -left-10 w-64 h-64 sm:w-88 sm:h-88 pointer-events-none opacity-35 rotate-45">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-400">
          <path d="M10 10 Q80 80 140 140 Q170 170 190 190" stroke="currentColor" strokeWidth="3" opacity="0.4" />
          {/* Lettuce frill leaves */}
          <path d="M70 70 C50 40 20 50 30 80 C20 110 60 110 70 70 Z" fill="currentColor" opacity="0.4" />
          <path d="M110 110 C90 80 60 90 80 120 C70 150 110 150 110 110 Z" fill="currentColor" opacity="0.5" />
          <path d="M140 140 C130 110 100 120 115 145 C110 170 145 175 140 140 Z" fill="currentColor" opacity="0.45" />
        </svg>
      </div>

      {/* 5. Bottom-Right: Nhánh Hương Thảo & Quả Quất / Chanh Vàng (Rosemary & Botanical) */}
      <div className="absolute -bottom-12 -right-12 w-64 h-64 sm:w-84 sm:h-84 pointer-events-none opacity-40 -rotate-45">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-teal-300">
          {/* Main Woody Stem */}
          <path d="M190 190 Q120 130 60 70 Q30 30 10 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
          {/* Rosemary needles */}
          <path d="M140 150 L110 135" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M150 140 L165 115" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M110 120 L80 110" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M120 110 L140 85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M80 90 L55 85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M90 80 L105 55" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M50 60 L30 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <path d="M60 50 L75 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>

      {/* 6. Subtle Floating Leaf Silhouettes */}
      <div className="absolute top-1/4 left-8 text-emerald-400/25 pointer-events-none animate-pulse">
        <Leaf className="w-8 h-8 rotate-45" />
      </div>
      <div className="absolute top-1/3 right-12 text-emerald-300/20 pointer-events-none animate-bounce duration-1000">
        <Leaf className="w-10 h-10 -rotate-12" />
      </div>
      <div className="absolute bottom-1/4 left-16 text-teal-400/20 pointer-events-none">
        <Leaf className="w-7 h-7 180" />
      </div>
      <div className="absolute bottom-1/3 right-20 text-emerald-400/25 pointer-events-none animate-pulse">
        <Leaf className="w-9 h-9 90" />
      </div>

      {/* ================= MAIN CARD CONTAINER ================= */}
      <div className="w-full max-w-6xl min-h-[720px] bg-white rounded-3xl shadow-2xl shadow-black/40 border border-emerald-500/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 backdrop-blur-sm">
        
        {/* Left Column: Image Banner (Images 1, 2, 3, 4) */}
        <div className="lg:col-span-6 relative min-h-[420px] lg:min-h-full overflow-hidden bg-slate-900 flex flex-col justify-between p-8 sm:p-10 text-white">
          
          {/* Background Image with Dark Gradient Overlay */}
          <img
            src={bannerImage}
            alt="VEGEAI Banner"
            className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center">
            <div className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-300 flex items-center justify-center transition group-hover:scale-105">
                <Leaf className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-extrabold tracking-wider text-xl text-white drop-shadow-sm">
                VEGEAI
              </span>
            </div>
          </div>

          {/* Bottom Banner Content */}
          <div className="relative z-10 space-y-3 mt-auto pt-16">
            {bannerBadge && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{bannerBadge}</span>
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white drop-shadow">
              {bannerTitle}
            </h2>

            <p className="text-sm text-gray-200/90 leading-relaxed font-light drop-shadow-sm max-w-lg">
              {bannerDescription}
            </p>

            {quote && (
              <p className="text-xs italic text-emerald-200/90 pt-2 border-t border-white/10">
                "{quote}"
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Form Container (Images 1, 2, 3, 4) */}
        <div className="lg:col-span-6 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 bg-white">
          <div className="w-full max-w-md mx-auto">
            {children}
          </div>
        </div>

      </div>

    </div>
  );
};
