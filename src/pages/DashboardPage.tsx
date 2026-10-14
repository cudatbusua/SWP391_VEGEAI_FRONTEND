import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Calendar } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { OverviewTab } from '../features/dashboard/components/OverviewTab';
import { NutritionProfileTab } from '../features/dashboard/components/NutritionProfileTab';

export const DashboardPage: React.FC = () => {
  const { isLoading, isAuthenticated, sessionError, retrySession } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'profile' ? 'profile' : 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'profile'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'profile') setActiveTab('profile');
    else if (tabParam === 'overview') setActiveTab('overview');
  }, [searchParams]);

  const handleTabChange = (tab: 'overview' | 'profile') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (isLoading) return <MainLayout><p role="status" className="p-8 text-center">Đang tải phiên đăng nhập...</p></MainLayout>;
  if (sessionError && !isAuthenticated) return <MainLayout><div className="p-8 text-center"><p>{sessionError}</p><button onClick={retrySession} className="text-emerald-700 underline">Thử lại</button></div></MainLayout>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Tab Bar & Current Date (Images 1 & 2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          
          {/* Tabs */}
          <div className="inline-flex p-1 bg-white border border-gray-200/80 rounded-lg">
            <button
              onClick={() => handleTabChange('overview')}
              aria-pressed={activeTab === 'overview'}
              className={`px-4 py-2.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tổng quan cá nhân
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              aria-pressed={activeTab === 'profile'}
              className={`px-4 py-2.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hồ sơ dinh dưỡng
            </button>
          </div>

          {/* Date Picker / Today's Date */}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 py-2.5 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
          </div>

        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? <OverviewTab /> : <NutritionProfileTab />}

      </div>
    </MainLayout>
  );
};
