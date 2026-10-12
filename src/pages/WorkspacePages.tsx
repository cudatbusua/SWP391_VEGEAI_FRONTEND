import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, Check, CheckCheck, ChefHat, Clock3, MapPin,
  MessageCircle, Plus, Search, ShoppingBasket, Sparkles, Star, Trash2
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { useDemoState } from '../hooks/useDemoState';
import { RECIPES } from '../data/mockData';
import { DEMO_GROCERIES, DEMO_NOTIFICATIONS } from '../data/demoWorkspaceData';

type WorkspaceKind =
  | 'blog'
  | 'restaurants'
  | 'notifications'
  | 'grocery'
  | 'meal-plan'
  | 'ai'
  | 'admin'
  | 'reviews'
  | 'onboarding'
  | 'blog-editor'
  | 'blog-preview'
  | 'saved';

type DemoGrocery = { id: number; name: string; amount: string; checked: boolean };
type DemoPost = { id: string; title: string; excerpt: string; body: string; category: string; author: string; status: 'draft' | 'pending' | 'published' | 'rejected' };
type DemoReview = { id: number; restaurantId: string; restaurantName: string; rating: number; text: string; createdAt: string };
type DemoRecipeSubmission = { id: string; title: string; author: string; status: 'pending' | 'approved' | 'rejected' };
type DemoReport = { id: string; target: string; reason: string; status: 'pending' | 'resolved' | 'dismissed' };
type DemoAdminAction = { id: number; item: string; action: string; time: string };
type MealName = 'Bữa sáng' | 'Bữa trưa' | 'Bữa tối';
type WeeklyPlan = Record<string, Record<MealName, string>>;
type DemoChatMessage = { from: 'assistant' | 'user'; text: string; recipeName?: string };

const pageContent: Record<WorkspaceKind, { title: string; description: string }> = {
  blog: { title: 'Góc sống xanh', description: 'Câu chuyện, kiến thức dinh dưỡng và cảm hứng ăn chay mỗi ngày.' },
  restaurants: { title: 'Quán chay gần bạn', description: 'Khám phá những địa điểm ăn chay được cộng đồng yêu thích.' },
  notifications: { title: 'Thông báo', description: 'Cập nhật mới nhất về công thức, thực đơn và hoạt động của bạn.' },
  grocery: { title: 'Danh sách đi chợ', description: 'Chuẩn bị nguyên liệu cho những bữa ăn lành mạnh trong tuần.' },
  'meal-plan': { title: 'Kế hoạch tuần', description: 'Lên lịch bữa ăn chay phù hợp với mục tiêu dinh dưỡng của bạn.' },
  ai: { title: 'AI Bếp Trưởng', description: 'Trò chuyện để tìm ý tưởng món ngon từ những nguyên liệu sẵn có.' },
  admin: { title: 'Trung tâm quản trị', description: 'Không gian giao diện quản lý và kiểm duyệt nội dung VEGEAI.' },
  reviews: { title: 'Đánh giá cộng đồng', description: 'Chia sẻ trải nghiệm tại quán chay và đọc nhận xét từ cộng đồng.' },
  onboarding: { title: 'Hồ sơ dinh dưỡng', description: 'Một vài thông tin giúp VEGEAI cá nhân hóa gợi ý cho bạn.' },
  'blog-editor': { title: 'Chia sẻ bài viết', description: 'Soạn nội dung và gửi bài cho quản trị viên kiểm duyệt.' },
  'blog-preview': { title: 'Xem trước bài viết', description: 'Kiểm tra nội dung trước khi gửi bài cho quản trị viên.' },
  saved: { title: 'Công thức đã lưu', description: 'Những món bạn đã đánh dấu để quay lại nấu sau.' }
};

const recipes = [
  { name: 'Đậu Hũ Sốt Cà Chua Nấm Đùi Gà', detail: 'Đậu hũ · cà chua · nấm đùi gà', time: '22 phút', image: 'photo-1547592180-85f173990554' },
  { name: 'Canh bí đỏ nấu nấm rơm', detail: 'Bí đỏ · nấm rơm · đậu phộng', time: '25 phút', image: 'photo-1512621776951-a57141f2eefd' },
  { name: 'Salad đậu gà chanh dây', detail: 'Đậu gà · rau xanh · chanh dây', time: '15 phút', image: 'photo-1512621776951-a57141f2eefd' }
];

const restaurants = [
  { name: 'An Nhiên Vegetarian', area: 'Quận 1 · TP. Hồ Chí Minh', rating: '4.8', type: 'Món Việt · Buffet chay' },
  { name: 'The Organik House', area: 'Quận 3 · TP. Hồ Chí Minh', rating: '4.7', type: 'Healthy · Thực dưỡng' },
  { name: 'Bếp Xanh', area: 'Bình Thạnh · TP. Hồ Chí Minh', rating: '4.6', type: 'Cơm chay · Gia đình' }
];

