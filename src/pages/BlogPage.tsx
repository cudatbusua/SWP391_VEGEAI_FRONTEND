import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookOpen, Clock, Search } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { blogPosts } from '../data/blogPosts';

export function BlogPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const filtered = blogPosts.filter(post => (category === 'Tất cả' || post.category === category) && `${post.title} ${post.excerpt}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <MainLayout><div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
    <div className="flex items-end justify-between gap-4 mb-8"><div><p className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2"><BookOpen size={16} /> GÓC SỐNG CHAY</p><h1 className="text-3xl sm:text-4xl font-bold">Blog VEGEAI</h1><p className="text-gray-500 mt-3">Chuyện căn bếp, những bữa ăn và một chút cảm hứng mỗi ngày.</p></div></div>
    <Link to={`/blog/${blogPosts[0].slug}`} className="relative block overflow-hidden rounded-lg mb-8 h-[360px] sm:h-[420px] group">
      <img src={blogPosts[0].image} alt={blogPosts[0].imageAlt} fetchPriority="high" className="w-full h-full object-cover object-center" />
      <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 bg-black/55 text-white"><div className="max-w-2xl"><span className="text-xs font-bold uppercase">Bài nổi bật · {blogPosts[0].category}</span><h2 className="text-2xl sm:text-3xl font-bold mt-3 mb-3">{blogPosts[0].title}</h2><span className="flex items-center gap-2 text-sm font-semibold">Đọc bài viết <ArrowUpRight size={18} /></span></div></div>
    </Link>
    <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-gray-200 pb-5 mb-6"><div className="flex flex-wrap gap-2">{['Tất cả', 'Vào bếp', 'Sống xanh', 'Khám phá'].map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`px-4 py-2 rounded-lg text-sm font-medium ${category === item ? 'bg-emerald-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{item}</button>)}</div><label className="flex items-center gap-2 border border-gray-200 rounded-lg bg-white px-3"><Search size={18} className="text-gray-400" /><input aria-label="Tìm bài viết" placeholder="Tìm bài viết..." value={search} onChange={e => setSearch(e.target.value)} className="py-2.5 w-full sm:w-56 outline-none bg-transparent text-sm" /></label></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{filtered.map(post => <Link key={post.slug} to={`/blog/${post.slug}`} className="group bg-white border border-gray-200 rounded-lg overflow-hidden"><img src={post.image} alt={post.imageAlt} loading="lazy" className="w-full aspect-[16/10] object-cover" /><div className="p-5"><div className="flex justify-between text-xs mb-3"><span className="font-bold text-emerald-700">{post.category}</span><span className="flex items-center gap-1 text-gray-500"><Clock size={13} />{post.minutes} phút đọc</span></div><h2 className="text-xl font-bold group-hover:text-emerald-700">{post.title}</h2><p className="text-sm text-gray-500 mt-3 leading-relaxed">{post.excerpt}</p><span className="flex items-center gap-2 text-sm font-semibold mt-5">Đọc tiếp <ArrowUpRight size={16} /></span></div></Link>)}</div>
    {!filtered.length && <p role="status" className="py-12 text-center text-gray-500">Không tìm thấy bài viết. Hãy thử từ khóa khác.</p>}
  </div></MainLayout>;
}

export function BlogDetailPage() {
  const { slug } = useParams();
  const post = blogPosts.find(item => item.slug === slug);
  return <MainLayout><article className="max-w-3xl mx-auto px-4 py-10"><Link to="/blog" className="inline-flex gap-2 items-center text-sm text-emerald-700 mb-8"><ArrowLeft size={16} /> Trở về blog</Link>{post ? <><p className="text-sm font-semibold text-emerald-700">{post.category} · {post.minutes} phút đọc</p><h1 className="text-3xl sm:text-4xl font-bold mt-3 leading-tight">{post.title}</h1><p className="text-gray-500 text-lg mt-4">{post.excerpt}</p><img src={post.image} alt={post.imageAlt} className="w-full aspect-[16/9] object-cover rounded-lg my-8" />{post.sections.map(([heading, content]) => <section key={heading} className="mb-8"><h2 className="text-xl font-bold mb-3">{heading}</h2><p className="text-gray-600 leading-8">{content}</p></section>)}<Link to="/ai-chef" className="inline-flex items-center gap-2 text-emerald-700 font-semibold">Cùng AI lên ý tưởng cho bữa tiếp theo <ArrowUpRight size={18} /></Link></> : <h1 className="text-2xl font-bold">Không tìm thấy bài viết</h1>}</article></MainLayout>;
}
