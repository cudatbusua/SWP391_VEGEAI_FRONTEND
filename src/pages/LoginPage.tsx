import React from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginForm } from '../features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      bannerImage="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
      bannerBadge="NGHỆ THUẬT ẨM THỰC CHAY"
      bannerTitle="Nuôi dưỡng thân tâm mỗi ngày cùng hương vị thuần thực vật."
      bannerDescription="Khám phá hàng ngàn công thức món chay truyền thống Việt Nam kết hợp cùng công nghệ gợi ý thông minh từ AI."
    >
      <LoginForm />
    </AuthLayout>
  );
};
