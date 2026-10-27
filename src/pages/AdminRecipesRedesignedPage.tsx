import { MainLayout } from '../layouts/MainLayout';
import { CommunityGuard } from '../components/CommunityUi';
import { AdminRecipeWorkspace } from '../components/AdminRecipeWorkspace';

export function AdminRecipesPage() {
  return <MainLayout><CommunityGuard admin><div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
    <header className="mb-6"><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Công thức & dinh dưỡng</h1><p className="mt-1.5 text-sm text-slate-500 sm:text-base">Chỉnh sửa công thức, thông tin dinh dưỡng và quản lý hệ thống thẻ phân loại.</p></header>
    <AdminRecipeWorkspace />
  </div></CommunityGuard></MainLayout>;
}
