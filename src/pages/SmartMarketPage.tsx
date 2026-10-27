import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Utensils,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  MapPin,
  Navigation,
  Search,
  ExternalLink,
  ShieldAlert,
  ShoppingCart,
  Check,
  X,
  ArrowRight,
  Store,
  Clock,
  Phone,
  Info,
  CheckCircle,
  Tag,
  Star,
  PackageCheck,
  Truck,
  Flame,
  BadgePercent
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { SmartMarketMap } from '../components/SmartMarketMap';
import { sfx } from '../utils/soundEffects';
import { fridgeService } from '../services/fridgeService';
import { userService } from '../services/userService';
import {
  INITIAL_SMART_MARKET_ITEMS,
  type SmartMarketItem,
  type SmartMarketStore,
  type StoreCatalogItem
} from '../data/smartMarketData';
import {
  fetchRealPlacesNearby,
  reverseGeocodeAddress,
  buildAnchoredStoresForCoordinates
} from '../services/smartMarketRealPlacesService';

const LOCAL_STORAGE_KEY = 'vegeai:smart-market:items-v1';
const SESSION_GPS_KEY = 'vegeai:session:gps_coords';
const SESSION_ADDR_KEY = 'vegeai:session:gps_address';

export interface MultiStoreCartItem {
  id: string; // storeId + catalogItemId
  catalogItemId: string;
  name: string;
  price: number;
  priceFormatted: string;
  unit: string;
  imageEmoji: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeCategory: string;
  count: number;
}

export interface StoreOrderGroup {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeCategory: string;
  items: MultiStoreCartItem[];
  subtotal: number;
  shippingFee: number;
  deliveryTime: string;
}

function loadInitialItems(): SmartMarketItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

const NON_VEGAN_KEYWORDS = [
  'thịt', 'thit', 'heo', 'lợn', 'bò', 'bo', 'gà', 'ga', 'vịt', 'vit', 'chim', 'cừu', 'dê',
  'cá', 'ca', 'tôm', 'tom', 'cua', 'mực', 'muc', 'ốc', 'oc', 'hàu', 'sò', 'chả cá',
  'mỡ', 'da heo', 'da bò', 'tiết', 'huyết', 'pate gan', 'lạp xưởng', 'xúc xích heo',
  'mắm tôm', 'mắm tép', 'mắm cá', 'mắm nêm', 'nước mắm cá'
];

const NON_FOOD_KEYWORDS = [
  'củi', 'gỗ', 'que củi', 'nhựa', 'đá', 'sỏi', 'xi măng', 'cát', 'giấy', 'kim loại',
  'bụi cây hoạt hình', 'cây cỏ giả'
];

const SUGGESTED_VEGAN_TAGS = [
  { name: 'Cải ngọt VietGAP', category: 'produce' },
  { name: 'Cải thìa xanh', category: 'produce' },
  { name: 'Nấm rơm búp tươi', category: 'produce' },
  { name: 'Nấm đùi gà', category: 'produce' },
  { name: 'Đậu hũ non hữu cơ', category: 'protein' },
  { name: 'Bí đỏ hồ lô', category: 'produce' },
  { name: 'Gạo lứt huyết rồng', category: 'grains' },
  { name: 'Hạt nêm nấm củ quả', category: 'spices' }
];


export interface MealCombo {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  price: number;
  priceFormatted: string;
  originalPriceFormatted: string;
  savingFormatted: string;
  prepTime: string;
  calories: string;
  ingredients: { name: string; amount: string; price: number; unit: string; emoji: string }[];
}

export const MEAL_COMBOS: MealCombo[] = [
  {
    id: 'combo-canh-chua',
    name: 'Canh Chua Chay Nam Bộ',
    tagline: 'Chua thanh ngọt mát, đậm đà vị me kết hợp đậu bắp & nấm bào ngư',
    emoji: '🍲',
    price: 48000,
    priceFormatted: '48.000 đ',
    originalPriceFormatted: '60.000 đ',
    savingFormatted: 'Tiết kiệm 12.000 đ',
    prepTime: '20 phút',
    calories: '280 kcal',
    ingredients: [
      { name: 'Cà chua Đà Lạt', amount: '2 quả (300g)', price: 10000, unit: 'gói', emoji: '🍅' },
      { name: 'Đậu bắp xanh VietGAP', amount: '200g', price: 9000, unit: 'gói', emoji: '🫑' },
      { name: 'Bạc hà (dọc mùng)', amount: '200g', price: 8000, unit: 'gói', emoji: '🥬' },
      { name: 'Thơm / Dứa mật', amount: '1/2 quả', price: 9000, unit: 'phần', emoji: '🍍' },
      { name: 'Nấm bào ngư tươi', amount: '200g', price: 12000, unit: 'hộp', emoji: '🍄' },
    ]
  },
  {
    id: 'combo-dau-hu-sot-ca',
    name: 'Đậu Hũ Non Sốt Cà Nấm Đông Cô',
    tagline: 'Đậu hũ non béo ngậy, sốt cà ri chua ngọt thơm ngát hành boa-rô',
    emoji: '🧈',
    price: 39000,
    priceFormatted: '39.000 đ',
    originalPriceFormatted: '47.000 đ',
    savingFormatted: 'Tiết kiệm 8.000 đ',
    prepTime: '15 phút',
    calories: '320 kcal',
    ingredients: [
      { name: 'Đậu hũ non VietGAP', amount: '2 cây (600g)', price: 16000, unit: 'gói', emoji: '🧈' },
      { name: 'Cà chua bi hữu cơ', amount: '250g', price: 11000, unit: 'hộp', emoji: '🍅' },
      { name: 'Nấm đông cô tươi', amount: '150g', price: 12000, unit: 'gói', emoji: '🍄' },
    ]
  },
  {
    id: 'combo-lau-nam',
    name: 'Lẩu Nấm Đại Bổ Thanh Đạm',
    tagline: 'Ngọt vị nước dùng thảo mộc, bồi bổ năng lượng và tăng đề kháng',
    emoji: '🥘',
    price: 79000,
    priceFormatted: '79.000 đ',
    originalPriceFormatted: '99.000 đ',
    savingFormatted: 'Tiết kiệm 20.000 đ',
    prepTime: '25 phút',
    calories: '350 kcal',
    ingredients: [
      { name: 'Nấm kim châm', amount: '1 gói (150g)', price: 12000, unit: 'gói', emoji: '🍄' },
      { name: 'Nấm đùi gà baby', amount: '200g', price: 18000, unit: 'gói', emoji: '🍄' },
      { name: 'Nấm bào ngư xám', amount: '200g', price: 14000, unit: 'gói', emoji: '🍄' },
      { name: 'Cải thảo Đà Lạt', amount: '500g', price: 15000, unit: 'bắp', emoji: '🥬' },
      { name: 'Bắp ngọt non', amount: '2 bắp', price: 12000, unit: 'bắp', emoji: '🌽' },
      { name: 'Bún gạo lứt hữu cơ', amount: '300g', price: 8000, unit: 'gói', emoji: '🍜' },
    ]
  },
  {
    id: 'combo-rau-muong-xao',
    name: 'Rau Muống Xào Tỏi Chay & Gạo Lứt',
    tagline: 'Rau muống giòn ngọt phi boa-rô kết hợp cơm gạo lứt dẻo thơm',
    emoji: '🥗',
    price: 32000,
    priceFormatted: '32.000 đ',
    originalPriceFormatted: '38.000 đ',
    savingFormatted: 'Tiết kiệm 6.000 đ',
    prepTime: '12 phút',
    calories: '380 kcal',
    ingredients: [
      { name: 'Rau muống nước VietGAP', amount: '1 bó (500g)', price: 5000, unit: 'bó', emoji: '🥬' },
      { name: 'Hành boa-rô thơm', amount: '2 cây', price: 7000, unit: 'bó', emoji: '🧄' },
      { name: 'Gạo lứt đỏ hữu cơ', amount: '500g', price: 20000, unit: 'túi', emoji: '🍚' },
    ]
  }
];

