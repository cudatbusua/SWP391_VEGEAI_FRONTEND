import { useCallback, useState, useEffect, type FormEvent } from 'react';
import { ArrowUpRight, Clock3, LocateFixed, MapPin, Navigation, Search, Star, Utensils, Loader2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { OpenStreetMapVegetarianMap } from '../components/OpenStreetMapVegetarianMap';
import { restaurantService, type Coordinates, type Place } from '../services/restaurantService';

const DEFAULT_CENTER: Coordinates = { lat: 10.7769, lon: 106.7009 };

const CATEGORY_FILTERS: { id: Place['category']; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'RESTAURANT', label: 'Quán ăn / Nhà hàng' },
  { id: 'SUPERMARKET', label: 'Siêu thị' },
  { id: 'GROCERY_STORE', label: 'Cửa hàng tiện lợi & Thực phẩm' },
];

function placeSourceBadge(place: Place): { label: string; className: string } {
  if (place.isVerified) {
    return {
      label: 'Chuyên chay xác thực OSM',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    };
  }
  if (place.category === 'SUPERMARKET') {
    return {
      label: 'Siêu thị · nguyên liệu & đồ chay',
      className: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    };
  }
  if (place.category === 'GROCERY_STORE') {
    return {
      label: 'Cửa hàng tiện lợi / Thực phẩm',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    };
  }
  return {
    label: 'Quán ăn chay / có món chay',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  };
}

