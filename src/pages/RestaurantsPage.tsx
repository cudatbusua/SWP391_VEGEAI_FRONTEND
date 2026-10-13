import { useState } from 'react';
import { MapPin, LocateFixed, Search, Navigation, ExternalLink, Leaf, Utensils, Loader2 } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { restaurantService, type Coordinates, type Place } from '../services/restaurantService';

export function RestaurantsPage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState('5');
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [veganOnly, setVeganOnly] = useState(false);
  const load = async (point: Coordinates) => {
    setCenter(point); setSelected(null); setPlaces([]); setSearched(false);
    const results = await restaurantService.nearby(point, Number(radius));
    setPlaces(results); setSearched(true);
  };
  const search = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || !query.trim()) return;
    setBusy(true); setError('');
    try { await load(await restaurantService.locate(query.trim())); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tìm quán.'); }
    finally { setBusy(false); }
  };
  const locate = async () => {
    setBusy(true); setError('');
    try {
      if (!navigator.geolocation) throw new Error('Trình duyệt không hỗ trợ vị trí. Hãy nhập khu vực.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, maximumAge: 60000 }));
      await load({ lat: position.coords.latitude, lon: position.coords.longitude });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lấy được vị trí. Hãy cho phép truy cập vị trí hoặc nhập khu vực.'); }
    finally { setBusy(false); }
  };
  const visible = places.filter(place => !veganOnly || place.vegan);
  const point = selected ?? center;
  const mapUrl = point ? `https://www.openstreetmap.org/export/embed.html?bbox=${point.lon - 0.025},${point.lat - 0.018},${point.lon + 0.025},${point.lat + 0.018}&layer=mapnik&marker=${point.lat},${point.lon}` : '';
  return <MainLayout><div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
    <p className="text-sm font-semibold text-emerald-700 flex gap-2 items-center mb-2"><MapPin size={16} /> KHÁM PHÁ QUANH BẠN</p><h1 className="text-3xl sm:text-4xl font-bold">Quán chay gần đây</h1><p className="text-gray-500 mt-3 mb-7">Tìm một điểm hẹn cho bữa chay tiếp theo.</p>
    <form onSubmit={search} className="flex flex-wrap gap-3 mb-6"><label className="flex flex-1 min-w-48 items-center gap-3 bg-white border border-gray-200 rounded-lg px-4"><Search size={18} className="text-gray-400" /><input value={query} onChange={e => setQuery(e.target.value)} aria-label="Khu vực tìm quán" placeholder="Quận, thành phố hoặc địa chỉ..." className="py-3.5 outline-none bg-transparent w-full text-sm" disabled={busy} /></label><select aria-label="Bán kính tìm kiếm" value={radius} disabled={busy} onChange={e => setRadius(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 text-sm"><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option></select><Button type="submit" disabled={busy || !query.trim()} leftIcon={<Search size={16} />}>Tìm quán</Button><Button type="button" variant="outline" disabled={busy} onClick={locate} leftIcon={<LocateFixed size={16} />}>Vị trí của tôi</Button></form>
    {error && <p role="alert" className="text-red-700 bg-red-50 rounded-lg p-4 mb-4">{error}</p>}
    <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start"><section><div className="flex justify-between items-center pb-4 border-b border-gray-200"><p className="text-sm font-semibold">{searched ? `${visible.length} địa điểm` : 'Địa điểm quanh bạn'}</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={veganOnly} onChange={e => setVeganOnly(e.target.checked)} className="accent-emerald-700" /> Có món thuần chay</label></div>
      {busy && <p role="status" className="flex items-center gap-2 text-gray-500 py-8"><Loader2 size={18} className="animate-spin" /> Đang tìm quán quanh khu vực...</p>}
      {!busy && !searched && <div className="py-10 text-gray-500"><MapPin size={28} className="mb-3 text-emerald-600" /><p>Chọn vị trí hoặc nhập khu vực để tìm quán.</p></div>}
      {!busy && searched && !visible.length && <p role="status" className="py-8 text-gray-500">Chưa có địa điểm phù hợp trong dữ liệu. Thử mở rộng bán kính hoặc xem Google Maps.</p>}
      <div className="max-h-[570px] overflow-auto">{visible.map(place => <div key={place.id} className={`py-5 border-b border-gray-200 ${selected?.id === place.id ? 'bg-emerald-50 px-3' : ''}`}><button onClick={() => setSelected(place)} className="text-left w-full"><div className="flex justify-between gap-3"><h2 className="font-bold text-lg">{place.name}</h2><span className="text-sm whitespace-nowrap text-emerald-700">{place.distance.toFixed(1)} km</span></div><p className="flex items-center gap-1 text-xs text-emerald-700 mt-2"><Leaf size={13} />{place.vegan ? 'Có món thuần chay' : 'Quán chay / có món chay'}</p><p className="text-sm text-gray-500 mt-2">{place.address || 'Địa chỉ chưa được cập nhật'}</p>{place.hours && <p className="text-xs text-gray-500 mt-2">Giờ mở cửa: {place.hours}</p>}</button><a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`} target="_blank" rel="noreferrer" className="inline-flex gap-2 items-center text-sm font-semibold text-emerald-700 mt-3"><Navigation size={15} /> Chỉ đường</a></div>)}</div>
    </section><section className="min-w-0"><div className="h-[420px] sm:h-[520px] bg-white border border-gray-200 rounded-lg overflow-hidden">{point ? <iframe title="Bản đồ quán chay" src={mapUrl} className="w-full h-full border-0" loading="lazy" /> : <div className="relative h-full"><img src="/images/vietnamese-vegan-table.png" alt="Bàn ăn chay Việt Nam với đậu phụ, nấm, gỏi cuốn và rau củ" fetchPriority="high" className="w-full h-full object-cover" /><div className="absolute bottom-0 inset-x-0 bg-black/60 text-white p-6"><Utensils size={24} className="mb-3" /><p className="text-xl font-bold">Một bữa ngon, ngay gần bạn.</p></div></div>}</div><div className="flex flex-wrap justify-between gap-3 mt-4 text-xs text-gray-500"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><a href={`https://www.google.com/maps/search/${encodeURIComponent(`quán chay ${query}`)}${center ? `/@${center.lat},${center.lon},14z` : ''}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-700 font-semibold">Xem Google Maps <ExternalLink size={13} /></a></div><p className="text-xs text-gray-500 mt-3">Khoảng cách theo đường thẳng. Hãy xác nhận giờ mở cửa và thực đơn với quán.</p></section></div>
  </div></MainLayout>;
}
