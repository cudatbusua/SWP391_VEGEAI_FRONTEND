import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Sun, Moon, ArrowLeft, ChefHat, CheckCircle2, HeartHandshake } from 'lucide-react';
import { useTheme } from '../store/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#f4f9f1] dark:bg-[#071a11] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      
      {/* ================= VEGAN DOODLE PATTERN WALLPAPER BACKGROUND ================= */}
      {/* Light mode: crisp lime-green botanical doodle pattern on soft cream-sage backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.42] dark:opacity-[0.14] dark:invert dark:hue-rotate-180 transition-opacity duration-500"
        style={{
          backgroundImage: "url('/images/vegan-doodle-pattern.png')",
          backgroundSize: '580px auto',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center center',
          mixBlendMode: theme === 'dark' ? 'screen' : 'multiply',
        }}
      />

      {/* Soft Radial Vignette so the central card pops with crystal clarity */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(244,249,241,0.2)_0%,rgba(232,243,226,0.78)_100%)] dark:bg-[radial-gradient(circle_at_center,rgba(7,26,17,0.35)_0%,rgba(4,15,10,0.88)_100%)]" />

      {/* Ambient Botanical Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-lime-400/25 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/25 dark:bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-green-300/20 dark:bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Floating Action Bar: Back to Home & Direct Theme Switcher */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 z-20 px-1 sm:px-0">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-emerald-900 dark:text-emerald-200 hover:text-emerald-700 dark:hover:text-white text-xs font-bold backdrop-blur-md border border-emerald-600/15 dark:border-white/10 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Về trang chủ</span>
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-emerald-950 dark:text-white text-xs font-bold backdrop-blur-md border border-emerald-600/15 dark:border-white/10 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Giao diện Sáng</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-emerald-700" />
              <span>Giao diện Tối</span>
            </>
          )}
        </button>
      </div>

      {/* ================= MAIN SPLIT CARD CONTAINER ================= */}
      <div className="w-full max-w-6xl min-h-[700px] bg-white/95 dark:bg-[#101920]/95 rounded-[2rem] shadow-[0_24px_70px_-15px_rgba(22,101,52,0.22)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.65)] border border-emerald-600/15 dark:border-emerald-500/15 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 backdrop-blur-xl transition-all duration-300">
        
        {/* Left Column: Visual Showcase Banner */}
        <div className="lg:col-span-6 relative min-h-[400px] lg:min-h-full overflow-hidden bg-[#0a2e1c] flex flex-col justify-between p-8 sm:p-11 text-white">
          
          {/* Background Image with Slow Zoom & Rich Botanical Gradient Overlay */}
          <img
            src={bannerImage}
            alt="VEGEAI Banner"
            className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-1000 ease-out hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#041d11]/95 via-[#072617]/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#041d11]/40 to-transparent" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg transition group-hover:scale-105 group-hover:bg-white/20">
                <img
                  src="/vegeai-logo.png"
                  alt="VEGEAI"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
                  VEGE<span className="text-lime-400">AI</span>
                </span>
                <span className="text-[11px] font-medium text-emerald-200/90 tracking-wide">
                  Dinh dưỡng Thuần Chay Thông Minh
                </span>
              </div>
            </Link>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-lime-200">
              <Leaf className="w-3.5 h-3.5 text-lime-400" />
              <span>100% Plant-Based</span>
            </div>
          </div>

          {/* Center/Bottom Highlight Content */}
          <div className="relative z-10 space-y-5 mt-auto pt-12">
            {bannerBadge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 backdrop-blur-md border border-lime-400/30 text-xs font-bold text-lime-300 tracking-wider uppercase shadow-sm">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                <span>{bannerBadge}</span>
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold leading-[1.2] text-white tracking-tight drop-shadow-sm">
              {bannerTitle}
            </h2>

            <p className="text-sm sm:text-[15px] text-emerald-50/90 leading-relaxed font-normal max-w-lg">
              {bannerDescription}
            </p>

            {/* Feature Pills on Banner */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-lime-300 font-bold text-xs">
                  <ChefHat className="w-3.5 h-3.5 shrink-0" />
                  <span>AI Đầu Bếp</span>
                </div>
                <span className="text-[11px] text-emerald-100/80 leading-tight">Đầu bếp chay thông minh</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-lime-300 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Tủ lạnh AI</span>
                </div>
                <span className="text-[11px] text-emerald-100/80 leading-tight">Nhận diện nguyên liệu</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-lime-300 font-bold text-xs">
                  <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                  <span>Cộng đồng</span>
                </div>
                <span className="text-[11px] text-emerald-100/80 leading-tight">Ẩm thực xanh thuần Việt</span>
              </div>
            </div>

            {quote && (
              <p className="text-xs italic text-lime-200/90 pt-3 border-t border-white/15">
                "{quote}"
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Form Container with Subtle Top Botanical Accent */}
        <div className="lg:col-span-6 relative flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 bg-white dark:bg-[#101920] transition-colors duration-200">
          {/* Subtle decorative vegan pattern strip at the top of the form panel */}
          <div
            className="absolute top-0 inset-x-0 h-24 opacity-[0.06] dark:opacity-[0.04] pointer-events-none bg-repeat-x"
            style={{
              backgroundImage: "url('/images/vegan-doodle-pattern.png')",
              backgroundSize: '320px auto',
              maskImage: 'linear-gradient(to bottom, black, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
            }}
          />

          <div className="w-full max-w-md mx-auto relative z-10">
            {children}
          </div>
        </div>

      </div>

    </div>
  );
};
