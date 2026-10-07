import React from 'react';
import { AuthLayout } from '../layouts/AuthLayout';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      bannerImage="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80"
      bannerBadge="VEGEAI Ẩm Thực Xanh"
      bannerTitle="Món ngon tự nhiên, lành mạnh mỗi ngày."
      bannerDescription="Khám phá công nghệ AI hỗ trợ dinh dưỡng thực vật thuần Việt, thiết kế riêng cho lối sống cân bằng và an lành."
      quote="Món ngon tự nhiên, lành mạnh mỗi ngày."
    >
      <RegisterForm />
    </AuthLayout>
  );
};
