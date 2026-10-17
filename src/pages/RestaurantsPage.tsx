import { useEffect, useState } from 'react';
import {
  Edit3,
  ExternalLink,
  Leaf,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Search,
  Store,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import {
  restaurantService,
  type Coordinates,
  type Place,
  type PlaceCategory,
  type PlaceInput,
} from '../services/restaurantService';

const defaultPlaceForm: PlaceInput = {
  name: '',
  address: '',
  latitude: 10.7769,
  longitude: 106.7009,
  category: 'RESTAURANT',
  rating: 4.7,
  isOpenNow: true,
};

const categoryDisplayFallback: Record<PlaceCategory, string> = {
  ALL: 'Tất cả địa điểm',
  RESTAURANT: 'Quán ăn & Nhà hàng chay',
  SUPERMARKET: 'Siêu thị thực phẩm chay',
  GROCERY_STORE: 'Cửa hàng nguyên liệu',
  DIEN_MAY_XANH: 'Điện Máy Xanh & Thiết bị bếp',
};

export function RestaurantsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState('10');
  const [center, setCenter] = useState<Coordinates | null>({ lat: 10.7769, lon: 106.7009 });
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [busy, setBusy] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('ALL');
  const [categories, setCategories] = useState<{ category: PlaceCategory; displayName: string }[]>([]);

  // Admin Manual Place Management state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlaceInput>(defaultPlaceForm);
  const [savingPlace, setSavingPlace] = useState(false);

  const loadAllMapPlaces = async (selectedCategory: PlaceCategory = 'ALL') => {
    setBusy(true);
    setError('');
    try {
      const [cats, allPlaces] = await Promise.all([
        restaurantService.categories().catch(() => [
          { category: 'ALL' as PlaceCategory, displayName: 'Tất cả địa điểm' },
          { category: 'RESTAURANT' as PlaceCategory, displayName: 'Quán ăn & Nhà hàng chay' },
          { category: 'DIEN_MAY_XANH' as PlaceCategory, displayName: 'Điện Máy Xanh & Thiết bị bếp' },
          { category: 'SUPERMARKET' as PlaceCategory, displayName: 'Siêu thị thực phẩm chay' },
          { category: 'GROCERY_STORE' as PlaceCategory, displayName: 'Cửa hàng nguyên liệu' },
        ]),
        restaurantService.listAll(selectedCategory),
      ]);
      setCategories(cats);
      setPlaces(allPlaces);
      setSearched(true);
      if (allPlaces.length > 0) {
        setSelected(allPlaces[0]);
        setCenter({ lat: allPlaces[0].lat, lon: allPlaces[0].lon });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu bản đồ.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadAllMapPlaces('ALL');
  }, []);

  const loadNearby = async (point: Coordinates) => {
    setCenter(point);
    setSelected(null);
    setPlaces([]);
    setSearched(false);
    const results = await restaurantService.nearby(point, Number(radius), category);
    setPlaces(results);
    setSearched(true);
    if (results[0]) setSelected(results[0]);
  };

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!query.trim()) {
      await loadAllMapPlaces(category);
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setPlaces([]);
      setSelected(null);
      setSearched(false);
      const results = await restaurantService.search(query.trim(), center ?? undefined, Number(radius));
      setPlaces(results);
      setSearched(true);
      if (results[0]) {
        setSelected(results[0]);
        setCenter({ lat: results[0].lat, lon: results[0].lon });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tìm địa điểm.');
    } finally {
      setBusy(false);
    }
  };

  const locate = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!navigator.geolocation) throw new Error('Trình duyệt không hỗ trợ vị trí. Hãy nhập khu vực.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, maximumAge: 60000 })
      );
      await loadNearby({ lat: position.coords.latitude, lon: position.coords.longitude });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không lấy được vị trí. Hãy cho phép truy cập vị trí hoặc nhập khu vực.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSavePlace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin || savingPlace) return;
    setSavingPlace(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        const updated = await restaurantService.updatePlace(editingId, form);
        setPlaces(prev => prev.map(p => (p.id === editingId ? updated : p)));
        setSelected(updated);
        setCenter({ lat: updated.lat, lon: updated.lon });
        setMessage(`Đã cập nhật địa điểm "${updated.name}" trên bản đồ.`);
      } else {
        const created = await restaurantService.createPlace(form);
        setPlaces(prev => [created, ...prev]);
        setSelected(created);
        setCenter({ lat: created.lat, lon: created.lon });
        setMessage(`Đã thêm địa điểm "${created.name}" vào API Map.`);
      }
      setEditorOpen(false);
      setEditingId(null);
      setForm(defaultPlaceForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu địa điểm.');
    } finally {
      setSavingPlace(false);
    }
  };

  const handleDeletePlace = async (place: Place) => {
    if (!isAdmin) return;
    setError('');
    setMessage('');
    try {
      await restaurantService.deletePlace(place.id);
      setPlaces(prev => prev.filter(p => p.id !== place.id));
      if (selected?.id === place.id) {
        setSelected(null);
      }
      setMessage(`Đã xóa địa điểm "${place.name}" khỏi bản đồ.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xóa địa điểm này.');
    }
  };

  const visible = places.filter(place => category === 'ALL' || place.category === category);
  const activePlace = selected && visible.some(p => p.id === selected.id) ? selected : visible[0] || null;
  const point = activePlace ? { lat: activePlace.lat, lon: activePlace.lon } : center;
  const mapUrl = point
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${point.lon - 0.018},${point.lat - 0.012},${point.lon + 0.018},${point.lat + 0.012}&layer=mapnik&marker=${point.lat},${point.lon}`
    : '';

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold text-emerald-700 flex gap-2 items-center mb-2 uppercase tracking-wider">
              <MapPin size={16} /> API BẢN ĐỒ ĐỊA ĐIỂM VEGEAI
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Quán chay gần đây & Hệ thống Điện Máy Xanh
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Tích hợp bản đồ trực quan hiển thị địa chỉ các Quán ăn chay, Siêu thị thực phẩm chay và các cửa hàng Điện Máy Xanh hỗ trợ thiết bị bếp chay.
            </p>
          </div>

          {isAdmin && (
            <Button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(defaultPlaceForm);
                setEditorOpen(value => !value);
              }}
              leftIcon={<Plus size={16} />}
            >
              {editorOpen ? 'Đóng khung thêm địa điểm' : 'Admin: Thêm quán / Điện Máy Xanh lên Map'}
            </Button>
          )}
        </div>

        {/* Admin Manual Place Editor Modal/Panel */}
        {isAdmin && editorOpen && (
          <form
            onSubmit={handleSavePlace}
            className="mb-8 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-700" />
                {editingId ? 'Chỉnh sửa địa điểm trên API Map' : 'Thêm thủ công Quán chay / Điện Máy Xanh lên API Map'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <label className="block space-y-1">
                <span className="font-semibold text-xs text-slate-700">Tên quán chay / cửa hàng Điện Máy Xanh *</span>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Nhà hàng Chay Sen Việt hoặc Điện Máy Xanh Quận 1"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-xs text-slate-700">Phân loại trên Map *</span>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as PlaceCategory })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="RESTAURANT">Quán ăn & Nhà hàng chay</option>
                  <option value="DIEN_MAY_XANH">Điện Máy Xanh & Thiết bị bếp</option>
                  <option value="SUPERMARKET">Siêu thị thực phẩm chay</option>
                  <option value="GROCERY_STORE">Cửa hàng nguyên liệu</option>
                </select>
              </label>

              <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
                <span className="font-semibold text-xs text-slate-700">Địa chỉ chi tiết *</span>
                <input
                  required
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Số nhà, đường, quận/huyện, TP.HCM..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-xs text-slate-700">Vĩ độ (Latitude) *</span>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={form.latitude}
                  onChange={e => setForm({ ...form, latitude: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-xs text-slate-700">Kinh độ (Longitude) *</span>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={form.longitude}
                  onChange={e => setForm({ ...form, longitude: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-xs text-slate-700">Điểm đánh giá (0 - 5)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating ?? 4.7}
                  onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditorOpen(false);
                  setEditingId(null);
                }}
              >
                Hủy
              </Button>
              <Button type="submit" isLoading={savingPlace}>
                {editingId ? 'Cập nhật địa điểm' : 'Lưu địa điểm vào API Map'}
              </Button>
            </div>
          </form>
        )}

        {/* Search & Filter Controls */}
        <form onSubmit={search} className="flex flex-wrap gap-3 mb-5">
          <label className="flex flex-1 min-w-60 items-center gap-3 bg-white border border-gray-200 rounded-xl px-4">
            <Search size={18} className="text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Khu vực tìm quán"
              placeholder="Tìm tên quán chay, Điện Máy Xanh, quận hoặc địa chỉ..."
              className="py-3 outline-none bg-transparent w-full text-sm"
              disabled={busy}
            />
          </label>
          <select
            aria-label="Bán kính tìm kiếm"
            value={radius}
            disabled={busy}
            onChange={e => setRadius(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 text-sm"
          >
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
          </select>
          <Button type="submit" disabled={busy} leftIcon={<Search size={16} />}>
            Tìm trên Map
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={locate} leftIcon={<LocateFixed size={16} />}>
            Vị trí của tôi
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setQuery('');
              void loadAllMapPlaces('ALL');
            }}
          >
            Hiển thị tất cả
          </Button>
        </form>

        {/* Quick Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(
            [
              ['ALL', 'Tất cả địa điểm'],
              ['RESTAURANT', 'Quán ăn & Nhà hàng chay'],
              ['DIEN_MAY_XANH', 'Điện Máy Xanh & Thiết bị bếp'],
              ['SUPERMARKET', 'Siêu thị thực phẩm chay'],
              ['GROCERY_STORE', 'Cửa hàng nguyên liệu'],
            ] as [PlaceCategory, string][]
          ).map(([catCode, label]) => (
            <button
              key={catCode}
              type="button"
              onClick={() => setCategory(catCode)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                category === catCode
                  ? catCode === 'DIEN_MAY_XANH'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50'
              }`}
            >
              {catCode === 'DIEN_MAY_XANH' ? <Store size={14} /> : <Leaf size={14} />}
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-red-700 bg-red-50 rounded-xl p-4 mb-4 text-sm">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-emerald-800 bg-emerald-50 rounded-xl p-4 mb-4 text-sm font-semibold">
            {message}
          </p>
        )}

        <div className="grid lg:grid-cols-[410px_1fr] gap-6 items-start">
          {/* Left Column: List of Restaurants & Điện Máy Xanh Stores */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <p className="text-sm font-bold text-slate-900">
                {searched ? `${visible.length} địa điểm trên bản đồ` : 'Địa điểm trên bản đồ'}
              </p>
              <span className="text-xs text-gray-500">Bấm vào địa điểm để định vị</span>
            </div>

            {busy && (
              <p role="status" className="flex items-center gap-2 text-gray-500 py-8 text-sm">
                <Loader2 size={18} className="animate-spin" /> Đang tải dữ liệu API Map...
              </p>
            )}

            {!busy && searched && !visible.length && (
              <p role="status" className="py-8 text-gray-500 text-sm">
                Chưa có địa điểm phù hợp với bộ lọc hiện tại. Hãy chọn "Tất cả địa điểm" hoặc mở rộng bán kính.
              </p>
            )}

            <div className="max-h-[580px] overflow-y-auto divide-y divide-gray-100">
              {visible.map(place => {
                const isDmx = place.category === 'DIEN_MAY_XANH';
                const isSelected = activePlace?.id === place.id;
                return (
                  <div
                    key={place.id}
                    className={`py-4 px-3 transition rounded-xl ${
                      isSelected ? 'bg-emerald-50/90 border border-emerald-200 my-1' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(place);
                        setCenter({ lat: place.lat, lon: place.lon });
                      }}
                      className="text-left w-full cursor-pointer"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h2 className="font-bold text-base text-slate-900">{place.name}</h2>
                        {place.distance > 0 && (
                          <span className="text-xs font-semibold whitespace-nowrap text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {place.distance.toFixed(1)} km
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isDmx ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isDmx ? <Store size={12} /> : <Leaf size={12} />}
                          {categories.find(item => item.category === place.category)?.displayName ||
                            categoryDisplayFallback[place.category] ||
                            'Địa điểm chay'}
                        </span>
                        {place.rating != null && (
                          <span className="text-xs font-semibold text-amber-700">★ {place.rating}/5</span>
                        )}
                        {place.openNow !== undefined && (
                          <span className={`text-xs ${place.openNow ? 'text-emerald-700' : 'text-gray-400'}`}>
                            · {place.openNow ? 'Đang mở cửa' : 'Đang đóng cửa'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mt-2 leading-5">{place.address}</p>
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-100">
                      <a
                        href={
                          place.googleMapsUrl ||
                          `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex gap-1.5 items-center text-xs font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        <Navigation size={14} /> Chỉ đường Google Maps
                      </a>

                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(place.id);
                              setForm({
                                name: place.name,
                                address: place.address,
                                latitude: place.lat,
                                longitude: place.lon,
                                category: place.category,
                                rating: place.rating ?? 4.7,
                                isOpenNow: place.openNow ?? true,
                              });
                              setEditorOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Edit3 size={13} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeletePlace(place)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 size={13} /> Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column: Interactive Map Viewport + Selected Place Card */}
          <section className="min-w-0 space-y-4">
            {activePlace && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase">Đang định vị trên bản đồ</span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{activePlace.name}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {activePlace.address} ({activePlace.lat.toFixed(4)}, {activePlace.lon.toFixed(4)})
                  </p>
                </div>
                <a
                  href={
                    activePlace.googleMapsUrl ||
                    `https://www.google.com/maps/dir/?api=1&destination=${activePlace.lat},${activePlace.lon}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition shrink-0"
                >
                  <Navigation size={15} /> Mở Google Maps
                </a>
              </div>
            )}

            <div className="h-[440px] sm:h-[520px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              {point ? (
                <iframe
                  title="Bản đồ quán chay và Điện Máy Xanh"
                  src={mapUrl}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              ) : (
                <div className="relative h-full">
                  <img
                    src="/images/vietnamese-vegan-table.png"
                    alt="Bàn ăn chay Việt Nam với đậu phụ, nấm, gỏi cuốn và rau củ"
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white p-6">
                    <Utensils size={24} className="mb-3" />
                    <p className="text-xl font-bold">Một bữa ngon, ngay gần bạn.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Pin Selector Bar below Map */}
            {visible.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5">
                <p className="text-xs font-bold text-gray-600 mb-2">
                  Ghim nhanh địa điểm trên bản đồ ({visible.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visible.slice(0, 12).map(place => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => {
                        setSelected(place);
                        setCenter({ lat: place.lat, lon: place.lon });
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        activePlace?.id === place.id
                          ? 'bg-emerald-700 text-white'
                          : place.category === 'DIEN_MAY_XANH'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                          : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-emerald-50'
                      }`}
                    >
                      <MapPin size={12} />
                      {place.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 text-xs text-gray-500">
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                © OpenStreetMap contributors · VEGEAI Map Places API
              </a>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(
                  query || 'quán chay Điện Máy Xanh'
                )}${center ? `/@${center.lat},${center.lon},14z` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-700 font-semibold"
              >
                Xem toàn bộ trên Google Maps <ExternalLink size={13} />
              </a>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
