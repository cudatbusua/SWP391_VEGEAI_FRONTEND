import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
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
  Check,
  X,
  Store,
  Clock,
  Phone,
  Star,
  FileDown,
  ChefHat,
  Refrigerator,
  Compass,
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { SmartMarketMap } from '../components/SmartMarketMap';
import { sfx } from '../utils/soundEffects';
import { escapeHtml, printHtml } from '../utils/printDocument';
import { fridgeService } from '../services/fridgeService';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import type { FridgeItem } from '../types/api';
import {
  INITIAL_SMART_MARKET_ITEMS,
  type SmartMarketItem,
  type SmartMarketStore,
} from '../data/smartMarketData';
import {
  fetchRealPlacesNearby,
  reverseGeocodeAddress,
  buildAnchoredStoresForCoordinates,
} from '../services/smartMarketRealPlacesService';

const LOCAL_STORAGE_KEY = 'vegeai:smart-market:items-v1';
const SESSION_ITEMS_KEY = 'vegeai:smart-market:session-items-v1';
const SESSION_RECIPE_META_KEY = 'vegeai:smart-market:recipe-meta-v1';
const SESSION_GPS_KEY = 'vegeai:session:gps_coords';
const SESSION_ADDR_KEY = 'vegeai:session:gps_address';

interface ActiveRecipeMeta {
  title: string;
  cookingTimeMinutes?: number;
  caloriesEstimate?: number;
  difficulty?: string;
  source?: string;
}

const NON_VEGAN_KEYWORDS = [
  'thịt', 'thit', 'heo', 'lợn', 'bò', 'bo', 'gà', 'ga', 'vịt', 'vit', 'chim', 'cừu', 'dê',
  'cá', 'ca', 'tôm', 'tom', 'cua', 'mực', 'muc', 'ốc', 'oc', 'hàu', 'sò', 'chả cá',
  'mỡ', 'da heo', 'da bò', 'tiết', 'huyết', 'pate gan', 'lạp xưởng', 'xúc xích heo',
  'mắm tôm', 'mắm tép', 'mắm cá', 'mắm nêm', 'nước mắm cá',
];

const SUGGESTED_VEGAN_TAGS = [
  'Đậu hũ non',
  'Nấm đùi gà',
  'Nấm hương tươi',
  'Sữa hạt hạnh nhân',
  'Đậu gà hữu cơ',
  'Rau cải bó xôi',
  'Bơ sáp tươi',
  'Tương Tamari',
  'Hạt chia',
  'Gạo lứt huyết rồng',
];

function checkVeganSafety(text: string): { valid: boolean; reason?: string } {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return { valid: true };
  for (const kw of NON_VEGAN_KEYWORDS) {
    const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i');
    if (regex.test(normalized) || normalized === kw) {
      return {
        valid: false,
        reason: `"${text}" là nguyên liệu mặn (chứa "${kw}"). VEGEAI chỉ hỗ trợ định vị nguyên liệu Thực vật / Thuần chay!`,
      };
    }
  }
  return { valid: true };
}

function inferCategory(name: string): { category: SmartMarketItem['category']; categoryLabel: string } {
  const lower = name.toLowerCase();
  if (lower.includes('đậu') || lower.includes('nấm') || lower.includes('hạt') || lower.includes('sữa')) {
    return { category: 'protein', categoryLabel: 'Đạm thực vật & Đậu hạt' };
  }
  if (lower.includes('gạo') || lower.includes('bún') || lower.includes('mì') || lower.includes('yến mạch')) {
    return { category: 'grains', categoryLabel: 'Ngũ cốc & Tinh bột' };
  }
  if (
    lower.includes('rau') ||
    lower.includes('cải') ||
    lower.includes('củ') ||
    lower.includes('quả') ||
    lower.includes('cà') ||
    lower.includes('bơ') ||
    lower.includes('hành') ||
    lower.includes('tỏi') ||
    lower.includes('ớt') ||
    lower.includes('gừng') ||
    lower.includes('sả') ||
    lower.includes('ngò')
  ) {
    return { category: 'produce', categoryLabel: 'Rau củ & Quả tươi' };
  }
  return { category: 'spices', categoryLabel: 'Gia vị & Đồ khô chay' };
}