export const VIETGAP_5K_VEGGIES = [
  { name: 'Cải ngọt VietGAP (500g)', price: 5000, originalPrice: '14.000đ', emoji: '🥬' },
  { name: 'Cải thìa VietGAP (500g)', price: 5000, originalPrice: '15.000đ', emoji: '🥬' },
  { name: 'Mồng tơi VietGAP (500g)', price: 5000, originalPrice: '12.000đ', emoji: '🌱' },
  { name: 'Rau muống nước (500g)', price: 5000, originalPrice: '11.000đ', emoji: '🌿' },
  { name: 'Rau dền đỏ VietGAP (500g)', price: 5000, originalPrice: '12.000đ', emoji: '🥬' },
];

export const PREDEFINED_AREAS = [
  { name: 'Thảo Điền', lat: 10.8030, lon: 106.7360, addr: 'Đường Quốc Hương, Phường Thảo Điền, TP. Thủ Đức, TP.HCM' },
  { name: 'Phú Nhuận', lat: 10.7952, lon: 106.6855, addr: '184 Phan Xích Long, Phường 2, Q. Phú Nhuận, TP.HCM' },
  { name: 'Quận 1', lat: 10.7769, lon: 106.7009, addr: 'Đường Nguyễn Du, Phường Bến Nghé, Quận 1, TP.HCM' },
  { name: 'Bình Thạnh', lat: 10.8035, lon: 106.6940, addr: 'Đường Hoàng Hoa Thám, Phường 7, Q. Bình Thạnh, TP.HCM' }
];

