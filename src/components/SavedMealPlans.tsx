import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCommunityQuery } from '../hooks/useCommunityQuery';
import { mealPlanService } from '../services/mealPlanService';
import '../styles/meal-plan.css';
export function planDate(value: string) { return new Date(value + 'T12:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); }
export function SavedMealPlans({
  revision = 0,
  onSelectPlan,
}: {
  revision?: number;
  onSelectPlan?: (planId: string) => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(0);
  const query = useCommunityQuery(
    JSON.stringify(['saved-plans', user?.id, page, revision]),
    signal => mealPlanService.list(page, signal),
    isAuthenticated && user?.role !== 'admin'
  );
  return (
    <section className="saved-plans">
      <header>
        <h2><CalendarDays size={18} /> Kế hoạch đã lưu</h2>
        <Link to="/ai-chef?tab=meal-plan" title="Lập kế hoạch mới" aria-label="Lập kế hoạch mới">
          <ArrowUpRight size={17} />
        </Link>
      </header>
      {query.busy && <p role="status">Đang tải kế hoạch...</p>}
      {query.error && (
        <div role="alert">
          {query.error}
          <button title="Tải lại kế hoạch" aria-label="Tải lại kế hoạch" onClick={query.refresh}>
            <RefreshCw size={15} />
          </button>
        </div>
      )}
      {query.data && (
        <>
          {!query.data.items.length && <p>Chưa có kế hoạch đã lưu.</p>}
          <ul>
            {query.data.items.map(plan => (
              <li key={plan.id}>
                {onSelectPlan ? (
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span>
                      <strong>{plan.period === 'WEEK' ? 'Thực đơn tuần' : 'Thực đơn tháng'}</strong>
                      <small>{planDate(plan.startDate)} - {planDate(plan.endDate)} · {plan.mealsPerDay} bữa/ngày</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ) : (
                  <Link to={'/meal-plans/' + plan.id}>
                    <span>
                      <strong>{plan.period === 'WEEK' ? 'Thực đơn tuần' : 'Thực đơn tháng'}</strong>
                      <small>{planDate(plan.startDate)} - {planDate(plan.endDate)} · {plan.mealsPerDay} bữa/ngày</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {query.data.totalPages > 1 && (
            <nav aria-label="Phân trang kế hoạch">
              <button
                title="Kế hoạch trang trước"
                aria-label="Kế hoạch trang trước"
                disabled={query.data.first}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>{page + 1}/{query.data.totalPages}</span>
              <button
                title="Kế hoạch trang sau"
                aria-label="Kế hoạch trang sau"
                disabled={query.data.last}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