export function RestaurantsPage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState('5');
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [places, setPlaces] = useState<Place[]>([]);
  const [category, setCategory] = useState<Place['category']>('ALL');
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const selectPlace = useCallback((place: Place) => setSelected(place), []);

  const load = async (
    point: Coordinates,
    nextCategory: Place['category'] = category,
    nextExclusive = exclusiveOnly,
  ) => {
    setActiveQuery(null);
    setCenter(point);
    setSelected(null);
    setPlaces([]);
    setSearched(false);
    setBusy(true);
    try {
      const results = nextExclusive
        ? await restaurantService.verifiedRestaurantsNearby(point, Number(radius))
        : await restaurantService.nearby(point, Number(radius), nextCategory);
      setPlaces(results);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách địa điểm.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(DEFAULT_CENTER);
  }, []);

  const runSearch = async (
    targetQuery: string,
    nextCategory: Place['category'] = category,
    nextExclusive = exclusiveOnly,
  ) => {
    const trimmed = targetQuery.trim();
    if (!trimmed) return;
    setBusy(true);
    setError('');
    setPlaces([]);
    setSelected(null);
    setSearched(false);
    try {
      // Send the location text without the default map center so BE can geocode the requested area.
      setActiveQuery(trimmed);
      const results = nextExclusive
        ? await restaurantService.searchVerifiedRestaurants(trimmed, undefined, Number(radius))
        : await restaurantService.search(trimmed, undefined, Number(radius), nextCategory);
      setPlaces(results);
      setSearched(true);
      if (results[0]) setCenter({ lat: results[0].lat, lon: results[0].lon });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tìm địa điểm.');
    } finally {
      setBusy(false);
    }
  };

  const applyFilters = (nextCategory: Place['category'], nextExclusive: boolean) => {
    setCategory(nextCategory);
    setExclusiveOnly(nextExclusive);
    if (activeQuery) {
      void runSearch(activeQuery, nextCategory, nextExclusive);
    } else {
      void load(center, nextCategory, nextExclusive);
    }
  };

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !query.trim()) return;
    await runSearch(query, category, exclusiveOnly);
  };

  const locate = async () => {
    setBusy(true);
    setError('');
    try {
      if (!navigator.geolocation) throw new Error('Trình duyệt không hỗ trợ vị trí. Hãy tìm theo khu vực.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, maximumAge: 60000 }));
      await load({ lat: position.coords.latitude, lon: position.coords.longitude });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lấy được vị trí. Hãy cho phép truy cập vị trí hoặc tìm theo khu vực.');
    } finally {
      setBusy(false);
    }
  };

  return <MainLayout>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><MapPin size={16} /> Khám phá quanh bạn</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Quán chay &amp; Cửa hàng đồ chay gần đây</h1>
          <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">Tìm quán ăn chay, quán có món chay, siêu thị và cửa hàng tiện lợi bán nguyên liệu, thực phẩm chay trên OpenStreetMap.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          {exclusiveOnly ? 'Chỉ hiển thị quán chuyên chay' : 'Quán chay, siêu thị & cửa hàng'}
        </div>
      </div>

      <form onSubmit={search} className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
        <label className="flex min-w-52 flex-1 items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 dark:focus-within:ring-emerald-900">
          <Search size={18} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <input value={query} onChange={event => setQuery(event.target.value)} aria-label="Khu vực hoặc địa điểm cần tìm"
            placeholder="Nhập quận, khu vực (VD: Quận 1, Thảo Điền, Cầu Giấy)..." className="w-full bg-transparent py-3 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" disabled={busy} />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="sr-only">Bán kính tìm kiếm</span>
          <select aria-label="Bán kính tìm kiếm" value={radius} disabled={busy} onChange={event => setRadius(event.target.value)} className="bg-transparent py-2.5 outline-none text-slate-900 dark:text-white">
            <option value="2" className="dark:bg-slate-800">2 km</option><option value="5" className="dark:bg-slate-800">5 km</option><option value="10" className="dark:bg-slate-800">10 km</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || !query.trim()} leftIcon={<Search size={16} />}>Tìm địa điểm</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void locate()} leftIcon={<LocateFixed size={16} />}>Vị trí của tôi</Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc loại địa điểm">
          {CATEGORY_FILTERS.map(item => {
            const active = !exclusiveOnly && category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={busy}
                onClick={() => applyFilters(item.id, false)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={exclusiveOnly}
            disabled={busy}
            onChange={event => applyFilters(category, event.target.checked)}
            className="h-3.5 w-3.5 rounded accent-emerald-600"
          />
          <span>Chỉ quán chuyên chay (thẻ OSM)</span>
        </label>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-4 text-sm text-red-800 dark:text-red-300">{error}</p>}
      <p role="note" className="mb-5 rounded-xl border border-amber-100 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs leading-5 text-amber-900 dark:text-amber-200">
        {exclusiveOnly ? (
          <>
            Đang lọc nghiêm ngặt theo thẻ chuyên chay hoặc thuần chay trên OpenStreetMap: <code className="rounded bg-amber-100 dark:bg-amber-900/80 px-1 text-amber-950 dark:text-amber-100">diet:vegetarian=only</code>, <code className="rounded bg-amber-100 dark:bg-amber-900/80 px-1 text-amber-950 dark:text-amber-100">diet:vegan=only</code>, hoặc cuisine chỉ gồm vegetarian/vegan.
          </>
        ) : (
          <>
            Hiển thị quán chay, nhà hàng có món chay cùng siêu thị, cửa hàng tiện lợi và cửa hàng thực phẩm có bán nguyên liệu/món chay nói chung (dữ liệu OpenStreetMap).
          </>
        )}
      </p>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,410px)_1fr]">
        <section className="order-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm xl:order-1">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
            <div><h2 className="font-bold text-slate-900 dark:text-white">{searched ? `${places.length} địa điểm phù hợp` : 'Địa điểm quanh bạn'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sắp xếp theo khoảng cách</p></div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">{places.length}</span>
          </div>
          {busy && <p role="status" className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400"><Loader2 size={18} className="animate-spin text-emerald-700 dark:text-emerald-400" /> Đang tìm địa điểm quanh khu vực...</p>}
          {!busy && !searched && <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"><MapPin size={28} className="mx-auto mb-3 text-emerald-600 dark:text-emerald-400" /><p>Cho phép vị trí hoặc tìm một khu vực để xem quán chay và cửa hàng nguyên liệu.</p></div>}
          {!busy && searched && places.length === 0 && <div role="status" className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400"><Utensils size={27} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" /><p>{exclusiveOnly ? 'Chưa có quán chuyên chay hoặc thuần chay nào có thẻ phù hợp trong khu vực này.' : 'Chưa tìm thấy quán chay, siêu thị hoặc cửa hàng tiện lợi phù hợp trong khu vực này.'}</p><p className="mt-2 text-xs">Thử đổi danh mục, đổi khu vực hoặc mở rộng bán kính.</p></div>}
          <div className="max-h-[650px] overflow-y-auto">
            {places.map((place, index) => <article key={place.id} className={`border-b border-slate-100 dark:border-slate-800 p-4 transition last:border-b-0 hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 ${selected?.id === place.id ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
              <button type="button" onClick={() => selectPlace(place)} className="w-full text-left">
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                    {place.photoUrl && <img src={place.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white dark:border-slate-800 bg-emerald-600 text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold leading-5 text-slate-900 dark:text-white">{place.name}</h3>
                      <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-400">{place.distance.toFixed(1)} km</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500 dark:text-slate-400">{place.address || 'Địa chỉ chưa được cập nhật'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {place.rating != null && <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><Star size={13} fill="currentColor" />{place.rating.toFixed(1)}</span>}
                      {place.openNow !== undefined && <span className={`flex items-center gap-1 ${place.openNow ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}><Clock3 size={13} />{place.openNow ? 'Đang mở cửa' : 'Đang đóng cửa'}</span>}
                    </div>
                  </div>
                </div>
              </button>
              <div className="mt-3 flex items-center justify-between pl-[92px]">
                {(() => {
                  const badge = placeSourceBadge(place);
                  return (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  );
                })()}
                <a href={place.openStreetMapUrl || `https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lon}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300"><Navigation size={14} /> Chỉ đường <ArrowUpRight size={13} /></a>
              </div>
            </article>)}
          </div>
        </section>

        <section className="order-1 min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md xl:sticky xl:top-4 xl:order-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Bản đồ khu vực</h2><p className="text-xs text-slate-500 dark:text-slate-400">Các ghim xanh là kết quả nhà hàng chay được lọc</p></div>
            <a href={`https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lon}#map=14/${center.lat}/${center.lon}`}
              target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">OpenStreetMap <ArrowUpRight size={13} /></a>
          </div>
          <div className="h-[460px] sm:h-[560px]">
            <OpenStreetMapVegetarianMap center={center} places={places} selectedPlace={selected} onSelect={selectPlace} />
          </div>
        </section>
      </div>
    </div>
  </MainLayout>;
}
