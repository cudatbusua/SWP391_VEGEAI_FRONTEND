import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react';
import { useCommunityQuery, useDebouncedValue } from '../hooks/useCommunityQuery';
import { communityService } from '../services/communityService';
import type { CommunityVideo } from '../types/community';

export function RecipeVideoPicker({ ids, initial, change }: {
  ids: string[]; initial: CommunityVideo[]; change: (ids: string[]) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [known, setKnown] = useState<Record<string, CommunityVideo>>({});
  const search = useDebouncedValue(keyword.trim());
  const query = useCommunityQuery(JSON.stringify([search, page]), signal => communityService.adminVideos({ keyword: search, page }, signal));
  useEffect(() => {
    setKnown(previous => ({ ...previous, ...Object.fromEntries([...initial, ...(query.data?.items || [])].map(video => [video.id, video])) }));
  }, [initial, query.data]);
  return <fieldset className="border-t border-gray-200 pt-5 space-y-3">
    <legend className="font-semibold text-base">Video cách nấu ({ids.length}/10)</legend>
    <div className="flex flex-wrap gap-2">{ids.map(id => <span key={id} className="inline-flex max-w-full items-center gap-2 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 rounded-lg"><span className="min-w-0 break-words">{known[id]?.title || id}</span><button type="button" title="Bỏ liên kết video" aria-label={'Bỏ video ' + (known[id]?.title || id)} onClick={() => change(ids.filter(value => value !== id))}><X size={16} /></button></span>)}</div>
    <label className="flex gap-2 items-center border rounded-lg px-3 py-2"><Search size={18} /><input aria-label="Tìm video cách nấu" placeholder="Tìm video" value={keyword} onChange={event => { setKeyword(event.target.value); setPage(0); }} className="min-w-0 w-full outline-none text-sm" /></label>
    {query.busy && <p role="status" className="text-sm text-gray-500">Đang tải video...</p>}
    {query.error && <div role="alert" className="text-sm text-red-700">{query.error}<button type="button" title="Tải lại video" aria-label="Tải lại video" onClick={query.refresh} className="ml-2"><RefreshCw size={16} /></button></div>}
    {query.data && <><div className="divide-y border-y">{query.data.items.length === 0 && <p className="py-3 text-sm text-gray-500">Không tìm thấy video.</p>}{query.data.items.map(video => <label key={video.id} className="flex items-start gap-3 py-3 text-sm cursor-pointer"><input type="checkbox" className="mt-1" checked={ids.includes(video.id)} disabled={!ids.includes(video.id) && ids.length >= 10} onChange={() => change(ids.includes(video.id) ? ids.filter(id => id !== video.id) : [...ids, video.id])} /><span className="min-w-0 break-words">{video.title}<span className="block text-xs text-gray-500 mt-1">{video.status === 'PUBLISHED' ? 'Công khai' : 'Bản nháp'}</span></span></label>)}</div>
      {query.data.totalPages > 1 && <div className="flex items-center justify-end gap-3 text-sm"><button type="button" title="Trang video trước" aria-label="Trang video trước" disabled={page === 0} onClick={() => setPage(page - 1)} className="p-2 disabled:opacity-40"><ChevronLeft size={18} /></button><span>{page + 1} / {query.data.totalPages}</span><button type="button" title="Trang video sau" aria-label="Trang video sau" disabled={page + 1 >= query.data.totalPages} onClick={() => setPage(page + 1)} className="p-2 disabled:opacity-40"><ChevronRight size={18} /></button></div>}</>}
  </fieldset>;
}
