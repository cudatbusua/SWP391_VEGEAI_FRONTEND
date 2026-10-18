import { useCallback, useState, type FormEvent } from 'react';
import { ArrowUpRight, Clock3, LocateFixed, MapPin, Navigation, Search, Star, Utensils, Loader2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { OpenStreetMapVegetarianMap } from '../components/OpenStreetMapVegetarianMap';
import { restaurantService, type Coordinates, type Place } from '../services/restaurantService';

const DEFAULT_CENTER: Coordinates = { lat: 10.7769, lon: 106.7009 };

export function RestaurantsPage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState('5');
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const selectPlace = useCallback((place: Place) => setSelected(place), []);

  const load = async (point: Coordinates) => {
    setCenter(point);
    setSelected(null);
    setPlaces([]);
    setSearched(false);
    const results = await restaurantService.verifiedRestaurantsNearby(point, Number(radius));
    setPlaces(results);
    setSearched(true);
  };

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !query.trim()) return;
    setBusy(true);
    setError('');
    setPlaces([]);
    setSelected(null);
    setSearched(false);
    try {
      // Send the location text without the default map center so BE can geocode the requested area.
      const results = await restaurantService.searchVerifiedRestaurants(query.trim(), undefined, Number(radius));
      setPlaces(results);
      setSearched(true);
      if (results[0]) setCenter({ lat: results[0].lat, lon: results[0].lon });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tìm quán chay.');
    } finally {
      setBusy(false);
    }
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
          <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700"><MapPin size={16} /> Khám phá quanh bạn</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Quán chay gần đây</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Tìm quán ăn có thẻ chuyên món chay hoặc thuần chay trên OpenStreetMap.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Chỉ hiển thị kết quả được lọc
        </div>
      </div>

      <form onSubmit={search} className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex min-w-52 flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input value={query} onChange={event => setQuery(event.target.value)} aria-label="Khu vực hoặc tên quán chay"
            placeholder="Nhập quận, khu vực hoặc tên quán..." className="w-full bg-transparent py-3 outline-none" disabled={busy} />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
          <span className="sr-only">Bán kính tìm kiếm</span>
          <select aria-label="Bán kính tìm kiếm" value={radius} disabled={busy} onChange={event => setRadius(event.target.value)} className="bg-transparent py-2.5 outline-none">
            <option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || !query.trim()} leftIcon={<Search size={16} />}>Tìm quán</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void locate()} leftIcon={<LocateFixed size={16} />}>Vị trí của tôi</Button>
      </form>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <p role="note" className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Chỉ nhận quán có thẻ thể hiện chuyên chay hoặc thuần chay: <code className="rounded bg-amber-100 px-1">diet:vegetarian=only</code>, <code className="rounded bg-amber-100 px-1">diet:vegan=only</code>, hoặc cuisine chỉ gồm vegetarian/vegan. Dữ liệu dựa trên thẻ do cộng đồng OpenStreetMap đóng góp.
      </p>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,410px)_1fr]">
        <section className="order-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:order-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-bold text-slate-900">{searched ? `${places.length} quán phù hợp` : 'Quán chay quanh bạn'}</h2><p className="mt-1 text-xs text-slate-500">Sắp xếp theo khoảng cách</p></div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{places.length}</span>
          </div>
          {busy && <p role="status" className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500"><Loader2 size={18} className="animate-spin text-emerald-700" /> Đang tìm địa điểm đã lọc...</p>}
          {!busy && !searched && <div className="px-5 py-10 text-center text-sm text-slate-500"><MapPin size={28} className="mx-auto mb-3 text-emerald-600" /><p>Cho phép vị trí hoặc tìm một khu vực để xem quán chay.</p></div>}
          {!busy && searched && places.length === 0 && <div role="status" className="px-5 py-10 text-center text-sm text-slate-500"><Utensils size={27} className="mx-auto mb-3 text-slate-300" /><p>Chưa có quán chuyên chay hoặc thuần chay nào có thẻ phù hợp trong khu vực này.</p><p className="mt-2 text-xs">Thử đổi khu vực hoặc mở rộng bán kính.</p></div>}
          <div className="max-h-[650px] overflow-y-auto">
            {places.map((place, index) => <article key={place.id} className={`border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-emerald-50/40 ${selected?.id === place.id ? 'bg-emerald-50' : ''}`}>
              <button type="button" onClick={() => selectPlace(place)} className="w-full text-left">
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                    {place.photoUrl && <img src={place.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-emerald-600 text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold leading-5 text-slate-900">{place.name}</h3>
                      <span className="shrink-0 text-xs font-bold text-emerald-700">{place.distance.toFixed(1)} km</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{place.address || 'Địa chỉ chưa được cập nhật'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {place.rating != null && <span className="flex items-center gap-1 text-amber-700"><Star size={13} fill="currentColor" />{place.rating.toFixed(1)}</span>}
                      {place.openNow !== undefined && <span className={`flex items-center gap-1 ${place.openNow ? 'text-emerald-700' : 'text-slate-500'}`}><Clock3 size={13} />{place.openNow ? 'Đang mở cửa' : 'Đang đóng cửa'}</span>}
                    </div>
                  </div>
                </div>
              </button>
              <div className="mt-3 flex items-center justify-between pl-[92px]">
                <span className="text-[11px] font-semibold text-emerald-700">OpenStreetMap: quán chuyên chay/thuần chay</span>
                <a href={place.openStreetMapUrl || `https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lon}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"><Navigation size={14} /> Chỉ đường <ArrowUpRight size={13} /></a>
              </div>
            </article>)}
          </div>
        </section>

        <section className="order-1 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md xl:sticky xl:top-4 xl:order-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div><h2 className="text-sm font-bold text-slate-900">Bản đồ khu vực</h2><p className="text-xs text-slate-500">Các ghim xanh là kết quả nhà hàng chay được lọc</p></div>
            <a href={`https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lon}#map=14/${center.lat}/${center.lon}`}
              target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-emerald-700">OpenStreetMap <ArrowUpRight size={13} /></a>
          </div>
          <div className="h-[460px] sm:h-[560px]">
            <OpenStreetMapVegetarianMap center={center} places={places} selectedPlace={selected} onSelect={selectPlace} />
          </div>
        </section>
      </div>
    </div>
  </MainLayout>;
}