const initialPosts: DemoPost[] = [
  { id: '1', title: 'Ăn chay cân bằng: bắt đầu từ những điều nhỏ', excerpt: 'Một chế độ ăn chay đa dạng có thể bắt đầu từ những thay đổi vừa sức.', body: 'Kết hợp các loại đậu, ngũ cốc nguyên hạt, rau củ và hạt để bữa ăn có nhiều màu sắc. Hãy bắt đầu bằng một thay đổi vừa sức và lựa chọn nguyên liệu theo mùa.', category: 'Dinh dưỡng', author: 'VEGEAI', status: 'published' },
  { id: '2', title: '5 loại đậu giàu protein thực vật', excerpt: 'Khám phá các loại đậu quen thuộc để làm phong phú thực đơn hàng ngày.', body: 'Đậu gà, đậu lăng, đậu đen, đậu nành và đậu đỏ là những nguyên liệu đa dụng cho món chay. Có thể thêm đậu vào salad, món hầm hoặc cơm.', category: 'Nguyên liệu', author: 'VEGEAI', status: 'published' },
  { id: '3', title: 'Mẹo chuẩn bị bữa ăn xanh trong tuần', excerpt: 'Sắp xếp nguyên liệu hợp lý để nấu ăn nhẹ nhàng hơn.', body: 'Chọn trước một số loại rau củ theo mùa, sơ chế theo từng bữa và bảo quản đúng cách để rút ngắn thời gian nấu.', category: 'Lối sống', author: 'VEGEAI', status: 'published' },
  { id: 'pending-1', title: 'Bữa chay đủ chất cho người mới bắt đầu', excerpt: 'Một gợi ý thực đơn đơn giản và dễ áp dụng.', body: 'Bài viết đang chờ đội ngũ VEGEAI kiểm duyệt nội dung.', category: 'Dinh dưỡng', author: 'Thành viên VEGEAI', status: 'pending' }
];

const initialRecipeSubmissions: DemoRecipeSubmission[] = [
  { id: 'recipe-a', title: 'Bữa chay đủ chất cho người mới bắt đầu', author: 'Nguyễn An', status: 'pending' },
  { id: 'recipe-b', title: 'Cách làm sữa hạt tại nhà', author: 'Lê Minh', status: 'pending' },
  { id: 'recipe-c', title: 'Bữa sáng nhanh với yến mạch', author: 'Trần Vy', status: 'pending' }
];

const initialReports: DemoReport[] = [
  { id: 'report-a', target: 'Bình luận tại bài viết "Ăn chay cân bằng"', reason: 'Nội dung không phù hợp', status: 'pending' },
  { id: 'report-b', target: 'Tài khoản thành viên #1024', reason: 'Nghi ngờ spam', status: 'pending' }
];

const initialPlan: WeeklyPlan = Object.fromEntries(
  ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((day) => [
    day,
    { 'Bữa sáng': recipes[2].name, 'Bữa trưa': recipes[0].name, 'Bữa tối': recipes[1].name }
  ])
) as WeeklyPlan;

const recipeIngredients: Record<string, string[]> = {
  'Đậu Hũ Sốt Cà Chua Nấm Đùi Gà': ['Đậu hũ trắng', 'Cà chua chín', 'Nấm đùi gà', 'Hành boa-rô'],
  'Canh bí đỏ nấu nấm rơm': ['Bí đỏ hồ lô', 'Nấm rơm tươi', 'Đậu phộng tươi', 'Ngò gai'],
  'Salad đậu gà chanh dây': ['Đậu gà', 'Rau xanh', 'Chanh dây', 'Dầu ô-liu']
};

const cardClass = 'rounded-2xl border border-emerald-100 bg-white shadow-sm';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800';
const demoNotice = 'Dữ liệu mẫu đang lưu trên trình duyệt. Khi có API, thay lớp demo repository bằng service mà không đổi luồng màn hình.';

/**
 * Renders the guest/customer/admin feature screens while their backend endpoints are pending.
 * Route handlers pass a `kind`, and every editable demo entity uses a named local-storage record.
 * This keeps navigation between pages coherent now and makes each record's API replacement point clear.
 */
