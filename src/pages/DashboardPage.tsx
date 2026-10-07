import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { OverviewTab } from '../features/dashboard/components/OverviewTab';
import { NutritionProfileTab } from '../features/dashboard/components/NutritionProfileTab';

export const DashboardPage: React.FC = () => {
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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Tab Bar & Current Date (Images 1 & 2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          
          {/* Tabs */}
          <div className="inline-flex p-1 bg-white border border-gray-200/80 rounded-2xl shadow-2xs">
            <button
              onClick={() => handleTabChange('overview')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tổng quan cá nhân
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-50 text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hồ sơ dinh dưỡng
            </button>
          </div>

          {/* Date Picker / Today's Date */}
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-200/80 px-4 py-2.5 rounded-2xl shadow-2xs self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Thứ Ba, 06 tháng 10, 2026</span>
          </div>

        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? <OverviewTab /> : <NutritionProfileTab />}

      </div>
    </MainLayout>
  );
};
