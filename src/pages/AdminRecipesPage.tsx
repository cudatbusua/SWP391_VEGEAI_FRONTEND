import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { CommunityGuard } from '../components/CommunityUi';
import { AdminRecipeTools } from '../components/AdminRecipeTools';

export function AdminRecipesPage() {
  return <MainLayout><CommunityGuard admin><div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <Link to="/admin" className="cm-back"><ArrowLeft size={16} /> Quản trị hệ thống</Link>
    <h1 className="text-2xl font-bold mb-6">Công thức & dinh dưỡng</h1><AdminRecipeTools />
  </div></CommunityGuard></MainLayout>;
}