export const WorkspacePage: React.FC<{ kind: WorkspaceKind }> = ({ kind }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useDemoState('notifications', DEMO_NOTIFICATIONS);
  const [groceries, setGroceries] = useDemoState<DemoGrocery[]>('grocery-list', DEMO_GROCERIES);
  const [posts, setPosts] = useDemoState('community-posts', initialPosts);
  const [savedRecipeIds] = useDemoState<string[]>('saved-recipes', []);
  const [recipeSubmissions, setRecipeSubmissions] = useDemoState('recipe-submissions', initialRecipeSubmissions);
  const [reports, setReports] = useDemoState('user-reports', initialReports);
  const [adminActions, setAdminActions] = useDemoState<DemoAdminAction[]>('admin-action-history', []);
  const [reviews, setReviews] = useDemoState<DemoReview[]>('restaurant-reviews', []);
  const [weeklyPlan, setWeeklyPlan] = useDemoState('weekly-meal-plan', initialPlan);
  const [profile, setProfile] = useDemoState('nutrition-profile', {
    goal: 'Ăn uống cân bằng',
    allergies: [] as string[],
    height: '',
    weight: '',
    completed: false
  });
  const [blogDraft, setBlogDraft] = useDemoState('blog-draft', {
    title: '',
    excerpt: '',
    body: '',
    category: 'Dinh dưỡng'
  });
  const [newItem, setNewItem] = useState('');
  const [chat, setChat] = useDemoState<DemoChatMessage[]>('ai-chat', [
    { from: 'assistant', text: 'Xin chào! Bạn đang có nguyên liệu nào trong tủ lạnh? Mình sẽ gợi ý món chay phù hợp nhé.' }
  ]);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [confirmedImageIngredients, setConfirmedImageIngredients] = useState(['Đậu hũ', 'Cà chua', 'Rau xanh']);
  const [selectedDay, setSelectedDay] = useState('Thứ 2');
  const [adminTab, setAdminTab] = useState('Bài viết chờ duyệt');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [allergy, setAllergy] = useState(profile.allergies.join(', '));
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const title = pageContent[kind];
  const routeParts = pathname.split('/').filter(Boolean);
  const isBlogDetail = kind === 'blog' && routeParts.length > 1;
  const isRestaurantDetail = kind === 'restaurants' && routeParts.length > 1;
  const routeId = routeParts.at(-1) ?? '';
  const currentBlogPost = posts.find((post) => post.id === routeId);
  const currentRestaurant = restaurants[Number(routeId)] ?? restaurants[0];
  const selectedReviewRestaurantId = searchParams.get('restaurantId') ?? '0';
  const selectedReviewRestaurant = restaurants[Number(selectedReviewRestaurantId)] ?? restaurants[0];
  // This deterministic suggestion gives the UI a usable response until a real assistant API is connected.
  const addDemoChatExchange = (text: string) => {
    if (!text) return;
    const searchTerms = text.toLocaleLowerCase().split(/[\s,.;]+/).filter((term) => term.length > 2);
    const suggestedRecipe = recipes.find((recipe) => searchTerms.some((term) => `${recipe.name} ${recipe.detail}`.toLocaleLowerCase().includes(term))) ?? recipes[0];
    setChat((items) => [
      ...items,
      { from: 'user', text },
      { from: 'assistant', text: `Gợi ý bản demo: ${suggestedRecipe.name}. Kết quả này chưa được phân tích bởi AI backend.`, recipeName: suggestedRecipe.name }
    ]);
  };

  const sendChat = (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    addDemoChatExchange(text);
    setMessage('');
  };

  const addGrocery = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setGroceries((items) => [...items, { id: Date.now(), name, amount: '1 phần', checked: false }]);
    setNewItem('');
  };

  // A planned dish and its shopping ingredients share the same demo records across pages.
  const addRecipesToGroceryList = (recipeNames: string[]) => {
    const newIngredientNames = new Set(recipeNames.flatMap((name) => recipeIngredients[name] ?? []));
    setGroceries((items) => {
      const existingNames = new Set(items.map((item) => item.name.toLocaleLowerCase()));
      const newIngredients = [...newIngredientNames]
        .filter((name) => !existingNames.has(name.toLocaleLowerCase()))
        .map((name) => ({ id: Date.now() + Math.random(), name, amount: '1 phần', checked: false }));
      return [...items, ...newIngredients];
    });
  };

  const addRecipeIngredients = (recipeName: string) => addRecipesToGroceryList([recipeName]);

  /**
   * Saves the current editor form as one community post.
   * Drafts remain private; submitted posts enter the admin queue and are only public after approval.
   */
  const saveBlogPost = (status: 'draft' | 'pending') => {
    const titleText = blogDraft.title.trim();
    if (!titleText || !blogDraft.body.trim()) return;
    const savedDraft = posts.find((post) => post.status === 'draft' && post.author === 'VEGEAI Demo User');
    const draftPost: DemoPost = {
      id: savedDraft?.id ?? `post-${Date.now()}`,
      title: titleText,
      excerpt: blogDraft.excerpt.trim() || blogDraft.body.trim().slice(0, 140),
      body: blogDraft.body.trim(),
      category: blogDraft.category,
      author: 'VEGEAI Demo User',
      status
    };
    setPosts((items) => savedDraft
      ? items.map((post) => post.id === savedDraft.id ? draftPost : post)
      : [draftPost, ...items]);
    if (status === 'pending') {
      setBlogDraft({ title: '', excerpt: '', body: '', category: 'Dinh dưỡng' });
      navigate('/blog');
    }
  };

  /** Mirrors an admin decision into the same post collection consumed by the public blog page. */
  const setPostStatus = (postId: string, status: DemoPost['status']) => {
    setPosts((items) => items.map((post) => post.id === postId ? { ...post, status } : post));
    const post = posts.find((item) => item.id === postId);
    if (post) recordAdminAction(post.title, status === 'published' ? 'Đã duyệt bài viết' : 'Từ chối bài viết');
  };

  const recordAdminAction = (item: string, action: string) => {
    setAdminActions((items) => [{ id: Date.now(), item, action, time: new Date().toLocaleString('vi-VN') }, ...items]);
  };

  const reviewRecipeSubmission = (id: string, status: DemoRecipeSubmission['status']) => {
    const submission = recipeSubmissions.find((item) => item.id === id);
    setRecipeSubmissions((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    if (submission) recordAdminAction(submission.title, status === 'approved' ? 'Đã duyệt công thức' : 'Từ chối công thức');
  };

  const reviewReport = (id: string, status: DemoReport['status']) => {
    const report = reports.find((item) => item.id === id);
    setReports((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    if (report) recordAdminAction(report.target, status === 'resolved' ? 'Đã xử lý báo cáo' : 'Đã bỏ qua báo cáo');
  };

  /** Associates a review with the restaurant selected on its detail page. */
  const addReview = () => {
    const text = reviewText.trim();
    if (!text) return;
    setReviews((items) => [{
      id: Date.now(),
      restaurantId: selectedReviewRestaurantId,
      restaurantName: selectedReviewRestaurant.name,
      rating,
      text,
      createdAt: new Date().toLocaleDateString('vi-VN')
    }, ...items]);
    setReviewText('');
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              VEGEAI · {kind === 'admin' ? 'ADMIN' : 'KHÔNG GIAN CỦA BẠN'}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">{isBlogDetail ? currentBlogPost?.title ?? title.title : isRestaurantDetail ? currentRestaurant.name : title.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{title.description}</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            Bản xem trước giao diện · chưa kết nối API
          </span>
        </div>

        {kind === 'blog' && (
          isBlogDetail ? (
            currentBlogPost ? (
              <article className={`${cardClass} mx-auto max-w-4xl overflow-hidden`}>
                <img className="h-72 w-full object-cover" src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80" alt="Bữa ăn chay nhiều rau củ" />
                <div className="p-7 sm:p-10">
                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">{currentBlogPost.category} · Tác giả {currentBlogPost.author}</div>
                  <h2 className="mt-3 text-2xl font-bold text-slate-900">{currentBlogPost.title}</h2>
                  <p className="mt-5 whitespace-pre-line leading-7 text-slate-600">{currentBlogPost.body}</p>
                  <Link to="/blog" className="mt-7 inline-flex items-center gap-2 font-semibold text-emerald-700">← Quay lại danh sách bài viết</Link>
                </div>
              </article>
            ) : <div className={`${cardClass} p-8 text-center`}><h2 className="font-bold">Bài viết này chưa được xuất bản</h2><p className="mt-2 text-sm text-slate-600">Bài chỉ hiển thị công khai sau khi quản trị viên duyệt.</p><Link to="/blog" className="mt-4 inline-block font-semibold text-emerald-700">Quay lại Blog</Link></div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-w-60 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:max-w-xl">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm bài viết..." className="w-full bg-transparent text-sm outline-none" />
                </label>
                <Link to="/blog/write" className={buttonClass}><Plus className="h-4 w-4" />Viết bài</Link>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {posts.filter((post) => post.status === 'published' && `${post.title} ${post.category}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((post, index) => (
                  <Link to={`/blog/${post.id}`} key={post.id} className={`${cardClass} group overflow-hidden transition hover:-translate-y-1 hover:shadow-md`}>
                    <img className="h-48 w-full object-cover" src={`https://images.unsplash.com/${recipes[index % recipes.length].image}?auto=format&fit=crop&w=900&q=80`} alt="Món ăn chay" />
                    <div className="p-5"><span className="text-xs font-bold uppercase text-emerald-700">{post.category} · {post.author}</span><h2 className="mt-3 font-bold leading-6 text-slate-900">{post.title}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.excerpt}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Đọc bài viết <ArrowRight className="h-4 w-4" /></span></div>
                  </Link>
                ))}
              </div>
              {posts.some((post) => post.author === 'VEGEAI Demo User' && post.status === 'pending') && <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Bài viết của bạn đang chờ quản trị viên duyệt. Bạn có thể kiểm tra trạng thái trong trang quản trị bản demo.</p>}
              {!posts.some((post) => post.status === 'published' && post.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p className="mt-6 text-center text-sm text-slate-500">Không tìm thấy bài viết phù hợp.</p>}
            </>
          )
        )}

        {(kind === 'blog-editor' || kind === 'blog-preview') && (
          kind === 'blog-preview' ? (
            <article className={`${cardClass} mx-auto max-w-4xl overflow-hidden`}>
              <img className="h-64 w-full object-cover" src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80" alt="Ảnh minh họa bài viết" />
              <div className="p-6 sm:p-9"><p className="text-xs font-bold uppercase text-emerald-700">{blogDraft.category} · Bản xem trước</p><h2 className="mt-3 text-2xl font-extrabold">{blogDraft.title || 'Tiêu đề bài viết'}</h2><p className="mt-3 text-slate-600">{blogDraft.excerpt || 'Mô tả ngắn sẽ hiển thị ở đây.'}</p><p className="mt-6 whitespace-pre-line leading-7 text-slate-700">{blogDraft.body || 'Nội dung bài viết sẽ hiển thị ở đây.'}</p><div className="mt-8 flex flex-wrap justify-between gap-3"><Link to="/blog/write" className="rounded-xl border px-4 py-2.5 text-sm font-semibold">← Quay lại chỉnh sửa</Link><button type="button" onClick={() => saveBlogPost('pending')} disabled={!blogDraft.title.trim() || !blogDraft.body.trim()} className={`${buttonClass} disabled:opacity-50`}>Gửi admin kiểm duyệt</button></div></div>
            </article>
          ) : (
          <section className={`${cardClass} mx-auto max-w-4xl p-5 sm:p-8`}>
            <div className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{demoNotice} Bài gửi duyệt sẽ xuất hiện trong hàng chờ của admin; chỉ bài đã duyệt mới xuất hiện công khai.</div>
            <label className="mb-4 block text-sm font-semibold">Tiêu đề bài viết<input value={blogDraft.title} onChange={(event) => setBlogDraft((draft) => ({ ...draft, title: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" placeholder="Nhập tiêu đề rõ ràng" /></label>
            <label className="mb-4 block text-sm font-semibold">Chủ đề<select value={blogDraft.category} onChange={(event) => setBlogDraft((draft) => ({ ...draft, category: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"><option>Dinh dưỡng</option><option>Nguyên liệu</option><option>Lối sống</option><option>Công thức</option></select></label>
            <label className="mb-4 block text-sm font-semibold">Mô tả ngắn<input value={blogDraft.excerpt} onChange={(event) => setBlogDraft((draft) => ({ ...draft, excerpt: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500" placeholder="Giới thiệu ngắn về bài viết" /></label>
            <label className="block text-sm font-semibold">Nội dung<textarea value={blogDraft.body} onChange={(event) => setBlogDraft((draft) => ({ ...draft, body: event.target.value }))} rows={10} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal leading-6 outline-none focus:border-emerald-500" placeholder="Chia sẻ kiến thức và trải nghiệm của bạn..." /></label>
            <div className="mt-6 flex flex-wrap justify-between gap-3"><Link to="/blog" className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Hủy</Link><div className="flex flex-wrap gap-3"><button type="button" onClick={() => { saveBlogPost('draft'); navigate('/blog/preview'); }} disabled={!blogDraft.title.trim() || !blogDraft.body.trim()} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Xem trước</button><button type="button" onClick={() => saveBlogPost('draft')} disabled={!blogDraft.title.trim() || !blogDraft.body.trim()} className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50">Lưu bản nháp</button><button type="button" onClick={() => saveBlogPost('pending')} disabled={!blogDraft.title.trim() || !blogDraft.body.trim()} className={`${buttonClass} disabled:opacity-50`}>Gửi duyệt</button></div></div>
          </section>
          )
        )}

        {kind === 'saved' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RECIPES.filter((recipe) => savedRecipeIds.includes(recipe.id)).map((recipe) => <Link key={recipe.id} to={`/recipe/${recipe.id}`} className={`${cardClass} overflow-hidden transition hover:-translate-y-1 hover:shadow-md`}><img src={recipe.image} alt={recipe.title} className="h-48 w-full object-cover" /><div className="p-5"><p className="text-xs font-bold uppercase text-emerald-700">{recipe.badge} · {recipe.cookTime} phút</p><h2 className="mt-2 font-bold">{recipe.title}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-600">{recipe.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Mở công thức <ArrowRight className="h-4 w-4" /></span></div></Link>)}
            {savedRecipeIds.length === 0 && <section className={`${cardClass} col-span-full p-10 text-center`}><h2 className="text-lg font-bold">Chưa có công thức đã lưu</h2><p className="mt-2 text-sm text-slate-600">Khám phá món ăn rồi nhấn biểu tượng dấu trang để lưu món yêu thích.</p><Link to="/" className={`${buttonClass} mt-5`}>Khám phá công thức</Link></section>}
          </div>
        )}

        {kind === 'restaurants' && (
          isRestaurantDetail ? (
            <section className={`${cardClass} mx-auto max-w-5xl overflow-hidden`}>
              <img className="h-72 w-full object-cover" src={`https://images.unsplash.com/${recipes[Number(routeId) % recipes.length].image}?auto=format&fit=crop&w=1400&q=80`} alt={`Không gian ${currentRestaurant.name}`} />
              <div className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-8">
                <div><p className="text-sm font-bold text-emerald-700">{currentRestaurant.type}</p><h2 className="mt-2 text-2xl font-extrabold">{currentRestaurant.name}</h2><p className="mt-3 flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4" />{currentRestaurant.area}</p><p className="mt-5 leading-7 text-slate-600">Không gian ăn chay thân thiện với các lựa chọn món Việt và nguyên liệu theo mùa. Thông tin đang là dữ liệu mẫu để trình diễn luồng xem địa điểm.</p><h3 className="mt-7 font-bold">Đánh giá khách hàng</h3>{reviews.filter((review) => review.restaurantId === routeId).map((review) => <p key={review.id} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-semibold text-amber-600">{review.rating}/5 ★</span> · {review.text}</p>)}{!reviews.some((review) => review.restaurantId === routeId) && <p className="mt-2 text-sm text-slate-500">Chưa có đánh giá trong phiên xem trước.</p>}</div>
                <aside className="h-fit rounded-xl bg-emerald-50 p-5"><p className="flex items-center gap-2 font-bold"><Star className="h-5 w-5 fill-amber-400 text-amber-500" />{currentRestaurant.rating} / 5</p><p className="mt-4 text-sm text-slate-600">Địa chỉ mẫu · {currentRestaurant.area}</p><Link to={`/reviews?restaurantId=${routeId}`} className={`${buttonClass} mt-5 w-full`}>Viết đánh giá</Link><Link to="/restaurants" className="mt-4 block text-center text-sm font-semibold text-emerald-800">Quay lại danh sách</Link></aside>
              </div>
            </section>
          ) : (
            <>
              <div className={`${cardClass} mb-6 flex flex-wrap items-center gap-3 p-4`}>
                <MapPin className="h-5 w-5 text-emerald-700" /><span className="font-semibold">TP. Hồ Chí Minh</span>
                <span className="text-sm text-slate-500">Vị trí mẫu · chưa dùng GPS</span>
                <label className="ml-auto flex min-w-60 items-center gap-2 rounded-lg border px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm quán chay..." className="w-full text-sm outline-none" /></label>
              </div>
              <div className="grid gap-5 md:grid-cols-3">{restaurants.filter((item) => item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((restaurant) => { const restaurantId = String(restaurants.indexOf(restaurant)); return <article key={restaurant.name} className={`${cardClass} overflow-hidden`}><img className="h-48 w-full object-cover" src={`https://images.unsplash.com/${recipes[Number(restaurantId)].image}?auto=format&fit=crop&w=900&q=80`} alt="Không gian quán ăn chay" /><div className="p-5"><div className="flex items-center justify-between"><h2 className="font-bold">{restaurant.name}</h2><span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star className="h-4 w-4 fill-current" />{restaurant.rating}</span></div><p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{restaurant.area}</p><p className="mt-2 text-sm text-slate-600">{restaurant.type}</p><Link to={`/restaurants/${restaurantId}`} className="mt-4 inline-block rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800">Xem chi tiết</Link></div></article>; })}</div>
            </>
          )
        )}

        {kind === 'notifications' && (
          <section className={`${cardClass} mx-auto max-w-4xl divide-y divide-slate-100`}>
            <div className="flex flex-wrap items-center justify-between gap-3 p-5"><h2 className="font-bold">Tất cả thông báo</h2><button type="button" onClick={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCheck className="h-4 w-4" />Đánh dấu đã đọc</button></div>
            {notifications.map((item) => <button type="button" key={item.id} onClick={() => setNotifications((items) => items.map((notice) => notice.id === item.id ? { ...notice, unread: false } : notice))} className={`flex w-full gap-4 p-5 text-left ${item.unread ? 'bg-emerald-50/50' : ''}`}><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Sparkles className="h-5 w-5" /></div><div className="flex-1"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.title}</h3><span className="text-xs text-slate-500">{item.time}</span></div><p className="mt-1 text-sm text-slate-600">{item.description}</p></div>{item.unread && <span className="mt-2 h-2 w-2 rounded-full bg-emerald-600" />}</button>)}
            <p className="p-4 text-xs text-slate-500">{demoNotice}</p>
          </section>
        )}

        {kind === 'grocery' && (
          <section className={`${cardClass} mx-auto max-w-3xl p-5 sm:p-7`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><ShoppingBasket className="h-6 w-6 text-emerald-700" /><div><h2 className="font-bold">Nguyên liệu cần mua</h2><p className="text-sm text-slate-500">{groceries.filter((item) => !item.checked).length} món chưa hoàn thành</p></div></div><button type="button" onClick={() => addRecipesToGroceryList(Object.values(weeklyPlan).flatMap((day) => Object.values(day)))} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800">Thêm nguyên liệu từ kế hoạch tuần</button></div>
            <form onSubmit={addGrocery} className="mb-5 flex gap-2"><input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Thêm nguyên liệu..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" /><button aria-label="Thêm nguyên liệu" className={buttonClass}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Thêm món</span></button></form>
            <div className="divide-y divide-slate-100">{groceries.map((item) => <div key={item.id} className="flex items-center gap-3 py-4"><button type="button" aria-label={item.checked ? 'Bỏ đánh dấu' : 'Đánh dấu hoàn thành'} onClick={() => setGroceries((items) => items.map((row) => row.id === item.id ? { ...row, checked: !row.checked } : row))} className={`flex h-5 w-5 items-center justify-center rounded border ${item.checked ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>{item.checked && <Check className="h-3 w-3" />}</button><span className={`flex-1 font-medium ${item.checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.name}</span><span className="text-sm text-slate-500">{item.amount}</span><button type="button" aria-label={`Xóa ${item.name}`} onClick={() => setGroceries((items) => items.filter((row) => row.id !== item.id))} className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
            {groceries.some((item) => item.checked) && <button type="button" onClick={() => setGroceries((items) => items.filter((item) => !item.checked))} className="mt-4 text-sm font-semibold text-red-700">Xóa các món đã mua</button>}
            <p className="mt-4 text-xs text-slate-500">{demoNotice}</p>
          </section>
        )}

        {kind === 'meal-plan' && (
          <section className={`${cardClass} p-5 sm:p-7`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><CalendarDays className="h-6 w-6 text-emerald-700" /><div><h2 className="font-bold">Thực đơn tuần này</h2><p className="text-sm text-slate-500">Chọn món cho từng bữa; thay đổi được lưu khi chuyển trang.</p></div></div><div className="flex gap-2"><button type="button" onClick={() => setWeeklyPlan(Object.fromEntries(Object.keys(initialPlan).map((day, index) => [day, { 'Bữa sáng': recipes[index % 3].name, 'Bữa trưa': recipes[(index + 1) % 3].name, 'Bữa tối': recipes[(index + 2) % 3].name }])) as WeeklyPlan)} className="rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800"><Sparkles className="mr-1 inline h-4 w-4" />Gợi ý thực đơn</button><button type="button" onClick={() => { addRecipesToGroceryList(Object.values(weeklyPlan).flatMap((day) => Object.values(day))); navigate('/grocery-list'); }} className={buttonClass}>Tạo danh sách đi chợ</button></div></div>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((day) => <button type="button" key={day} onClick={() => setSelectedDay(day)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${selectedDay === day ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{day}</button>)}</div>
            <div className="grid gap-4 md:grid-cols-3">{(['Bữa sáng', 'Bữa trưa', 'Bữa tối'] as MealName[]).map((meal) => { const recipe = recipes.find((item) => item.name === weeklyPlan[selectedDay]?.[meal]) ?? recipes[0]; return <article key={meal} className="rounded-xl border border-slate-100 p-4"><label className="text-xs font-bold uppercase text-emerald-700">{meal}<select value={recipe.name} onChange={(event) => setWeeklyPlan((days) => ({ ...days, [selectedDay]: { ...days[selectedDay], [meal]: event.target.value } }))} className="mt-2 block w-full rounded-lg border border-slate-200 p-2 text-sm font-semibold normal-case text-slate-800">{recipes.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><p className="mt-2 text-sm text-slate-500">{recipe.detail}</p><span className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{recipe.time}</span><button type="button" onClick={() => addRecipeIngredients(recipe.name)} className="mt-3 block text-sm font-semibold text-emerald-700">Thêm nguyên liệu vào danh sách</button></article>; })}</div>
            <p className="mt-5 text-xs text-slate-500">{demoNotice}</p>
          </section>
        )}

        {kind === 'ai' && (
          <section className={`${cardClass} mx-auto flex max-w-4xl flex-col overflow-hidden`}>
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ChefHat className="h-6 w-6" /></div>
              <div><h2 className="font-bold">Trợ lý VEGEAI</h2><p className="text-xs text-amber-700">Mô phỏng giao diện · phản hồi chưa dùng AI backend</p></div>
            </div>
            <div className="border-b border-slate-100 p-4">
              <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold text-emerald-800">
                <ShoppingBasket className="h-4 w-4" /> Chọn ảnh nguyên liệu trong tủ lạnh
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => setSelectedImage(event.target.files?.[0]?.name ?? '')} />
              </label>
              {selectedImage && <div className="mt-3 rounded-xl bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Ảnh đã chọn: {selectedImage}</p>
                <p className="mt-1 text-xs text-amber-800">Đây là các nguyên liệu minh họa để bạn xác nhận thủ công; ảnh chưa được tải lên hoặc nhận diện bởi AI.</p>
                <div className="mt-3 flex flex-wrap gap-3">{['Đậu hũ', 'Cà chua', 'Rau xanh'].map((ingredient) => <label key={ingredient} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"><input type="checkbox" checked={confirmedImageIngredients.includes(ingredient)} onChange={() => setConfirmedImageIngredients((items) => items.includes(ingredient) ? items.filter((item) => item !== ingredient) : [...items, ingredient])} />{ingredient}</label>)}</div>
                <button type="button" disabled={confirmedImageIngredients.length === 0} onClick={() => addDemoChatExchange(`Nguyên liệu đã xác nhận: ${confirmedImageIngredients.join(', ')}`)} className={`${buttonClass} mt-3 disabled:opacity-50`}>Xác nhận và tìm món</button>
              </div>}
            </div>
            <div className="flex min-h-80 flex-col gap-4 bg-slate-50 p-5">{chat.map((item, index) => <div key={`${item.from}-${index}`} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.from === 'user' ? 'self-end bg-emerald-700 text-white' : 'self-start border border-slate-100 bg-white text-slate-700'}`}>{item.text}{item.recipeName && <Link to={`/recipe/${RECIPES.find((recipe) => recipe.title === item.recipeName)?.id ?? ''}`} className="mt-2 block font-bold text-emerald-800 underline">Xem công thức gợi ý</Link>}</div>)}</div>
            <form onSubmit={sendChat} className="flex gap-2 p-4"><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ví dụ: Tôi có đậu hũ và cà chua..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" /><button aria-label="Gửi tin nhắn" className={buttonClass}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Gửi</span></button></form>
          </section>
        )}

        {kind === 'reviews' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <section className={`${cardClass} p-5 sm:p-7`}>
              <h2 className="text-lg font-bold">Đánh giá {selectedReviewRestaurant.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Chia sẻ cảm nhận của bạn để giúp cộng đồng lựa chọn tốt hơn.</p>
              <div className="mt-5 flex gap-1" aria-label={`Đánh giá ${rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} onClick={() => setRating(star)} aria-label={`${star} sao`} className={star <= rating ? 'text-amber-500' : 'text-slate-300'}><Star className={`h-7 w-7 ${star <= rating ? 'fill-current' : ''}`} /></button>)}</div>
              <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} placeholder="Món ăn và trải nghiệm của bạn..." className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" />
              <button type="button" disabled={!reviewText.trim()} onClick={addReview} className={`${buttonClass} mt-3 disabled:opacity-50`}>Gửi đánh giá</button>
              <p className="mt-3 text-xs text-amber-700">{demoNotice}</p>
            </section>
            <section className={`${cardClass} p-5 sm:p-7`}>
              <h2 className="mb-4 font-bold">Nhận xét gần đây</h2>
              {reviews.filter((review) => review.restaurantId === selectedReviewRestaurantId).map((review) => <article key={review.id} className="border-t border-slate-100 py-4 text-sm leading-6 text-slate-600"><span className="font-bold text-amber-600">{review.rating} sao</span> · {review.text}<span className="block text-xs text-slate-400">{review.createdAt}</span></article>)}
              {!reviews.some((review) => review.restaurantId === selectedReviewRestaurantId) && <p className="border-t border-slate-100 py-4 text-sm text-slate-500">Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm.</p>}
              <Link to={`/restaurants/${selectedReviewRestaurantId}`} className="mt-2 inline-block text-sm font-semibold text-emerald-800">Xem lại thông tin quán</Link>
            </section>
          </div>
        )}

        {kind === 'onboarding' && (
          <section className={`${cardClass} mx-auto max-w-3xl p-5 sm:p-8`}>
            <div className="mb-6 flex items-center justify-between"><h2 className="font-bold">Bước {onboardingStep} / 3</h2><div className="h-2 w-1/2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${onboardingStep * 33.33}%` }} /></div></div>
            {profile.completed && <p className="mb-5 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">Hồ sơ đã lưu trên thiết bị. Bạn có thể chỉnh sửa và lưu lại.</p>}
            {onboardingStep === 1 && <div><h3 className="text-xl font-bold">Mục tiêu ăn uống của bạn?</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{['Ăn uống cân bằng', 'Giảm cân lành mạnh', 'Tăng năng lượng', 'Khám phá món chay'].map((item) => <button type="button" key={item} onClick={() => setProfile((current) => ({ ...current, goal: item }))} className={`rounded-xl border p-4 text-left font-semibold ${profile.goal === item ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200'}`}>{item}</button>)}</div></div>}
            {onboardingStep === 2 && <div><h3 className="text-xl font-bold">Dị ứng hoặc nguyên liệu cần tránh?</h3><p className="mt-1 text-sm text-slate-500">Bỏ qua nếu bạn không có yêu cầu đặc biệt.</p><input value={allergy || profile.allergies.join(', ')} onChange={(event) => setAllergy(event.target.value)} placeholder="Ví dụ: đậu phộng, mè..." className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" /></div>}
            {onboardingStep === 3 && <div><h3 className="text-xl font-bold">Thông tin cơ thể (không bắt buộc)</h3><p className="mt-1 text-sm text-slate-500">Chỉ dùng để tham khảo BMI, không thay thế tư vấn y tế.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Chiều cao (cm)<input inputMode="decimal" value={profile.height} onChange={(event) => setProfile((current) => ({ ...current, height: event.target.value }))} className="mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-medium">Cân nặng (kg)<input inputMode="decimal" value={profile.weight} onChange={(event) => setProfile((current) => ({ ...current, weight: event.target.value }))} className="mt-2 w-full rounded-xl border p-3" /></label></div>{Number(profile.height) > 0 && Number(profile.weight) > 0 && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">BMI tham khảo: {(Number(profile.weight) / ((Number(profile.height) / 100) ** 2)).toFixed(1)}</p>}<p className="mt-4 text-sm text-slate-600">Mục tiêu: {profile.goal} · Nguyên liệu cần tránh: {allergy || profile.allergies.join(', ') || 'Chưa có'}</p></div>}
            <div className="mt-8 flex justify-between"><button type="button" disabled={onboardingStep === 1} onClick={() => setOnboardingStep((step) => step - 1)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Quay lại</button>{onboardingStep < 3 ? <button type="button" onClick={() => setOnboardingStep((step) => step + 1)} className={buttonClass}>Tiếp tục <ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={() => { setProfile((current) => ({ ...current, allergies: allergy.split(',').map((item) => item.trim()).filter(Boolean), completed: true })); navigate('/dashboard'); }} className={buttonClass}>Hoàn thành hồ sơ <Check className="h-4 w-4" /></button>}</div>
            <p className="mt-5 text-xs text-slate-500">{demoNotice}</p>
          </section>
        )}

        {kind === 'admin' && (
          <section className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <aside className={`${cardClass} h-fit p-4`}>
              <h2 className="mb-3 px-2 text-xs font-bold uppercase tracking-wide text-slate-400">Quản lý VEGEAI</h2>
              {['Tổng quan', 'Bài viết chờ duyệt', 'Công thức chờ duyệt', 'Báo cáo người dùng', 'Lịch sử kiểm duyệt'].map((item) => <button type="button" key={item} onClick={() => setAdminTab(item)} className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm ${adminTab === item ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}>{item}</button>)}
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-amber-800">{demoNotice}</p>
            </aside>
            <div className={`${cardClass} p-5 sm:p-7`}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-bold">{adminTab}</h2><p className="mt-1 text-sm text-slate-500">Trạng thái được chia sẻ với luồng blog và nội dung cộng đồng.</p></div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">DEMO ADMIN</span>
              </div>
              {adminTab === 'Tổng quan' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Bài viết chờ duyệt', posts.filter((post) => post.status === 'pending').length], ['Công thức chờ duyệt', recipeSubmissions.filter((item) => item.status === 'pending').length], ['Báo cáo cần xử lý', reports.filter((item) => item.status === 'pending').length], ['Đã xử lý', adminActions.length]].map(([label, value]) => <div key={label} className="rounded-xl bg-emerald-50 p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-extrabold text-emerald-800">{value}</p></div>)}</div>}
              {adminTab === 'Bài viết chờ duyệt' && <div className="divide-y divide-slate-100">{posts.filter((post) => post.status === 'pending').map((post) => <article key={post.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700">{post.category} · {post.author}</p><h3 className="mt-1 font-bold">{post.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{post.excerpt}</p><details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold text-emerald-800">Đọc toàn bài</summary><p className="mt-2 whitespace-pre-line leading-6 text-slate-600">{post.body}</p></details></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setPostStatus(post.id, 'published')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Duyệt bài</button><button type="button" onClick={() => setPostStatus(post.id, 'rejected')} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Từ chối</button></div></div></article>)}{!posts.some((post) => post.status === 'pending') && <p className="py-8 text-center text-sm text-slate-500">Không còn bài viết chờ kiểm duyệt.</p>}</div>}
              {adminTab === 'Công thức chờ duyệt' && <div className="divide-y divide-slate-100">{recipeSubmissions.filter((item) => item.status === 'pending').map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-500">Người gửi: {item.author} · Chờ duyệt</p></div><div className="flex gap-2"><button type="button" onClick={() => reviewRecipeSubmission(item.id, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Duyệt</button><button type="button" onClick={() => reviewRecipeSubmission(item.id, 'rejected')} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Từ chối</button></div></article>)}{!recipeSubmissions.some((item) => item.status === 'pending') && <p className="py-8 text-center text-sm text-slate-500">Không còn công thức chờ kiểm duyệt.</p>}</div>}
              {adminTab === 'Báo cáo người dùng' && <div className="divide-y divide-slate-100">{reports.map((report) => <article key={report.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><h3 className="font-semibold">{report.target}</h3><p className="mt-1 text-sm text-slate-500">Lý do: {report.reason} · Trạng thái: {report.status === 'pending' ? 'Chờ xử lý' : report.status === 'resolved' ? 'Đã xử lý' : 'Bỏ qua'}</p></div>{report.status === 'pending' && <div className="flex gap-2"><button type="button" onClick={() => reviewReport(report.id, 'resolved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Đã xử lý</button><button type="button" onClick={() => reviewReport(report.id, 'dismissed')} className="rounded-lg border px-3 py-2 text-sm font-semibold">Bỏ qua</button></div>}</article>)}</div>}
              {adminTab === 'Lịch sử kiểm duyệt' && <div className="divide-y divide-slate-100">{adminActions.map((action) => <article key={action.id} className="flex flex-wrap justify-between gap-2 py-4"><div><p className="font-semibold">{action.action}</p><p className="text-sm text-slate-600">{action.item}</p></div><time className="text-xs text-slate-500">{action.time}</time></article>)}{adminActions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Chưa có thao tác kiểm duyệt trong phiên demo.</p>}</div>}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
};
