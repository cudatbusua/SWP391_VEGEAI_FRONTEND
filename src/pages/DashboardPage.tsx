import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Calendar, User, Activity, LayoutDashboard } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { OverviewTab } from '../features/dashboard/components/OverviewTab';
import { NutritionProfileTab } from '../features/dashboard/components/NutritionProfileTab';
import { PersonalProfileTab } from '../features/dashboard/components/PersonalProfileTab';

type DashboardTab = 'overview' | 'nutrition' | 'personal';
const tabs: DashboardTab[] = ['overview', 'nutrition', 'personal'];
const asTab = (value: string | null): DashboardTab | null =>
  tabs.includes(value as DashboardTab) ? (value as DashboardTab) : null;

export const DashboardPage: React.FC = () => {
  const { isLoading, isAuthenticated, sessionError, retrySession } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    asTab(searchParams.get('tab')) ?? (searchParams.get('tab') === 'profile' ? 'nutrition' : 'overview')
  );

  useEffect(() => {
    const tabValue = searchParams.get('tab');
    const tabParam = asTab(tabValue) ?? (tabValue === 'profile' ? 'nutrition' : null);
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <p role="status" className="p-12 text-center text-sm font-medium text-slate-500">
          Đang tải phiên đăng nhập VEGEAI...
        </p>
      </MainLayout>
    );
  }

  if (sessionError && !isAuthenticated) {
    return (
      <MainLayout>
        <div className="p-12 text-center max-w-md mx-auto">
          <p className="text-sm text-red-600 mb-3">{sessionError}</p>
          <button
            onClick={retrySession}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition shadow-xs"
          >
            Thử lại
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <MainLayout>
      <div className="dashboard-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Top Tab Bar & Current Date (Figma Design Spec) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-200/80">
          
          {/* Figma-style Tab Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs self-start">
            <button
              onClick={() => handleTabChange('overview')}
              aria-pressed={activeTab === 'overview'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard size={14} className={activeTab === 'overview' ? 'text-emerald-700' : 'text-slate-400'} />
              Tổng quan cá nhân
            </button>

            <button
              onClick={() => handleTabChange('nutrition')}
              aria-pressed={activeTab === 'nutrition'}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'nutrition'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity size={14} className={activeTab === 'nutrition' ? 'text-emerald-700' : 'text-slate-400'} />
              Hồ sơ dinh dưỡng
            </button>

            <button
              onClick={() => handleTabChange('personal')}
              aria-pressed={activeTab === 'personal'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User size={13} className={activeTab === 'personal' ? 'text-emerald-700' : 'text-slate-400'} />
              Thông tin cá nhân
            </button>
          </div>

          {/* Today's Date */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 py-1.5 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Ho_Chi_Minh',
              })}
            </span>
          </div>

        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'nutrition' && <NutritionProfileTab />}
        {activeTab === 'personal' && <PersonalProfileTab />}

      </div>
    </MainLayout>
  );
};

export default DashboardPage;