export function SmartMarketPage() {
  const [items, setItems] = useState<SmartMarketItem[]>(loadInitialItems);
  const [mainView, setMainView] = useState<'map' | 'checklist'>('map');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unbought' | 'bought'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Address requirement & gate state: If user has not confirmed an address, do not show map & stores immediately!
  const [isAddressConfirmed, setIsAddressConfirmed] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem(SESSION_ADDR_KEY) && sessionStorage.getItem(SESSION_GPS_KEY));
  });
  const [manualAddressInput, setManualAddressInput] = useState('');

  // Location permission & session persistence
  const [userLoc, setUserLoc] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_GPS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.lat && parsed?.lon) return parsed;
      }
    } catch {}
    return { lat: 10.8030, lon: 106.7360 };
  });

  const [userAddress, setUserAddress] = useState(() => {
    return sessionStorage.getItem(SESSION_ADDR_KEY) || '';
  });

  // Stores State (Only initialized if address was already confirmed in this session)
  const [stores, setStores] = useState<SmartMarketStore[]>(() => {
    const cachedLoc = sessionStorage.getItem(SESSION_GPS_KEY);
    if (cachedLoc) {
      try {
        const parsed = JSON.parse(cachedLoc);
        if (parsed?.lat && parsed?.lon) {
          return buildAnchoredStoresForCoordinates(parsed.lat, parsed.lon);
        }
      } catch {}
    }
    return [];
  });
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeTypeFilter, setStoreTypeFilter] = useState<string>('ALL');
  const [selectedStore, setSelectedStore] = useState<SmartMarketStore | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [locationStatus, setLocationStatus] = useState<'default' | 'requesting' | 'granted' | 'denied'>('default');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  // New item form
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<'produce' | 'protein' | 'grains' | 'spices'>('produce');
  const [newMealNote, setNewMealNote] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Multi-Store Cart (ShopeeFood / GrabFood style)
  const [multiCart, setMultiCart] = useState<MultiStoreCartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [cartAddToast, setCartAddToast] = useState('');
  const [catalogSubcategory, setCatalogSubcategory] = useState<string>('ALL');

  const filteredStoreCatalog = useMemo(() => {
    if (!selectedStore?.catalog) return [];
    if (catalogSubcategory === 'ALL') return selectedStore.catalog;
    return selectedStore.catalog.filter(item => {
      const lower = (item.name + ' ' + (item.category || '')).toLowerCase();
      if (catalogSubcategory === 'VEG') {
        return lower.includes('rau') || lower.includes('cải') || lower.includes('cà') || lower.includes('mồng tơi') || lower.includes('muống') || lower.includes('dưa') || lower.includes('bầu') || lower.includes('bí') || lower.includes('mướp') || lower.includes('củ');
      }
      if (catalogSubcategory === 'MUSHROOM') {
        return lower.includes('nấm') || lower.includes('mộc nhĩ');
      }
      if (catalogSubcategory === 'PROTEIN') {
        return lower.includes('đậu') || lower.includes('tofu') || lower.includes('chả') || lower.includes('sườn') || lower.includes('đạm');
      }
      if (catalogSubcategory === 'GRAINS') {
        return lower.includes('gạo') || lower.includes('bún') || lower.includes('phở') || lower.includes('mì') || lower.includes('yến mạch') || lower.includes('hạt');
      }
      if (catalogSubcategory === 'SPICE') {
        return lower.includes('nước tương') || lower.includes('hạt nêm') || lower.includes('tiêu') || lower.includes('ớt') || lower.includes('dầu') || lower.includes('sốt');
      }
      return true;
    });
  }, [selectedStore, catalogSubcategory]);

  const handleAddComboToCart = (combo: MealCombo) => {
    sfx.playSuccess();
    const targetStore = selectedStore || stores.find(s => s.name.includes('Bách Hóa Xanh') || s.category === 'SUPERMARKET') || stores[0];
    if (targetStore) {
      setMultiCart(prev => {
        let next = [...prev];
        combo.ingredients.forEach(ing => {
          const cartItemId = `${targetStore.id}___combo_${ing.name.toLowerCase().replace(/\s+/g, '_')}`;
          const existing = next.find(i => i.id === cartItemId);
          if (existing) next = next.map(i => i.id === cartItemId ? { ...i, count: i.count + 1 } : i);
          else next.push({
            id: cartItemId, catalogItemId: `combo_${ing.name}`, name: ing.name,
            price: ing.price, priceFormatted: `${ing.price.toLocaleString('vi-VN')} đ`, unit: ing.unit,
            imageEmoji: ing.emoji, storeId: targetStore.id, storeName: targetStore.name,
            storeAddress: targetStore.address, storeCategory: targetStore.category, count: 1
          });
        });
        return next;
      });
    }

    updateItems(prev => {
      const next = [...prev];
      combo.ingredients.forEach(ing => {
        if (!next.some(it => it.name.toLowerCase() === ing.name.toLowerCase())) {
          next.unshift({
            id: `sm-combo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: ing.name,
            amount: ing.amount,
            category: 'produce',
            categoryLabel: 'Rau củ & Quả tươi',
            mealNote: `Combo món: ${combo.name}`,
            checked: false
          });
        }
      });
      return next;
    });

    setMainView('checklist');
    setCartAddToast(`Đã thêm trọn combo "${combo.name}" (${combo.ingredients.length} nguyên liệu) vào danh sách cần mua!`);
    setTimeout(() => setCartAddToast(''), 4500);
  };

  const handleAddVietgapVeggie = (veg: typeof VIETGAP_5K_VEGGIES[0]) => {
    sfx.playSuccess();
    const targetStore = selectedStore || stores.find(s => s.name.includes('Bách Hóa Xanh') || s.category === 'SUPERMARKET') || stores[0];
    if (targetStore) {
      const cartItemId = `${targetStore.id}___vg_${veg.name.toLowerCase().replace(/\s+/g, '_')}`;
      setMultiCart(prev => {
        const existing = prev.find(i => i.id === cartItemId);
        if (existing) {
          return prev.map(i => i.id === cartItemId ? { ...i, count: i.count + 1 } : i);
        }
        return [...prev, {
          id: cartItemId,
          catalogItemId: `vg_${veg.name}`,
          name: veg.name,
          price: veg.price,
          priceFormatted: '5.000 đ',
          unit: 'gói 500g',
          imageEmoji: veg.emoji,
          storeId: targetStore.id,
          storeName: targetStore.name,
          storeAddress: targetStore.address,
          storeCategory: targetStore.category,
          count: 1
        }];
      });
    }

    updateItems(prev => {
      if (!prev.some(it => it.name.toLowerCase() === veg.name.toLowerCase())) {
        return [{
          id: `sm-vg-${Date.now()}`,
          name: veg.name,
          amount: '1 gói 500g',
          category: 'produce',
          categoryLabel: 'Rau củ & Quả tươi',
          mealNote: 'Rau lá đồng giá 5.000đ',
          checked: false
        }, ...prev];
      }
      return prev;
    });

    setMainView('checklist');
    setCartAddToast(`Đã thêm "${veg.name}" (5.000đ) vào danh sách cần mua!`);
    setTimeout(() => setCartAddToast(''), 3500);
  };
  const [deliveryNote, setDeliveryNote] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<'VEGE15' | 'FREESHIP' | null>('VEGE15');
  const [autoSyncFridge, setAutoSyncFridge] = useState(true);
  const [syncedCount, setSyncedCount] = useState(0);

  function updateItems(updater: (prev: SmartMarketItem[]) => SmartMarketItem[]) {
    setItems(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage error
      }
      return next;
    });
  }

  const location = useLocation();
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Fetch real places whenever coordinates change
  const loadStoresForCoords = useCallback(async (lat: number, lon: number) => {
    setLoadingStores(true);
    try {
      const realStores = await fetchRealPlacesNearby(lat, lon);
      setStores(realStores);
      if (realStores.length > 0) {
        setSelectedStore(realStores[0]);
      }
    } catch (err) {
      console.error('[SMART-MARKET] Failed to load stores:', err);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  // Initialize location: Only load stores if an address exists in session or in user profile
  useEffect(() => {
    const cachedLoc = sessionStorage.getItem(SESSION_GPS_KEY);
    const cachedAddr = sessionStorage.getItem(SESSION_ADDR_KEY);

    if (cachedLoc && cachedAddr) {
      try {
        const coords = JSON.parse(cachedLoc);
        if (coords?.lat && coords?.lon) {
          setUserLoc(coords);
          setUserAddress(cachedAddr);
          setIsAddressConfirmed(true);
          setLocationStatus('granted');
          loadStoresForCoords(coords.lat, coords.lon);
          return;
        }
      } catch {
        // ignore
      }
    }

    // Try checking saved address from user profile
    userService.getProfile()
      .then(res => {
        const profileAddr = res?.address;
        if (profileAddr && profileAddr.trim().length > 3) {
          const addr = profileAddr.trim();
          setUserAddress(addr);
          setIsAddressConfirmed(true);
          setLocationStatus('granted');
          sessionStorage.setItem(SESSION_ADDR_KEY, addr);

          const lower = addr.toLowerCase();
          let lat = 10.7769;
          let lon = 106.7009;
          if (lower.includes('thảo điền') || lower.includes('thủ đức')) {
            lat = 10.8030; lon = 106.7360;
          } else if (lower.includes('phú nhuận')) {
            lat = 10.7952; lon = 106.6855;
          } else if (lower.includes('bình thạnh')) {
            lat = 10.8035; lon = 106.6940;
          }
          setUserLoc({ lat, lon });
          sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify({ lat, lon }));
          loadStoresForCoords(lat, lon);
        }
      })
      .catch(() => {
        // User not logged in or has no address -> Wait for user to update address!
      });
  }, [loadStoresForCoords]);

  // Import from Weekly Meal Plan
  useEffect(() => {
    const state = location.state as { importedItems?: SmartMarketItem[]; planTitle?: string } | null;
    if (state?.importedItems && state.importedItems.length > 0) {
      const incoming = state.importedItems;
      updateItems(prev => {
        const existingNames = new Set(prev.map(i => i.name.toLowerCase().trim()));
        const uniqueIncoming = incoming.filter(i => !existingNames.has(i.name.toLowerCase().trim()));
        return [...uniqueIncoming, ...prev];
      });
      setImportNotice(`Đã tự động bổ sung ${incoming.length} nguyên liệu từ ${state.planTitle || 'thực đơn tuần'} vào danh sách đi chợ!`);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Request explicit GPS location
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLocationMessage('Trình duyệt của bạn không hỗ trợ định vị vị trí tự động.');
      return;
    }

    setLocationStatus('requesting');
    setLocationMessage('Đang lấy vị trí GPS thực tế vệ tinh của bạn...');

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLoc(coords);
        setLocationStatus('granted');
        setIsAddressConfirmed(true);

        // Persist in sessionStorage for this browser session
        sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify(coords));

        // Reverse geocode to exact real street & district address
        const realAddr = await reverseGeocodeAddress(coords.lat, coords.lon);
        setUserAddress(realAddr);
        sessionStorage.setItem(SESSION_ADDR_KEY, realAddr);

        setLocationMessage(`Đã cập nhật vị trí thực tế: ${realAddr}`);
        sfx.playSuccess();
        await loadStoresForCoords(coords.lat, coords.lon);
        setTimeout(() => setLocationMessage(null), 4000);
      },
      () => {
        setLocationStatus('denied');
        setLocationMessage('Bạn đã từ chối quyền GPS. Bạn có thể chọn khu vực mẫu bên dưới.');
        setTimeout(() => setLocationMessage(null), 6000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Switch predefined location area
  const handleSelectPredefinedArea = async (area: string, lat: number, lon: number) => {
    setUserAddress(area);
    const coords = { lat, lon };
    setUserLoc(coords);
    setLocationStatus('granted');
    sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify(coords));
    sessionStorage.setItem(SESSION_ADDR_KEY, area);
    setIsAddressConfirmed(true);
    setLocationMessage(`Đã chuyển khu vực mua sắm sang: ${area}`);
    sfx.playTap();
    await loadStoresForCoords(lat, lon);
    setTimeout(() => setLocationMessage(null), 3000);
  };

    // Manual address submission handler
  const handleManualAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAddressInput.trim()) return;

    const input = manualAddressInput.trim();
    sfx.playTap();
    setLocationStatus('requesting');
    setLocationMessage('Đang định vị địa chỉ của bạn...');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=vn&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          await handleSelectPredefinedArea(input, lat, lon);
          setManualAddressInput('');
          return;
        }
      }
    } catch (err) {
      console.debug('Geocode error fallback:', err);
    }

    // Fallback: match known zones or default District 1
    const lower = input.toLowerCase();
    let lat = 10.7769;
    let lon = 106.7009;
    if (lower.includes('thảo điền') || lower.includes('thủ đức')) {
      lat = 10.8030; lon = 106.7360;
    } else if (lower.includes('phú nhuận')) {
      lat = 10.7952; lon = 106.6855;
    } else if (lower.includes('bình thạnh')) {
      lat = 10.8035; lon = 106.6940;
    } else if (lower.includes('quận 3') || lower.includes('q3')) {
      lat = 10.7828; lon = 106.6890;
    }
    await handleSelectPredefinedArea(input, lat, lon);
    setManualAddressInput('');
  };

const handleToggle = (id: string) => {
    sfx.playTap();
    updateItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleDelete = (id: string) => {
    updateItems(prev => prev.filter(item => item.id !== id));
  };

  const handleMarkAll = (checkAll: boolean) => {
    updateItems(prev => prev.map(item => ({ ...item, checked: checkAll })));
  };

  const handleReset = () => {
    if (window.confirm('Khôi phục danh sách đi chợ về danh mục mẫu chuẩn?')) {
      updateItems(() => INITIAL_SMART_MARKET_ITEMS);
    }
  };

  // AI Ingredient Validation (Blocks Meat & Non-food items)
  const aiValidationWarning = useMemo(() => {
    if (!newName.trim()) return null;
    const lower = newName.toLowerCase().trim();

    for (const nonFood of NON_FOOD_KEYWORDS) {
      if (lower.includes(nonFood)) {
        return {
          type: 'non-food',
          message: `Cảnh báo: "${newName}" không phải là thực phẩm hay nguyên liệu nấu ăn được. Hệ thống từ chối thêm vào danh sách.`
        };
      }
    }

    for (const meat of NON_VEGAN_KEYWORDS) {
      if (lower.includes(meat)) {
        return {
          type: 'non-vegan',
          message: `Cảnh báo AI: "${newName}" có chứa thành phần động vật/mặn, vi phạm chuẩn ăn chay VEGEAI.`
        };
      }
    }

    return null;
  }, [newName]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || aiValidationWarning) return;

    const categoryLabels: Record<string, string> = {
      produce: 'Rau củ & Quả tươi',
      protein: 'Đậu hũ & Hạt giàu đạm',
      grains: 'Tinh bột & Ngũ cốc',
      spices: 'Gia vị bếp chay'
    };

    const newItem: SmartMarketItem = {
      id: 'custom-' + Date.now(),
      name: newName.trim(),
      amount: newAmount.trim() || '1 phần',
      category: newCategory,
      categoryLabel: categoryLabels[newCategory] || 'Khác',
      mealNote: newMealNote.trim() || 'Nguyên liệu tự thêm',
      checked: false
    };

    updateItems(prev => [newItem, ...prev]);
    sfx.playSuccess();
    setNewName('');
    setNewAmount('');
    setNewMealNote('');
    setShowAddForm(false);
  };

  // Calculations for checklist
  const totalCount = items.length;
  const boughtCount = items.filter(i => i.checked).length;
  const selectedPurchaseItems = useMemo(() => items.filter(item => item.checked), [items]);
  const selectedPurchaseTotal = useMemo(() => selectedPurchaseItems.reduce((total, item) => {
    const cartItem = multiCart.find(candidate => candidate.name.trim().toLowerCase() === item.name.trim().toLowerCase());
    return total + (cartItem ? cartItem.price * cartItem.count : 0);
  }, 0), [selectedPurchaseItems, multiCart]);
  const unboughtCount = totalCount - boughtCount;
  const progressPercent = totalCount > 0 ? Math.round((boughtCount / totalCount) * 100) : 0;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter === 'bought' && !item.checked) return false;
      if (statusFilter === 'unbought' && item.checked) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      return true;
    });
  }, [items, statusFilter, categoryFilter]);

  // Filter stores
  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      if (storeTypeFilter !== 'ALL' && store.category !== storeTypeFilter) return false;
      if (storeSearch.trim()) {
        const q = storeSearch.toLowerCase();
        return store.name.toLowerCase().includes(q) || store.address.toLowerCase().includes(q);
      }
      return true;
    });
  }, [stores, storeTypeFilter, storeSearch]);

  // Multi-Store Cart Actions
  const handleUpdateMultiCart = (item: StoreCatalogItem, store: SmartMarketStore, delta: number) => {
    sfx.playTap();
    const cartItemId = `${store.id}___${item.id}`;

    setMultiCart(prev => {
      const existing = prev.find(i => i.id === cartItemId);
      if (existing) {
        const nextCount = existing.count + delta;
        if (nextCount <= 0) {
          return prev.filter(i => i.id !== cartItemId);
        }
        return prev.map(i => i.id === cartItemId ? { ...i, count: nextCount } : i);
      } else if (delta > 0) {
        const newItem: MultiStoreCartItem = {
          id: cartItemId,
          catalogItemId: item.id,
          name: item.name,
          price: item.price,
          priceFormatted: item.priceFormatted,
          unit: item.unit,
          imageEmoji: item.imageEmoji,
          storeId: store.id,
          storeName: store.name,
          storeAddress: store.address,
          storeCategory: store.categoryLabel,
          count: 1
        };
        return [...prev, newItem];
      }
      return prev;
    });
  };

  // Group Multi-Store Cart into separate order packages
  const groupedOrders: StoreOrderGroup[] = useMemo(() => {
    const groups: Record<string, StoreOrderGroup> = {};

    for (const item of multiCart) {
      if (!groups[item.storeId]) {
        // find store for delivery time
        const storeObj = stores.find(s => s.id === item.storeId);
        groups[item.storeId] = {
          storeId: item.storeId,
          storeName: item.storeName,
          storeAddress: item.storeAddress,
          storeCategory: item.storeCategory,
          items: [],
          subtotal: 0,
          shippingFee: 15000, // 15.000 đ per store package
          deliveryTime: storeObj?.duration || '20 - 30 phút'
        };
      }
      groups[item.storeId].items.push(item);
      groups[item.storeId].subtotal += item.price * item.count;
    }

    return Object.values(groups);
  }, [multiCart, stores]);

  // Overall Cart Totals
  const totalCartCount = useMemo(() => multiCart.reduce((acc, i) => acc + i.count, 0), [multiCart]);
  const totalProductsPrice = useMemo(() => groupedOrders.reduce((acc, g) => acc + g.subtotal, 0), [groupedOrders]);
  const totalShippingFee = useMemo(() => groupedOrders.length * 15000, [groupedOrders]);
  const discountAmount = useMemo(() => {
    if (appliedVoucher === 'VEGE15') return Math.min(15000, totalProductsPrice);
    if (appliedVoucher === 'FREESHIP') return Math.min(15000, totalShippingFee);
    return 0;
  }, [appliedVoucher, totalProductsPrice, totalShippingFee]);
  const grandTotal = Math.max(0, totalProductsPrice + totalShippingFee - discountAmount);

  const handleCheckoutConfirm = async () => {
    sfx.playSuccess();
    setCheckoutSuccess(true);

    if (autoSyncFridge && multiCart.length > 0) {
      let count = 0;
      for (const item of multiCart) {
        try {
          const lower = item.name.toLowerCase();
          let shelfLife = 5;
          let category = 'VEGAN';
          if (lower.includes('đậu') || lower.includes('tofu')) {
            shelfLife = 4;
            category = 'PROTEIN';
          } else if (lower.includes('nấm')) {
            shelfLife = 4;
            category = 'FUNGUS';
          } else if (lower.includes('cà') || lower.includes('rau') || lower.includes('cải') || lower.includes('bí')) {
            shelfLife = 6;
            category = 'PRODUCE';
          } else if (lower.includes('gạo') || lower.includes('bún') || lower.includes('mì')) {
            shelfLife = 30;
            category = 'GRAINS';
          }

          await fridgeService.add({
            name: item.name,
            category,
            quantity: item.count,
            unit: item.unit || 'phần',
            freshnessStatus: 'FRESH',
            estimatedShelfLifeDays: shelfLife,
            notes: `Mua từ ${item.storeName} qua Đi chợ thông minh`
          });
          count += 1;
        } catch (e) {
          console.warn('[SMART-MARKET] Auto-sync to fridge item error:', item.name, e);
        }
      }
      setSyncedCount(count);
    }

    setTimeout(() => {
      setShowCheckoutModal(false);
      setCheckoutSuccess(false);
      setMultiCart([]);
    }, 4500);
  };

  return (
    <MainLayout>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Toast notification for adding combos and items */}
        {cartAddToast && (
          <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-800 text-white shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-4 border border-emerald-500/40">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300" />
            <span>{cartAddToast}</span>
          </div>
        )}

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
              <Link to="/dashboard" className="hover:underline">Trang chủ</Link>
              <span>/</span>
              <span>Đi chợ & Mua sắm thông minh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Khám phá nguyên liệu chay</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold">
                Không thanh toán trực tuyến
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Tham khảo nguyên liệu và cửa hàng chay, rồi lưu món cần mua vào danh sách cá nhân. VEGEAI không nhận đặt hàng, giao hàng hoặc thanh toán.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs self-start lg:self-auto">
            <button
              onClick={() => { sfx.playTap(); setMainView('map'); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                mainView === 'map'
                  ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store className="w-4 h-4 text-emerald-600" />
              <span>Quán Chay & Siêu Thị Gần Bạn</span>
            </button>

            <button
              onClick={() => { sfx.playTap(); setMainView('checklist'); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                mainView === 'checklist'
                  ? 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Danh Sách Cần Mua ({boughtCount}/{totalCount})</span>
            </button>
          </div>
        </div>

        {/* Real GPS Location Bar (Session-Persistent) */}
        <div id="location-bar" className="bg-emerald-50/80 dark:bg-slate-900/90 rounded-2xl border border-emerald-200/70 dark:border-slate-800 p-4 mb-6 shadow-2xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isAddressConfirmed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white animate-pulse'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {isAddressConfirmed ? 'Vị trí hiện tại:' : 'Chưa chọn vị trí:'}
                  </span>
                  {isAddressConfirmed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Đã cập nhật
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                      Cần cập nhật để tiếp tục
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white truncate max-w-xl mt-0.5">
                  {isAddressConfirmed ? userAddress : 'Chọn vị trí để tìm quán chay và cửa hàng nguyên liệu gần bạn'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={locationStatus === 'requesting'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{locationStatus === 'requesting' ? 'Đang định vị GPS...' : '📍 Định vị GPS tự động'}</span>
              </button>

              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 hidden sm:inline">Khu vực nhanh:</span>
                {PREDEFINED_AREAS.map(loc => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleSelectPredefinedArea(loc.addr, loc.lat, loc.lon)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition cursor-pointer"
                  >
                    {loc.name}
                  </button>
                ))}
              </div>

              {isAddressConfirmed && (
                <button
                  type="button"
                  onClick={() => setIsAddressConfirmed(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Thay đổi vị trí hiện tại"
                >
                  Đổi địa chỉ
                </button>
              )}
            </div>
          </div>

          {locationMessage && (
            <div className="mt-3 pt-2.5 border-t border-emerald-200/50 dark:border-slate-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{locationMessage}</span>
            </div>
          )}
        </div>

        {/* VIEW 1: MAP & SHOPEE-FOOD/MART STORE ORDERING */}
        {mainView === 'map' && (
          <div className="space-y-6">

            {/* BÁCH HÓA XANH PROMOTIONAL BANNER: RAU LÁ QUỐC DÂN 5.000Đ */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 shadow-md border border-emerald-600/40 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider shadow-2xs">
                      🔥 Đồng giá 5.000đ/gói · Rau Lá Quốc Dân
                    </span>
                    <span className="text-xs text-emerald-200 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Chuẩn VietGAP tươi sớm nay
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Bách Hóa Xanh Chay — Rau Củ Tươi Mỗi Ngày
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                    Đồng giá 5.000đ/gói 500g rau lá quốc dân VietGAP. Giảm thêm 20% khi mua trọn combo nấu ăn theo món!
                  </p>
                </div>
              </div>

              {/* 5k Veggies 5-column balanced grid */}
              <div className="pt-3 border-t border-white/15">
                <div className="text-[11px] font-bold text-emerald-200 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🥬</span>
                  <span>Chọn nhanh rau lá đồng giá 5.000đ/500g (Bấm + để thêm vào giỏ):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {VIETGAP_5K_VEGGIES.map(veg => (
                    <button
                      key={veg.name}
                      type="button"
                      onClick={() => handleAddVietgapVeggie(veg)}
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-emerald-950 border border-white/15 hover:border-white transition shadow-2xs cursor-pointer text-left"
                      title={`Bấm để thêm ${veg.name} (5.000đ) vào giỏ`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{veg.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold truncate">{veg.name.replace(/\s*\(500g\)/i, '')}</div>
                          <div className="text-[10px] flex items-center gap-1 font-extrabold text-amber-300 group-hover:text-emerald-700">
                            <span>5.000đ</span>
                            <span className="line-through opacity-70 text-[9px] font-normal text-slate-300 group-hover:text-slate-400">{veg.originalPrice}</span>
                          </div>
                        </div>
                      </div>
                      <span className="w-5 h-5 rounded-full bg-emerald-500 group-hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 ml-1">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BÁCH HÓA XANH: HÔM NAY ĂN GÌ? - MUA NGUYÊN LIỆU THEO MÓN */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 uppercase">
                      Bách Hóa Xanh Online
                    </span>
                    <span className="text-xs text-slate-400">· Chuẩn bị bữa ăn gia đình tiện lợi</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-emerald-600" />
                    Hôm Nay Ăn Gì? — Mua Trọn Combo Nguyên Liệu Theo Món
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    1-Click thêm đầy đủ nguyên liệu tươi ngon đã sơ chế sẵn vào giỏ đi chợ và danh sách cần mua.
                  </p>
                </div>
              </div>

              {/* 4 Combo Cards Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MEAL_COMBOS.map(combo => (
                  <div
                    key={combo.id}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 bg-slate-50/50 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-3xl p-2 rounded-xl bg-white dark:bg-slate-700 shadow-2xs">{combo.emoji}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          {combo.savingFormatted}
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                        {combo.name}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {combo.tagline}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">
                            🌿 {combo.ingredients.length} nguyên liệu tươi
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {combo.prepTime} · {combo.calories}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80">
                          <div className="flex items-center -space-x-1 shrink-0">
                            {combo.ingredients.map(ing => (
                              <span
                                key={ing.name}
                                title={`${ing.name} (${ing.amount})`}
                                className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[10px] shadow-2xs"
                              >
                                {ing.emoji}
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {combo.ingredients.map(i => i.name).slice(0, 2).join(', ')}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                          {combo.priceFormatted}
                        </div>
                        <div className="text-[10px] text-slate-400 line-through">
                          {combo.originalPriceFormatted}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddComboToCart(combo)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title={`Mua combo ${combo.name}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Mua combo</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* SECTION 2: BẢN ĐỒ & QUÁN CHAY GẦN BẠN */}
            <div id="map-section" className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Bản Đồ Quán Chay &amp; Điểm Bán Thực Phẩm Lân Cận
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAddressConfirmed
                      ? 'Chọn địa điểm trên bản đồ tương tác để xem chi tiết kệ hàng và đặt giao hỏa tốc.'
                      : 'Vui lòng cập nhật địa chỉ để quét các quán chay & siêu thị thực tế gần bạn nhất.'}
                  </p>
                </div>
                {isAddressConfirmed && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      🗺️ OpenStreetMap &amp; GPS Thực Tế
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddressConfirmed(false)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Đổi vị trí
                    </button>
                  </div>
                )}
              </div>
            </div>

            {true ? (
              <>
<div className="grid lg:grid-cols-12 gap-6 items-start">

              {/* Left Column: Stores List (ShopeeFood Style Cards) */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs h-[680px] flex flex-col">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-600" />
                      Quán Chay & Siêu Thị Gần Bạn
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      {loadingStores ? 'Đang cập nhật...' : `${filteredStores.length} địa điểm thực tế`}
                    </span>
                  </div>

                  {/* Search box */}
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm quán chay, Bách Hóa Xanh, WinMart, An Duyên Chay..."
                      value={storeSearch}
                      onChange={e => setStoreSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Category Filter Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                    {[
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'VEGAN_STORE', label: '🌱 Quán Chay' },
                      { id: 'SUPERMARKET', label: '🛒 Siêu Thị' },
                      { id: 'CONVENIENCE', label: '🏪 Tiện Lợi' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { sfx.playTap(); setStoreTypeFilter(tab.id); }}
                        className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer text-[10px] sm:text-[11px] truncate ${
                          storeTypeFilter === tab.id
                            ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stores Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {filteredStores.map(store => {
                    const isSelected = selectedStore?.id === store.id;
                    const isPromoted = store.category === 'VEGAN_STORE' || store.rating >= 4.8;

                    return (
                      <div
                        key={store.id}
                        onClick={() => { sfx.playTap(); setSelectedStore(store); }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer text-left relative overflow-hidden ${
                          isSelected
                            ? 'bg-emerald-50/90 dark:bg-slate-800 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-900 shadow-xs'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        {/* Promoted Ribbon */}
                        {isPromoted && (
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-bl-lg shadow-2xs flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" /> Quán Yêu Thích
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 pr-16">
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              {store.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {store.categoryLabel}
                              </span>
                              <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {store.rating} ({store.reviewsCount})
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{store.address}</span>
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            Cách {store.distanceKm} km · 🛵 {store.duration}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {store.hours}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Interactive Map */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs h-[680px] flex flex-col">
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Bản Đồ Vị Trí Cửa Hàng Thực Tế (Source of Truth)
                    </span>
                  </div>
                  {selectedStore && (
                    <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 truncate max-w-xs">
                      {selectedStore.name} ({selectedStore.distanceKm} km)
                    </span>
                  )}
                </div>

                <div className="flex-1 w-full relative">
                  <SmartMarketMap
                    stores={filteredStores}
                    selectedStore={selectedStore}
                    userLocation={userLoc}
                    onSelect={(s) => setSelectedStore(s)}
                  />
                </div>
              </div>

            </div>

            {/* SHOPEE FOOD / SHOPEE MART ORDERING SECTION (SELECTED STORE MENU) */}
            {selectedStore && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">

                {/* Store Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                        {selectedStore.categoryLabel}
                      </span>
                      <span className="text-xs text-slate-400">· Cách {selectedStore.distanceKm} km</span>
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {selectedStore.rating} ({selectedStore.reviewsCount} đánh giá khách hàng)
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedStore.name}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{selectedStore.address}</span>
                      {selectedStore.phone && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedStore.phone}</span>
                        </>
                      )}
                    </p>

                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {selectedStore.tagline}
                    </p>
                  </div>

                  {/* Promo Voucher Banner & Delivery SLA */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-2xs">
                      <Truck className="w-3.5 h-3.5" /> Giao nhanh {selectedStore.duration}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                      <BadgePercent className="w-3 h-3" /> Mã VEGE15: Giảm 15.000đ
                    </span>
                  </div>
                </div>

                {/* Catalog items grid (ShopeeFood / Mart style) */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      Kệ Hàng & Thực Đơn Đặt Mua Trực Tuyến
                    </h3>
                    <span className="text-xs text-slate-500">
                      {filteredStoreCatalog.length} món thuần chay sẵn sàng giao
                    </span>
                  </div>

                  {/* Bách Hóa Xanh Subcategory Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    {[
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'VEG', label: '🥬 Rau lá & Củ quả VietGAP' },
                      { id: 'MUSHROOM', label: '🍄 Nấm tươi & Nấm khô' },
                      { id: 'PROTEIN', label: '🌱 Đậu hũ & Đạm thực vật' },
                      { id: 'GRAINS', label: '🍚 Gạo & Đồ khô' },
                      { id: 'SPICE', label: '🧂 Gia vị chay' }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => { sfx.playTap(); setCatalogSubcategory(sub.id); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                          catalogSubcategory === sub.id
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {(!selectedStore.catalog || selectedStore.catalog.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500">
                      Cửa hàng đang đồng bộ kệ hàng trực tuyến. Vui lòng liên hệ hotline: {selectedStore.phone || '1900 1908'}.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredStoreCatalog.map(catItem => {
                        const cartItemId = `${selectedStore.id}___${catItem.id}`;
                        const foundInCart = multiCart.find(i => i.id === cartItemId);
                        const qty = foundInCart?.count || 0;

                        return (
                          <div
                            key={catItem.id}
                            className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-850 flex items-center justify-between gap-3 transition shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-3xl shrink-0 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                                {catItem.imageEmoji}
                              </span>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {catItem.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                                    {catItem.priceFormatted}
                                  </span>
                                  <span className="text-[11px] text-slate-400">/ {catItem.unit}</span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {qty > 0 ? (
                                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 p-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMultiCart(catItem, selectedStore, -1)}
                                    className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold flex items-center justify-center hover:bg-slate-100 shadow-2xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 w-4 text-center">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMultiCart(catItem, selectedStore, 1)}
                                    className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-700 shadow-2xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMultiCart(catItem, selectedStore, 1)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Thêm
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

              </>
            ) : (
              <div id="location-section" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs space-y-6 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                  <MapPin className="w-8 h-8 text-emerald-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Vui lòng cập nhật địa chỉ để tiếp tục
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    VEGEAI sẽ tự động quét các quán chay, siêu thị nông sản và cửa hàng thực phẩm thực tế gần bạn nhất dựa trên vị trí chính xác.
                  </p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={locationStatus === 'requesting'}
                    className="w-full py-3.5 px-5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{locationStatus === 'requesting' ? 'Đang định vị GPS vệ tinh...' : '📍 Định vị GPS vị trí hiện tại của tôi'}</span>
                  </button>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    <span>hoặc chọn khu vực nhanh</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PREDEFINED_AREAS.map(loc => (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => handleSelectPredefinedArea(loc.addr, loc.lat, loc.lon)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-300 font-bold text-xs text-slate-700 dark:text-slate-200 transition cursor-pointer"
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>

                  {/* Manual street address input */}
                  <form onSubmit={handleManualAddressSubmit} className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Nhập địa chỉ giao hàng của bạn..."
                      value={manualAddressInput}
                      onChange={e => setManualAddressInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={!manualAddressInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 disabled:opacity-40 transition cursor-pointer shrink-0"
                    >
                      Xác nhận
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* STICKY BOTTOM FLOATING CART BAR (MULTI-STORE SHOPPING CART) */}
            {boughtCount > 0 && (
              <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-8 sm:w-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl border border-emerald-500/40 p-3.5 sm:px-6 sm:py-4 shadow-2xl flex items-center justify-between gap-6 ring-2 ring-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-[11px] font-extrabold flex items-center justify-center text-white">
                        {boughtCount}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-300">
                        Giỏ nguyên liệu đã chọn
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-400">
                        {boughtCount} món đã tick
                        {selectedPurchaseTotal > 0 && <span className="text-[11px] font-normal text-slate-400 ml-1.5">· khoảng {selectedPurchaseTotal.toLocaleString('vi-VN')} đ</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { sfx.playTap(); setShowCheckoutModal(true); }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs sm:text-sm transition shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <span>Xem giỏ đã chọn</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Selected shopping-list summary. This is intentionally not a checkout flow. */}
        {showCheckoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onMouseDown={() => setShowCheckoutModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onMouseDown={event => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-600" /> Giỏ nguyên liệu đã chọn
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Chỉ hiển thị những món bạn đã tick trong Danh Sách Cần Mua.</p>
                </div>
                <button type="button" onClick={() => setShowCheckoutModal(false)} aria-label="Đóng giỏ nguyên liệu" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedPurchaseItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">Chưa có nguyên liệu nào được tick.</div>
              ) : (
                <div className="space-y-2">
                  {selectedPurchaseItems.map(item => {
                    const cartItem = multiCart.find(candidate => candidate.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 bg-slate-50 dark:bg-slate-800/70">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.amount}{item.categoryLabel ? ` · ${item.categoryLabel}` : ''}</div>
                          {cartItem && <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate">Tham khảo tại {cartItem.storeName}</div>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {cartItem && <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{(cartItem.price * cartItem.count).toLocaleString('vi-VN')} đ</span>}
                          <button type="button" onClick={() => handleToggle(item.id)} title="Bỏ chọn món này" className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4">
                <div className="flex justify-between font-extrabold text-slate-900 dark:text-white">
                  <span>{selectedPurchaseItems.length} món đã chọn</span>
                  {selectedPurchaseTotal > 0 && <span className="text-emerald-700 dark:text-emerald-400">Dự kiến {selectedPurchaseTotal.toLocaleString('vi-VN')} đ</span>}
                </div>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300 mt-1">VEGEAI chỉ hỗ trợ lập danh sách và tham khảo giá; không đặt hàng, giao hàng hoặc thanh toán.</p>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setShowCheckoutModal(false)} className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold cursor-pointer">Đóng</button>
              </div>
            </div>
          </div>
        )}

        {/* CHECKOUT MODAL: MULTI-STORE SPLIT ORDERS WITH SINGLE UNIFIED PAYMENT */}
        {false && showCheckoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">

              {checkoutSuccess ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Đặt Hàng Đa Cửa Hàng Thành Công!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Hệ thống VEGEAI đã tự động tách thành <strong className="text-emerald-700 dark:text-emerald-400">{groupedOrders.length} kiện hàng riêng biệt</strong> gửi tới từng quán chay và siêu thị. Shipper sẽ liên hệ theo lộ trình từng đơn hàng!
                  </p>

                  {autoSyncFridge && syncedCount > 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold shadow-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>Đã tự động nạp {syncedCount} nguyên liệu tươi vào Kho Tủ Lạnh (Smart Fridge) của bạn!</span>
                    </div>
                  )}

                  {/* Individual packages confirmation list */}
                  <div className="space-y-2 text-left pt-2">
                    {groupedOrders.map((group, idx) => (
                      <div key={group.storeId} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                          <span className="flex items-center gap-1.5">
                            <PackageCheck className="w-4 h-4 text-emerald-600" />
                            Kiện #{idx + 1}: {group.storeName}
                          </span>
                          <span className="text-emerald-600">🛵 {group.deliveryTime}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          Lấy hàng từ: {group.storeAddress}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Xác Nhận Đặt Hàng Đa Cửa Hàng</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {groupedOrders.length} quán/tiệm
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thanh toán 1 lần duy nhất · Tự động chia đơn & điều phối tài xế lấy hàng riêng biệt
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Delivery Address Input */}
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1.5">
                      <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Địa chỉ giao hàng thực tế của bạn:
                      </div>
                      <input
                        type="text"
                        value={userAddress}
                        onChange={e => setUserAddress(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Split Packages List (ShopeeFood Multi-Store Style) */}
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {groupedOrders.map((group, idx) => (
                        <div key={group.storeId} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700">
                            <div>
                              <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-emerald-600" />
                                Kiện #{idx + 1}: {group.storeName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-sm">
                                {group.storeAddress}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                              🛵 {group.deliveryTime}
                            </span>
                          </div>

                          {/* Items in this package */}
                          <div className="space-y-1 text-slate-600 dark:text-slate-300">
                            {group.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between">
                                <span className="truncate pr-2">
                                  {item.imageEmoji} {item.name} <strong className="text-emerald-700 dark:text-emerald-400">x{item.count}</strong>
                                </span>
                                <span className="font-bold shrink-0">
                                  {(item.price * item.count).toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-700/60 text-[11px] text-slate-500">
                            <span>Phí giao kiện riêng này:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">15.000 đ</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Note */}
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ghi chú cho shipper / quán (Ví dụ: Ít cay, giao lên tầng 2...):
                      </div>
                      <input
                        type="text"
                        placeholder="Nhập ghi chú giao hàng..."
                        value={deliveryNote}
                        onChange={e => setDeliveryNote(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                      />
                    </div>

                    {/* Voucher Selection */}
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-rose-500" />
                          Mã ưu đãi VEGEAI áp dụng:
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAppliedVoucher(v => v === 'VEGE15' ? null : 'VEGE15')}
                          className={`p-2 rounded-xl text-left border text-[11px] font-bold transition cursor-pointer ${
                            appliedVoucher === 'VEGE15'
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          🎟️ VEGE15 (Giảm 15k tiền hàng)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppliedVoucher(v => v === 'FREESHIP' ? null : 'FREESHIP')}
                          className={`p-2 rounded-xl text-left border text-[11px] font-bold transition cursor-pointer ${
                            appliedVoucher === 'FREESHIP'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600'
                          }`}
                        >
                          🚚 FREESHIP (Giảm 15k phí giao)
                        </button>
                      </div>
                    </div>

                    {/* Auto-sync to Smart Fridge Toggle */}
                    <label className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 cursor-pointer transition hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30">
                      <input
                        type="checkbox"
                        checked={autoSyncFridge}
                        onChange={(e) => setAutoSyncFridge(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
                      />
                      <div className="text-left text-xs">
                        <div className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <span>Tự động đồng bộ vào Kho Tủ Lạnh (Smart Fridge)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold">Auto-Sync</span>
                        </div>
                        <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                          Nguyên liệu mua sẽ lập tức được lưu vào tủ lạnh để gợi ý món ăn và theo dõi độ tươi ngon tự động.
                        </div>
                      </div>
                    </label>

                    {/* Consolidated Totals */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Tiền hàng ({totalCartCount} món):</span>
                        <span>{totalProductsPrice.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Phí giao ({groupedOrders.length} kiện hàng riêng):</span>
                        <span>{totalShippingFee.toLocaleString('vi-VN')} đ</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>Giảm giá ({appliedVoucher}):</span>
                          <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-1">
                        <span>Tổng chi phí dự kiến:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {grandTotal.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckoutConfirm}
                      className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                    >
                      Xác nhận danh sách mua
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* VIEW 2: CHECKLIST VIEW */}
        {mainView === 'checklist' && (
          <div className="space-y-6">
            {importNotice && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{importNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportNotice(null)}
                  className="text-xs underline text-emerald-700 dark:text-emerald-300 font-bold ml-3 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* Progress Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    Tiến độ mua sắm trong giỏ
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                    {boughtCount}/{totalCount} nguyên liệu đã hoàn tất ({progressPercent}%)
                  </h3>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setShowAddForm(v => !v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm nguyên liệu
                  </button>
                  <button
                    onClick={() => handleMarkAll(boughtCount !== totalCount)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    {boughtCount === totalCount ? "Bỏ chọn hết" : "Chọn hết"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer"
                    title="Khôi phục danh sách mẫu"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'all', label: `Tất cả (${totalCount})` },
                    { id: 'unbought', label: `Chưa mua (${unboughtCount})` },
                    { id: 'bought', label: `Đã mua (${boughtCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Tất cả quầy' },
                    { id: 'produce', label: '🥬 Rau củ tươi' },
                    { id: 'protein', label: '🥜 Đậu hũ & Đạm' },
                    { id: 'grains', label: '🍚 Tinh bột' },
                    { id: 'spices', label: '🧂 Gia vị chay' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Add Form Modal */}
            {showAddForm && (
              <form onSubmit={handleAddItem} className="bg-emerald-50/70 dark:bg-slate-900 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-300">
                    Thêm nguyên liệu mới vào danh sách đi chợ
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                {/* AI Validation Warning Banner */}
                {aiValidationWarning && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{aiValidationWarning.message}</span>
                  </div>
                )}

                {/* AI Suggested Tags */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Gợi ý nguyên liệu chay phổ biến:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_VEGAN_TAGS.map(tag => (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => {
                          setNewName(tag.name);
                          setNewCategory(tag.category as any);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Tên nguyên liệu (Ví dụ: Cải ngọt, Nấm đùi gà...)"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white ${
                        aiValidationWarning ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Định lượng (Ví dụ: 300g, 1 bó)"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white"
                    >
                      <option value="produce">Rau củ tươi</option>
                      <option value="protein">Đậu & Đạm thực vật</option>
                      <option value="grains">Tinh bột, Gạo, Mì</option>
                      <option value="spices">Gia vị bếp chay</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={!!aiValidationWarning || !newName.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Thêm vào giỏ
                  </button>
                </div>
              </form>
            )}

            {/* Checklist Items Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredItems.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3 p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Danh sách cần mua đang trống</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Bạn có thể tự thêm nguyên liệu cần sắm hoặc đồng bộ tự động từ các công thức trong thực đơn tuần!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm nguyên liệu cần mua
                  </button>
                </div>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                      item.checked
                        ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0 text-emerald-600">
                        {item.checked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-sm font-bold truncate ${
                          item.checked ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'
                        }`}>
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{item.amount}</span>
                          <span>•</span>
                          <span className="truncate">{item.mealNote || item.categoryLabel}</span>
                        </div>
                        {!item.checked && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]" onClick={e => e.stopPropagation()}>
                            <span className="text-slate-400 font-medium">Mua nhanh:</span>
                            <a
                              href={`https://www.bachhoaxanh.com/tim-kiem?key=${encodeURIComponent(item.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 transition"
                            >
                              BHX <ExternalLink size={9} />
                            </a>
                            <a
                              href={`https://cooponline.vn/search?q=${encodeURIComponent(item.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-0.5 transition"
                            >
                              Co.op <ExternalLink size={9} />
                            </a>
                            <a
                              href={`https://winmart.vn/search?keyword=${encodeURIComponent(item.name)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-0.5 transition"
                            >
                              WinMart <ExternalLink size={9} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-1 text-slate-300 hover:text-rose-600 transition shrink-0 cursor-pointer"
                      title="Xóa món"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
    </MainLayout>
  );
}