export const SmartMarketPage: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const incomingState = location.state as {
    recipeTitle?: string;
    planTitle?: string;
    ingredients?: string[];
    importedItems?: SmartMarketItem[];
    cookingTimeMinutes?: number;
    caloriesEstimate?: number;
    difficulty?: string;
    source?: string;
  } | null;

  const [activeRecipe, setActiveRecipe] = useState<ActiveRecipeMeta | null>(() => {
    const title = incomingState?.recipeTitle || incomingState?.planTitle;
    if (title) {
      return {
        title,
        cookingTimeMinutes: incomingState?.cookingTimeMinutes,
        caloriesEstimate: incomingState?.caloriesEstimate,
        difficulty: incomingState?.difficulty,
        source: incomingState?.source,
      };
    }
    try {
      const savedMeta = sessionStorage.getItem(SESSION_RECIPE_META_KEY);
      if (savedMeta) return JSON.parse(savedMeta);
    } catch {
      // ignore
    }
    return null;
  });

  const [items, setItems] = useState<SmartMarketItem[]>(() => {
    try {
      const sessionSaved = sessionStorage.getItem(SESSION_ITEMS_KEY);
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SMART_MARKET_ITEMS;
  });

  // Sync with Smart Fridge & User Allergies
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [userAllergies, setUserAllergies] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fridgeService.list().then(setFridgeItems).catch(() => {});
    userService
      .getProfile()
      .then((profile) => {
        if (profile?.allergies) {
          const list = Array.isArray(profile.allergies)
            ? profile.allergies
            : String(profile.allergies)
                .split(/[,;\n]+/)
                .map((s) => s.trim())
                .filter(Boolean);
          setUserAllergies(list);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const checkInFridge = useCallback(
    (itemName: string): FridgeItem | undefined => {
      const cleanName = itemName.split(':')[0].toLowerCase().trim();
      return fridgeItems.find((f) => {
        const fName = f.name.toLowerCase().trim();
        return fName.includes(cleanName) || cleanName.includes(fName);
      });
    },
    [fridgeItems]
  );

  const checkAllergyConflict = useCallback(
    (text: string): string | undefined => {
      const lower = text.toLowerCase();
      return userAllergies.find((allergy) => lower.includes(allergy.toLowerCase().trim()));
    },
    [userAllergies]
  );

  // When navigating from Recipe / Video / Fridge Scan / Meal Plan / AI Chat with ingredients
  useEffect(() => {
    if (incomingState?.importedItems && incomingState.importedItems.length > 0) {
      setItems(incomingState.importedItems);
      const title = incomingState.planTitle || incomingState.recipeTitle || 'Nguyên liệu cần tìm nơi bán';
      const newMeta: ActiveRecipeMeta = { title };
      setActiveRecipe(newMeta);
      try {
        sessionStorage.setItem(SESSION_RECIPE_META_KEY, JSON.stringify(newMeta));
        sessionStorage.setItem(SESSION_ITEMS_KEY, JSON.stringify(incomingState.importedItems));
      } catch {
        // ignore
      }
      return;
    }

    if (incomingState?.ingredients && incomingState.ingredients.length > 0) {
      const title = incomingState.recipeTitle || incomingState.planTitle || 'Nguyên liệu cần tìm nơi bán';
      const mappedItems: SmartMarketItem[] = incomingState.ingredients.map((raw, idx) => {
        const parts = raw.split(':');
        const name = parts[0]?.trim() || raw.trim();
        const amount = parts.slice(1).join(':').trim() || '1 phần (theo công thức)';
        const catInfo = inferCategory(name);
        return {
          id: `incoming-${Date.now()}-${idx}`,
          name,
          amount,
          category: catInfo.category,
          categoryLabel: catInfo.categoryLabel,
          mealNote: title,
          checked: false,
        };
      });
      setItems(mappedItems);
      const newMeta: ActiveRecipeMeta = {
        title,
        cookingTimeMinutes: incomingState.cookingTimeMinutes,
        caloriesEstimate: incomingState.caloriesEstimate,
        difficulty: incomingState.difficulty,
        source: incomingState.source,
      };
      setActiveRecipe(newMeta);
      try {
        sessionStorage.setItem(SESSION_RECIPE_META_KEY, JSON.stringify(newMeta));
        sessionStorage.setItem(SESSION_ITEMS_KEY, JSON.stringify(mappedItems));
      } catch {
        // ignore
      }
    }
  }, [incomingState]);

  // Automatically mark items that are already in the user's Smart Fridge as checked ("Đã có trong tủ lạnh")
  useEffect(() => {
    if (fridgeItems.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        const matched = checkInFridge(item.name);
        if (matched && !item.checked) {
          return { ...item, checked: true };
        }
        return item;
      })
    );
  }, [fridgeItems, checkInFridge]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      sessionStorage.setItem(SESSION_ITEMS_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // Ingredient input states
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Location & Store Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'VEGAN_STORE' | 'SUPERMARKET'>('ALL');
  const [locationAddress, setLocationAddress] = useState(() => {
    return sessionStorage.getItem(SESSION_ADDR_KEY) || '';
  });
  const [isLocating, setIsLocating] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [showManualLocationInput, setShowManualLocationInput] = useState(false);
  const [manualAddressDraft, setManualAddressDraft] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_GPS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });
  const [realStores, setRealStores] = useState<SmartMarketStore[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [usingRealData, setUsingRealData] = useState(false);

  const toggleItem = (id: string) => {
    sfx.playTap();
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const safety = checkVeganSafety(trimmed);
    if (!safety.valid) {
      sfx.playNotification();
      setInputError(safety.reason || 'Nguyên liệu không hợp lệ.');
      return;
    }

    setInputError(null);
    sfx.playSuccess();
    const catInfo = inferCategory(trimmed);
    const newItem: SmartMarketItem = {
      id: `item-${Date.now()}`,
      name: trimmed,
      amount: newAmount.trim() || '1 phần',
      category: catInfo.category,
      categoryLabel: catInfo.categoryLabel,
      mealNote: activeRecipe?.title || 'Bổ sung thủ công',
      checked: false,
    };
    setItems((prev) => [newItem, ...prev]);
    setNewName('');
    setNewAmount('');
  };

  const addQuickSuggestedIngredient = (tagName: string) => {
    sfx.playTap();
    setSearchQuery(tagName);
    setSearchError(null);
    const exists = items.some((i) => i.name.toLowerCase().includes(tagName.toLowerCase()));
    if (!exists) {
      const catInfo = inferCategory(tagName);
      const newItem: SmartMarketItem = {
        id: `tag-${Date.now()}`,
        name: tagName,
        amount: '1 phần',
        category: catInfo.category,
        categoryLabel: catInfo.categoryLabel,
        mealNote: 'Tìm nhanh trên bản đồ',
        checked: false,
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const safety = checkVeganSafety(value);
    if (!safety.valid) {
      setSearchError(safety.reason || 'Từ khóa không phù hợp với ẩm thực chay.');
    } else {
      setSearchError(null);
    }
  };

  const removeItem = (id: string) => {
    sfx.playTap();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearChecked = () => {
    sfx.playTap();
    setItems((prev) => prev.filter((item) => !item.checked));
  };

  const resetDefault = () => {
    sfx.playTap();
    setItems(INITIAL_SMART_MARKET_ITEMS);
    setActiveRecipe(null);
    setInputError(null);
    try {
      sessionStorage.removeItem(SESSION_RECIPE_META_KEY);
      sessionStorage.removeItem(SESSION_ITEMS_KEY);
    } catch {
      // ignore
    }
  };

  // Load nearby stores whenever userCoords changes
  const loadNearbyPlaces = useCallback(async (lat: number, lon: number) => {
    setIsLoadingStores(true);
    const anchored = buildAnchoredStoresForCoordinates(lat, lon);
    setRealStores(anchored);
    setUsingRealData(false);
    setSelectedStoreId((current) => current ?? anchored[0]?.id ?? null);
    try {
      const fetched = await fetchRealPlacesNearby(lat, lon);
      if (fetched.length > 0) {
        setRealStores(fetched);
        setUsingRealData(true);
        setSelectedStoreId((current) => current && fetched.some((store) => store.id === current) ? current : fetched[0].id);
      } else {
        setRealStores(anchored);
        setUsingRealData(false);
        setSelectedStoreId(anchored[0]?.id ?? null);
      }
    } catch {
      setRealStores(anchored);
      setUsingRealData(false);
      setSelectedStoreId(anchored[0]?.id ?? null);
    } finally {
      setIsLoadingStores(false);
    }
  }, []);

  useEffect(() => {
    if (!userCoords) {
      setRealStores([]);
      setSelectedStoreId(null);
      return;
    }
    loadNearbyPlaces(userCoords.lat, userCoords.lon);
  }, [loadNearbyPlaces, userCoords]);

  const handleLocateMe = () => {
    sfx.playTap();
    setIsLocating(true);
    setLocationNotice('Đang lấy tọa độ GPS thực tế của bạn và tìm các quán chay & điểm bán nguyên liệu gần nhất...');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lon = Number(pos.coords.longitude.toFixed(5));
          setUserCoords({ lat, lon });
          sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify({ lat, lon }));

          const addr = await reverseGeocodeAddress(lat, lon);
          const finalAddr = addr ? `${addr} (GPS: ${lat}, ${lon})` : `Tọa độ GPS (${lat}, ${lon})`;
          setLocationAddress(finalAddr);
          sessionStorage.setItem(SESSION_ADDR_KEY, finalAddr);

          await loadNearbyPlaces(lat, lon);
          setIsLocating(false);
          sfx.playSuccess();
          setLocationNotice(
            `Đã định vị thành công tại ${addr || `${lat}, ${lon}`}. Hệ thống đã liệt kê các quán chay và cửa hàng bán nguyên liệu gần bạn nhất!`
          );
        },
        (error) => {
          setIsLocating(false);
          let reason = 'Trình duyệt chưa cấp quyền truy cập vị trí GPS.';
          if (error.code === error.PERMISSION_DENIED) {
            reason = 'Bạn đã từ chối quyền truy cập vị trí trên trình duyệt.';
          } else if (error.code === error.TIMEOUT) {
            reason = 'Quá thời gian chờ tín hiệu GPS.';
          }
          setShowManualLocationInput(true);
          setLocationNotice(
            `${reason} Hãy nhập địa chỉ hoặc khu vực của bạn vào ô bên dưới để hệ thống định vị điểm bán gần bạn.`
          );
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
      setShowManualLocationInput(true);
      setLocationNotice('Thiết bị không hỗ trợ GPS tự động. Vui lòng nhập địa chỉ của bạn để tìm điểm bán gần nhất.');
    }
  };

  const selectQuickRegion = async (label: string, lat: number, lon: number) => {
    sfx.playTap();
    setIsLocating(true);
    setUserCoords({ lat, lon });
    setLocationAddress(label);
    sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify({ lat, lon }));
    sessionStorage.setItem(SESSION_ADDR_KEY, label);
    setShowManualLocationInput(false);
    await loadNearbyPlaces(lat, lon);
    setIsLocating(false);
    sfx.playSuccess();
    setLocationNotice(`Đã chuyển vùng định vị sang: ${label}.`);
  };

  const handleManualAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualAddressDraft.trim();
    if (!query) return;
    sfx.playTap();
    setIsLocating(true);
    setLocationNotice(`Đang tìm tọa độ cho địa chỉ "${query}"...`);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query + ', Việt Nam'
      )}&limit=1&accept-language=vi`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const lat = Number(parseFloat(data[0].lat).toFixed(5));
        const lon = Number(parseFloat(data[0].lon).toFixed(5));
        const displayName = data[0].display_name
          ? data[0].display_name.split(',').slice(0, 3).join(',').trim()
          : query;
        setUserCoords({ lat, lon });
        setLocationAddress(displayName);
        sessionStorage.setItem(SESSION_GPS_KEY, JSON.stringify({ lat, lon }));
        sessionStorage.setItem(SESSION_ADDR_KEY, displayName);
        setShowManualLocationInput(false);
        await loadNearbyPlaces(lat, lon);
        sfx.playSuccess();
        setLocationNotice(`Đã định vị theo địa chỉ: ${displayName} (${lat}, ${lon}).`);
      } else {
        setLocationNotice(`Không tìm thấy tọa độ chính xác cho "${query}". Vui lòng nhập rõ Quận/Huyện hoặc Tỉnh/Thành phố.`);
      }
    } catch {
      setLocationNotice('Không thể kết nối dịch vụ bản đồ lúc này. Vui lòng thử lại.');
    } finally {
      setIsLocating(false);
    }
  };

  const openGoogleMapsDirections = (store: SmartMarketStore) => {
    sfx.playTap();
    const originParam = userCoords ? `&origin=${userCoords.lat},${userCoords.lon}` : '';
    const destination =
      store.lat && store.lon
        ? `${store.lat},${store.lon}`
        : encodeURIComponent(`${store.name}, ${store.address}`);
    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openOsmDirections = (store: SmartMarketStore) => {
    sfx.playTap();
    const url = `https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lon}#map=17/${store.lat}/${store.lon}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Unchecked items = ingredients the user still needs to find at a store
  const neededItems = useMemo(() => items.filter((i) => !i.checked), [items]);
  const inFridgeOrCheckedItems = useMemo(() => items.filter((i) => i.checked), [items]);

  // Match stores against the needed ingredients and search query
  const matchedStores = useMemo(() => {
    if (!userCoords) return [];
    const baseStores = realStores.filter((store) => store.badgeType !== 'appliance' && store.category !== 'APPLIANCE');
    const query = searchQuery.toLowerCase().trim();
    const validQuery = !searchError ? query : '';

    return baseStores
      .map((store) => {
        const storeProductNames = [
          ...store.featuredItems,
          ...(store.catalog ?? []).map((c) => c.name),
        ];

        const matchedNeededNames: string[] = [];
        neededItems.forEach((needed) => {
          const nLower = needed.name.toLowerCase().trim();
          const hasInCatalog = storeProductNames.some(
            (pName) =>
              pName.toLowerCase().includes(nLower) ||
              nLower.includes(pName.toLowerCase().split(' ')[0])
          );
          if (hasInCatalog || store.category === 'VEGAN_STORE' || store.category === 'SUPERMARKET') {
            matchedNeededNames.push(needed.name);
          }
        });

        const totalNeeded = Math.max(neededItems.length, 1);
        const matchCount =
          neededItems.length > 0 ? matchedNeededNames.length : storeProductNames.length;
        const matchPercent =
          neededItems.length > 0
            ? Math.min(100, Math.round((matchCount / totalNeeded) * 100))
            : store.matchPercent;

        return {
          ...store,
          matchCount,
          totalNeeded: neededItems.length,
          matchPercent,
          matchedNeededNames,
          storeProductNames,
        };
      })
      .filter((store) => {
        if (categoryFilter === 'VEGAN_STORE' && store.category !== 'VEGAN_STORE') {
          return false;
        }
        if (
          categoryFilter === 'SUPERMARKET' &&
          store.category !== 'SUPERMARKET' &&
          store.category !== 'GROCERY_STORE' &&
          store.category !== 'MARKET' &&
          store.category !== 'CONVENIENCE'
        ) {
          return false;
        }
        if (!validQuery) return true;
        const matchStoreName = store.name.toLowerCase().includes(validQuery);
        const matchAddress = store.address.toLowerCase().includes(validQuery);
        const matchTagline = store.tagline.toLowerCase().includes(validQuery);
        const matchItem = store.storeProductNames.some((pName) => pName.toLowerCase().includes(validQuery));
        return matchStoreName || matchAddress || matchTagline || matchItem;
      })
      .sort((a, b) => {
        if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
        return a.distanceKm - b.distanceKm;
      });
  }, [userCoords, realStores, searchQuery, searchError, categoryFilter, neededItems]);

  const selectedStoreObj = useMemo(
    () => matchedStores.find((s) => s.id === selectedStoreId) ?? matchedStores[0] ?? null,
    [matchedStores, selectedStoreId]
  );

  const handleExportPdf = () => {
    sfx.playTap();
    const listRows = items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.amount)}</td>
            <td>${escapeHtml(item.mealNote)}</td>
            <td>${item.checked ? 'Đã có sẵn trong tủ lạnh' : 'Cần tìm mua'}</td>
          </tr>
        `
      )
      .join('');

    const storeRows = matchedStores
      .slice(0, 6)
      .map(
        (store, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(store.name)}</strong><br/><span class="muted">${escapeHtml(store.categoryLabel)}</span></td>
            <td>${escapeHtml(store.address)}</td>
            <td>${escapeHtml(store.distance)} (${escapeHtml(store.duration)})</td>
            <td>${escapeHtml(store.hours)}</td>
          </tr>
        `
      )
      .join('');

    printHtml(
      'Danh sách Nguyên liệu & Điểm bán Chay gần bạn - VEGEAI',
      `
        <h1>Danh sách Nguyên liệu & Địa điểm Quán chay / Cửa hàng gần bạn</h1>
        <p class="subtitle">
          Vị trí định vị: ${escapeHtml(locationAddress || 'Chưa định vị')} · Tổng nguyên liệu: ${items.length} món (Cần tìm mua: ${neededItems.length} món)
        </p>
        <h2>1. Danh sách nguyên liệu đối chiếu Tủ lạnh</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nguyên liệu</th>
              <th>Định lượng</th>
              <th>Nguồn</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>${listRows}</tbody>
        </table>
        <h2 style="margin-top: 24px;">2. Các Quán chay & Điểm bán nguyên liệu gần vị trí GPS</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tên địa điểm</th>
              <th>Địa chỉ</th>
              <th>Khoảng cách</th>
              <th>Giờ mở cửa</th>
            </tr>
          </thead>
          <tbody>${storeRows || '<tr><td colspan="5">Chưa định vị GPS</td></tr>'}</tbody>
        </table>
      `
    );
  };

  return (
    <MainLayout>
      <div className="bg-[#F6FBF7] min-h-screen py-8 pb-20 text-slate-900">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0F291E] via-[#143d2b] to-[#1b523a] rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
                  <Compass className="w-3.5 h-3.5" /> GPS Store &amp; Vegan Restaurant Locator
                </div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2">
                  Định Vị Quán Chay &amp; Điểm Bán Nguyên Liệu Gần Bạn
                </h1>
                <p className="text-emerald-100/85 text-sm md:text-base leading-relaxed">
                  Tra cứu bản đồ GPS các <strong>Nhà hàng chay</strong>, <strong>Cửa hàng thực phẩm thuần chay</strong> và <strong>Siêu thị nông sản</strong> bán đúng những nguyên liệu bạn đang cần tìm từ Tủ lạnh, Công thức món ăn, Thực đơn tuần hoặc AI Bếp Trưởng.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  to="/fridge-scan"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all"
                >
                  <Refrigerator className="w-4 h-4 text-emerald-300" />
                  Quét Tủ Lạnh AI
                </Link>
                <Link
                  to="/ai-chef"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md"
                >
                  <ChefHat className="w-4 h-4" />
                  Hỏi AI Bếp Trưởng
                </Link>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-amber-300" />
                  In danh sách &amp; địa chỉ
                </button>
              </div>
            </div>
          </div>

          {/* Active Context Banner (when redirected from Recipe / Video / Fridge / AI Chat) */}
          {activeRecipe && (
            <div className="mb-6 bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Đang tìm nguyên liệu theo ngữ cảnh
                    </span>
                    <h2 className="text-base font-black text-slate-900">{activeRecipe.title}</h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Hệ thống đã tự động đối chiếu với <strong>Kho Tủ Lạnh (/fridge)</strong> của bạn: hiện có{' '}
                    <strong className="text-emerald-700">{inFridgeOrCheckedItems.length} nguyên liệu đã sẵn sàng</strong> và{' '}
                    <strong className="text-amber-700">{neededItems.length} nguyên liệu cần tìm điểm bán gần đây</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/fridge"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  🧊 Xem Kho Tủ Lạnh
                </Link>
                <button
                  type="button"
                  onClick={resetDefault}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Đặt lại danh sách
                </button>
              </div>
            </div>
          )}

          {/* Main 2-Column Layout: Left = Needed Ingredients Checklist, Right = GPS Locator & Store Directory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN (4 cols): Ingredients Needed & Fridge Cross-Check */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Bước 1 · Nguyên liệu cần tìm
                    </span>
                    <h2 className="text-lg font-black text-slate-900">
                      Danh sách nguyên liệu ({neededItems.length} cần mua)
                    </h2>
                  </div>
                  <Link
                    to="/fridge"
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Kho tủ lạnh ({fridgeItems.length})
                  </Link>
                </div>

                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Đánh dấu những món bạn đã có sẵn ở nhà. Các cửa hàng bên phải sẽ được lọc ưu tiên theo những <strong>nguyên liệu chưa đánh dấu (cần tìm nơi bán)</strong>.
                </p>

                {/* Add custom ingredient to locate */}
                <form onSubmit={addItem} className="space-y-2.5 mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (inputError) setInputError(null);
                      }}
                      placeholder="Thêm nguyên liệu cần tìm chỗ bán..."
                      className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                    />
                    <input
                      type="text"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="Lượng (vd: 200g)"
                      className="w-28 px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Thêm vào danh sách tìm điểm bán
                  </button>
                </form>

                {inputError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{inputError}</span>
                  </div>
                )}

                {/* Ingredients list */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Chưa có nguyên liệu nào trong danh sách cần tìm.
                    </div>
                  ) : (
                    items.map((item) => {
                      const fridgeMatch = checkInFridge(item.name);
                      const allergyConflict = checkAllergyConflict(item.name);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`group flex items-start justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                            item.checked
                              ? 'bg-slate-50/80 border-slate-200/70 opacity-75'
                              : allergyConflict
                              ? 'bg-rose-50/60 border-rose-300'
                              : 'bg-white border-emerald-200/80 hover:border-emerald-400 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <button
                              type="button"
                              className="mt-0.5 text-emerald-600 shrink-0"
                              aria-label={item.checked ? 'Đánh dấu cần mua' : 'Đánh dấu đã có'}
                            >
                              {item.checked ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`text-xs font-bold ${
                                    item.checked ? 'line-through text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {item.name}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  {item.amount}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {fridgeMatch ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                                    🧊 Đã có trong tủ lạnh ({fridgeMatch.quantity ?? 1} {fridgeMatch.unit ?? 'phần'})
                                  </span>
                                ) : !item.checked ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                    🔍 Cần tìm điểm bán
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">Đã có sẵn</span>
                                )}

                                {allergyConflict && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                    ⚠️ Dị ứng: {allergyConflict}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(item.name);
                              }}
                              title="Lọc cửa hàng bán nguyên liệu này"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(item.id);
                              }}
                              title="Xóa khỏi danh sách"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer actions */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={clearChecked}
                    className="text-slate-500 hover:text-rose-600 font-semibold transition-colors cursor-pointer"
                  >
                    Ẩn món đã có sẵn ({inFridgeOrCheckedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={resetDefault}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (8 cols): GPS Location Control + Interactive Map + Nearby Vegan Restaurants & Ingredient Stores */}
            <div className="lg:col-span-8 space-y-6">
              {/* Step 2: GPS Location Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Bước 2 · Định vị GPS thực tế
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                      {userCoords
                        ? `Vị trí hiện tại: ${locationAddress}`
                        : 'Xác nhận vị trí để hiển thị Quán chay & Cửa hàng nguyên liệu gần bạn'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {userCoords
                        ? usingRealData
                          ? 'Đang hiển thị dữ liệu địa điểm thực tế từ bản đồ OpenStreetMap quanh tọa độ của bạn.'
                          : 'Không lấy được dữ liệu địa điểm thực tế từ bản đồ. Danh sách dưới đây chỉ là gợi ý minh họa quanh tọa độ của bạn, chưa được xác thực — hãy kiểm tra trên bản đồ trước khi đến.'
                        : 'Bấm "Định vị GPS tự động" hoặc nhập địa chỉ để hệ thống quét các điểm bán gần bạn nhất.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={isLocating}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                      {isLocating ? 'Đang định vị GPS...' : '📍 Định vị GPS tự động'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualLocationInput((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Nhập địa chỉ thủ công
                    </button>
                  </div>
                </div>

                {/* Manual address input */}
                {showManualLocationInput && (
                  <form onSubmit={handleManualAddressSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={manualAddressDraft}
                      onChange={(e) => setManualAddressDraft(e.target.value)}
                      placeholder="Nhập địa chỉ của bạn (VD: Quận 1, TP.HCM hoặc Cầu Giấy, Hà Nội)..."
                      className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                    >
                      Tìm quanh địa chỉ này
                    </button>
                  </form>
                )}

                {/* Quick regional switcher ONLY shown AFTER user has confirmed location */}
                {userCoords && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Chuyển nhanh khu vực:
                    </span>
                    {[
                      { label: 'TP.HCM (Trung tâm)', lat: 10.7769, lon: 106.7009 },
                      { label: 'Hà Nội (Hoàn Kiếm)', lat: 21.0285, lon: 105.8542 },
                      { label: 'Đà Nẵng (Hải Châu)', lat: 16.0544, lon: 108.2022 },
                      { label: 'Cần Thơ (Ninh Kiều)', lat: 10.0341, lon: 105.7875 },
                    ].map((region) => (
                      <button
                        key={region.label}
                        type="button"
                        onClick={() => selectQuickRegion(region.label, region.lat, region.lon)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        {region.label}
                      </button>
                    ))}
                  </div>
                )}

                {locationNotice && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
                    <span>{locationNotice}</span>
                    <button
                      type="button"
                      onClick={() => setLocationNotice(null)}
                      className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Search & Category Filter Bar */}
                <div className="mt-5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Tìm theo tên nguyên liệu (Đậu hũ, Nấm, Sữa hạt...) hoặc tên Quán chay / Siêu thị..."
                        className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchError(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Store Type Filter Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'ALL', label: 'Tất cả điểm bán' },
                        { id: 'VEGAN_STORE', label: '🥗 Quán chay & Tiệm thực phẩm chay' },
                        { id: 'SUPERMARKET', label: '🛒 Siêu thị & Nông sản sạch' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCategoryFilter(tab.id as typeof categoryFilter)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            categoryFilter === tab.id
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {/* Quick vegan ingredient tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Tìm nhanh nơi bán:</span>
                    {SUGGESTED_VEGAN_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addQuickSuggestedIngredient(tag)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                          searchQuery.toLowerCase() === tag.toLowerCase()
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                        }`}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Map + Store Cards */}
              {!userCoords ? (
                <div className="bg-white rounded-3xl border border-dashed border-emerald-300 p-10 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">
                    Bật định vị GPS để xem các Quán chay &amp; Điểm bán nguyên liệu quanh bạn
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
                    Hệ thống sẽ đối chiếu <strong>{neededItems.length} nguyên liệu bạn đang cần tìm</strong> với các Nhà hàng chay, Cửa hàng đồ chay và Siêu thị nông sản trong bán kính gần nhất, kèm chỉ đường trực tiếp trên Google Maps.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      📍 Bật định vị GPS ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualLocationInput(true)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer"
                    >
                      Nhập địa chỉ thủ công
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Interactive Leaflet Map */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Bản đồ GPS Quán chay &amp; Điểm bán nguyên liệu ({matchedStores.length} địa điểm)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Bấm vào ghim trên bản đồ hoặc thẻ cửa hàng bên dưới để xem các nguyên liệu có bán và mở chỉ đường.
                        </p>
                      </div>
                      {isLoadingStores && (
                        <span className="text-xs font-bold text-emerald-700 animate-pulse">
                          Đang quét địa điểm quanh tọa độ GPS...
                        </span>
                      )}
                    </div>

                    <SmartMarketMap
                      userLocation={userCoords}
                      stores={matchedStores}
                      selectedStore={selectedStoreObj}
                      onSelect={(store: SmartMarketStore) => setSelectedStoreId(store.id)}
                    />
                  </div>

                  {/* Nearby Stores & Vegan Restaurants Directory */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900">
                        Danh sách Quán chay &amp; Cửa hàng bán nguyên liệu gần bạn ({matchedStores.length})
                      </h3>
                      {searchQuery && (
                        <span className="text-xs font-bold text-emerald-700">
                          Đang lọc theo từ khóa: "{searchQuery}"
                        </span>
                      )}
                    </div>

                    {matchedStores.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
                        <p className="text-sm font-bold text-slate-700 mb-1">
                          Không tìm thấy địa điểm nào khớp bộ lọc hiện tại.
                        </p>
                        <p className="text-xs text-slate-500 mb-4">
                          Hãy thử chuyển bộ lọc sang "Tất cả điểm bán" hoặc xóa từ khóa tìm kiếm.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('ALL');
                            setSearchQuery('');
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Hiển thị tất cả địa điểm gần tôi
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {matchedStores.map((store) => {
                          const isSelected = store.id === selectedStoreId;
                          return (
                            <div
                              key={store.id}
                              onClick={() => setSelectedStoreId(store.id)}
                              className={`bg-white rounded-3xl border p-5 sm:p-6 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                                  : 'border-slate-200/80 hover:border-emerald-300 shadow-xs'
                              }`}
                            >
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                        store.category === 'VEGAN_STORE'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-sky-100 text-sky-800'
                                      }`}
                                    >
                                      {store.category === 'VEGAN_STORE'
                                        ? '🥗 Quán chay & Cửa hàng thực phẩm chay'
                                        : '🛒 Siêu thị / Nông sản sạch'}
                                    </span>

                                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                      <MapPin className="w-3.5 h-3.5" /> {store.distance} ({store.duration})
                                    </span>

                                    {store.rating > 0 && (
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        {store.rating.toFixed(1)} ({store.reviewsCount})
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-lg font-black text-slate-900">{store.name}</h4>
                                  <p className="text-xs text-slate-600">{store.tagline}</p>

                                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      {store.address}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      {store.hours}
                                    </span>
                                    {store.phone && (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        {store.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Direct Navigation Buttons (No Cart, Pure GPS Directions) */}
                                <div className="flex flex-wrap md:flex-col items-stretch gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openGoogleMapsDirections(store);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                    Chỉ đường Google Maps
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openOsmDirections(store);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Mở bản đồ OSM
                                  </button>
                                </div>
                              </div>

                              {/* Ingredients / Dishes available at this location */}
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                                    {store.category === 'VEGAN_STORE'
                                      ? 'Món chay & nguyên liệu thực dưỡng nổi bật tại địa điểm:'
                                      : 'Nguyên liệu chay & nông sản có bán tại địa điểm này:'}
                                  </span>
                                  {neededItems.length > 0 && (
                                    <span className="text-[11px] font-bold text-emerald-700">
                                      Có thể đáp ứng ~{store.matchPercent}% danh sách (ước tính theo loại cửa hàng, hãy xác nhận với cửa hàng)
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {(store.catalog && store.catalog.length > 0
                                    ? store.catalog.map((c) => ({ name: c.name, unit: c.unit }))
                                    : store.featuredItems.map((fi) => ({ name: fi, unit: '' }))
                                  ).map((product, idx) => {
                                    const isNeededMatch = neededItems.some(
                                      (n) =>
                                        product.name.toLowerCase().includes(n.name.toLowerCase()) ||
                                        n.name.toLowerCase().includes(product.name.toLowerCase().split(' ')[0])
                                    );
                                    return (
                                      <span
                                        key={`${store.id}-prod-${idx}`}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                          isNeededMatch
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                            : 'bg-slate-50 border-slate-200/80 text-slate-700'
                                        }`}
                                      >
                                        {isNeededMatch ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        ) : (
                                          <Utensils className="w-3 h-3 text-slate-400 shrink-0" />
                                        )}
                                        <span>{product.name}</span>
                                        {product.unit && (
                                          <span className="text-[10px] text-slate-400 font-normal">({product.unit})</span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
