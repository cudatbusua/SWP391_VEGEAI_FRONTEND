import React from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { ForgotPasswordForm } from '../features/auth/components/ForgotPasswordForm';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      bannerImage="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80"
      bannerBadge="VEGEAI WELLNESS"
      bannerTitle="Nuôi dưỡng tâm hồn từ thiên nhiên"
      bannerDescription="Khám phá phong cách sống thực dưỡng thuần chay hiện đại, kết hợp tinh hoa ẩm thực truyền thống Việt Nam và công nghệ AI."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
};
