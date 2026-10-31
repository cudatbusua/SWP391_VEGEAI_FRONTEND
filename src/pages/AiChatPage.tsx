import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowUp,
  ChefHat,
  Plus,
  ScanLine,
  Sparkles,
  Soup,
  Timer,
  Utensils,
  Loader2,
  Trash2,
  ChevronRight,
  BookOpen,
  Search,
  Camera,
  PenLine,
  X
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { aiService } from '../services/aiService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import {
  ChatMealScheduleCardView,
  ChatActivityRingsView
} from '../components/ChatInteractiveWidgets';
import type {
  ChatMealScheduleCardData,
  ChatActivityRingsCardData
} from '../components/ChatInteractiveWidgets';
import { DEFAULT_WEEKLY_SCHEDULE } from '../data/weeklyScheduleData';
import { wearableService } from '../utils/wearableService';
import { userService } from '../services/userService';
import { fridgeService } from '../services/fridgeService';
import { calculateBmr, calculateTdee } from '../utils/nutritionProfile';

export type SessionCategory = 'fridge-scan' | 'ai-chef';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  image?: string;
  mealScheduleCard?: ChatMealScheduleCardData;
  activityRingsCard?: ChatActivityRingsCardData;
}

export interface ChatSession {
  id: string;
  title: string;
  category: SessionCategory;
  messages: ChatMessage[];
  sessionId?: string;
  recommendedRecipes?: string[];
  updatedAt: number;
}

const DEFAULT_SUGGESTIONS = [
  { icon: Sparkles, title: '⭕ Hiện vòng Ring & Thể trạng hôm nay', text: 'Hãy hiển thị vòng Ring hoạt động, tiến độ calo và thể trạng dinh dưỡng của tôi ngay trong đoạn chat này.' },
  { icon: Sparkles, title: '📅 Gửi lịch biểu thực đơn 7 ngày tương tác', text: 'Hãy gửi cho tôi một lịch biểu thực đơn 7 ngày hoàn chỉnh có thể tương tác bấm chọn từng ngày và xem chi tiết các bữa ngay trong chat.' },
  { icon: Sparkles, title: '⌚ Đồng bộ thiết bị đeo & Google Fit', text: 'Tôi muốn kiểm tra và đồng bộ dữ liệu vòng đeo tay Google Fit (bước chân, calo vận động) trên VEGEAI. Bếp trưởng hãy giải thích ý nghĩa các chỉ số trên vòng Zen Rings và cách hệ thống tự động cân đối dinh dưỡng thích ứng theo mức vận động nhé!' },
  { icon: Soup, title: '🥗 Món ngon từ kho tủ lạnh', text: 'CHECK_FRIDGE_AUTO' },
];
function formatTime(timestamp: number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function AiChatPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();

  // Keep account history isolated from guest history. The v2 guest key also
  // discards legacy guest data polluted while authentication was hydrating.
  const storageKey = user?.id
    ? `vegeai:ai-chef:sessions:${user.id}`
    : 'vegeai:ai-chef:sessions:guest:v2';
  const loadedStorageKeyRef = useRef('');
  const skipNextPersistRef = useRef(false);

  // Guest conversations are intentionally ephemeral. They must disappear when
  // the guest leaves the chef page and must never leak into a later visit.
  useEffect(() => {
    if (user?.id) return;
    return () => localStorage.removeItem('vegeai:ai-chef:sessions:guest:v2');
  }, [user?.id]);

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'default-welcome',
        title: 'Chào mừng bạn đến với Bếp trưởng',
        category: 'ai-chef',
        messages: [
          {
            sender: 'ai',
            text: 'Xin chào! Tôi là Bếp trưởng VEGEAI. Tôi có thể giúp bạn lên thực đơn chay, phân tích nguyên liệu từ tủ lạnh, hoặc hướng dẫn nấu các món chay bổ dưỡng và ngon miệng. Hôm nay bạn muốn nấu gì?',
            time: formatTime(Date.now())
          }
        ],
        updatedAt: Date.now()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || 'default-welcome');
  const [activeTabCategory, setActiveTabCategory] = useState<'all' | 'fridge-scan' | 'ai-chef'>('all');
  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('vegeai_user_profile');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const stored = localStorage.getItem('vegeai_user_profile');
        if (stored) setUserProfile(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    if (user?.id) {
      userService.getProfile().then(p => {
        setUserProfile(p);
        try { localStorage.setItem('vegeai_user_profile', JSON.stringify(p)); } catch {}
      }).catch(() => {});
    }
  }, [user?.id]);

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let nextSessions: ChatSession[] | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) nextSessions = parsed;
      }
    } catch {
      // Fall back to a clean welcome session.
    }
    if (!nextSessions) {
      nextSessions = [{
        id: 'default-welcome',
        title: 'Chào mừng bạn đến với Bếp trưởng',
        category: 'ai-chef',
        messages: [{
          sender: 'ai',
          text: 'Xin chào! Tôi là Bếp trưởng VEGEAI. Tôi có thể giúp bạn lên thực đơn chay, phân tích nguyên liệu từ tủ lạnh, hoặc hướng dẫn nấu các món chay bổ dưỡng và ngon miệng. Hôm nay bạn muốn nấu gì?',
          time: formatTime(Date.now())
        }],
        updatedAt: Date.now()
      }];
    }
    skipNextPersistRef.current = true;
    loadedStorageKeyRef.current = storageKey;
    setSessions(nextSessions);
    setActiveSessionId(nextSessions[0].id);
    setActiveTabCategory('all');
    setError('');
  }, [isAuthLoading, storageKey]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Vui lòng chọn ảnh định dạng JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Dung lượng ảnh tối đa 5MB.');
      return;
    }
    setError('');
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Persist sessions
  useEffect(() => {
    if (isAuthLoading || loadedStorageKeyRef.current !== storageKey) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch {
      // Ignore storage errors
    }
  }, [isAuthLoading, sessions, storageKey]);

  // Current session
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentSession?.messages, busy]);

  // Handle incoming Hand-off from FridgeScanPage
  useEffect(() => {
    const state = location.state as { source?: string; ingredients?: string[]; title?: string } | null;
    if (state?.ingredients && state.ingredients.length > 0) {
      const ingredientsList = state.ingredients.join(', ');
      const sessionTitle = state.title || `Quét tủ lạnh (${state.ingredients.length} món)`;
      
      // Create new fridge-scan session
      const newSession: ChatSession = {
        id: `scan-${Date.now()}`,
        title: sessionTitle,
        category: 'fridge-scan',
        messages: [
          {
            sender: 'user',
            text: `Tôi vừa quét tủ lạnh và nhận diện được các nguyên liệu: ${ingredientsList}. Hãy phân tích và đề xuất 3 món chay ngon nhất, kèm hướng dẫn chế biến nhanh.`,
            time: formatTime(Date.now())
          }
        ],
        updatedAt: Date.now()
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setActiveTabCategory('fridge-scan');

      // Auto trigger AI response for the scan
      setBusy(true);
      setError('');
      aiService.chat(newSession.messages[0].text)
        .then(res => {
          setSessions(prev => prev.map(s => {
            if (s.id === newSession.id) {
              return {
                ...s,
                sessionId: res.sessionId,
                recommendedRecipes: res.recommendedRecipes,
                messages: [
                  ...s.messages,
                  { sender: 'ai', text: res.reply, time: formatTime(Date.now()) }
                ]
              };
            }
            return s;
          }));
        })
        .catch(err => {
          setError(errorMessage(err));
        })
        .finally(() => {
          setBusy(false);
          // clear location state so back/forward won't duplicate
          window.history.replaceState({}, document.title);
        });
    }
  }, [location.state]);

  const createNewSession = (category: SessionCategory = 'ai-chef') => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: category === 'fridge-scan' ? 'Món mới từ tủ lạnh' : 'Tư vấn ẩm thực chay mới',
      category,
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setError('');
    setInput('');
    setTimeout(() => fieldRef.current?.focus(), 100);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const fallback: ChatSession = {
          id: `session-${Date.now()}`,
          title: 'Cuộc trò chuyện mới',
          category: 'ai-chef',
          messages: [],
          updatedAt: Date.now()
        };
        setActiveSessionId(fallback.id);
        return [fallback];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

    const handleClearGuestSessions = () => {
    if (window.confirm('Bạn có chắc muốn xóa sạch toàn bộ lịch sử trò chuyện khách trên trình duyệt này?')) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        // ignore
      }
      const initialSession: ChatSession = {
        id: 'default-welcome',
        title: 'Chào mừng bạn đến với Bếp trưởng',
        category: 'ai-chef',
        messages: [
          {
            sender: 'ai',
            text: 'Xin chào! Tôi là Bếp trưởng VEGEAI. Toàn bộ lịch sử trò chuyện khách đã được xóa sạch sẽ. Hôm nay bạn muốn lên thực đơn hoặc phân tích nguyên liệu gì?',
            time: formatTime(Date.now())
          }
        ],
        updatedAt: Date.now()
      };
      setSessions([initialSession]);
      setActiveSessionId('default-welcome');
    }
  };

  const handleFridgeQuickAction = async () => {
    try {
      const items = await fridgeService.list();
      const availableItems = items.filter(i => i.status === 'ACTIVE');
      if (availableItems.length > 0) {
        const names = availableItems.map(i => `${i.name}${i.quantity ? ` (${i.quantity} ${i.unit || ''})` : ''}`).join(', ');
        handleSubmitWithText(`Tủ lạnh của tôi hiện đang có các nguyên liệu: ${names}. Bếp trưởng hãy gợi ý giúp tôi 3 món chay ngon nhất, cân bằng dinh dưỡng chế biến từ các nguyên liệu này nhé!`);
      } else {
        handleSubmitWithText('Trong kho tủ lạnh của tôi hiện đang có những nguyên liệu gì và Bếp trưởng có gợi ý món chay nào phù hợp không?');
      }
    } catch {
      handleSubmitWithText('Trong kho tủ lạnh của tôi hiện đang có những nguyên liệu gì và Bếp trưởng có gợi ý món chay nào phù hợp không?');
    }
  };

  const handleSubmitWithText = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent, text);
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent, directText?: string) => {
    e.preventDefault();
    const effectiveText = (directText !== undefined ? directText : input).trim();
    if ((!effectiveText && !selectedImage) || busy || !currentSession) return;

    const userText = effectiveText;
    const currentImg = selectedImage;
    const currentImgPreview = imagePreview;

    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setBusy(true);
    setError('');

    const userMsg: ChatMessage = {
      sender: 'user',
      text: userText || (currentImg ? 'Đã gửi ảnh nguyên liệu / tủ lạnh để nhờ Bếp Trưởng tư vấn' : ''),
      image: currentImgPreview || undefined,
      time: formatTime(Date.now()),
    };

    // Update session title if first user message
    const updatedTitle = currentSession.messages.filter(m => m.sender === 'user').length === 0
      ? (userText ? userText.slice(0, 35) + (userText.length > 35 ? '...' : '') : 'Phân tích ảnh tủ lạnh')
      : currentSession.title;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSession.id) {
        return {
          ...s,
          title: updatedTitle,
          category: currentImg ? 'fridge-scan' : s.category,
          messages: [...s.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    try {
      let finalPrompt = userText;
      let detectedRecipes: string[] = [];

      if (currentImg) {
        setIsAnalyzingImage(true);
        try {
          const scanRes = await aiService.scanFridge(currentImg);
          if (scanRes && scanRes.ingredients && scanRes.ingredients.length > 0) {
            const isNonFood = (name: string) => {
              const l = name.toLowerCase();
              return l.includes('củi') || l.includes('que') || l.includes('gỗ') || l.includes('đá') || l.includes('nhựa') || l.includes('bụi cây') || l.includes('hoạt hình');
            };
            const edibleIngredients = scanRes.ingredients.filter(i => i.isEdible !== false && i.category !== 'NON_FOOD' && !isNonFood(i.name));
            const nonFoodIngredients = scanRes.ingredients.filter(i => i.isEdible === false || i.category === 'NON_FOOD' || isNonFood(i.name));

            if (edibleIngredients.length > 0) {
              const ingNames = edibleIngredients.map(i => i.name).join(', ');
              detectedRecipes = scanRes.suggestedRecipes || [];
              let promptIntro = userText
                ? `Tôi vừa gửi ảnh tủ lạnh/món ăn. AI thị giác nhận diện được các nguyên liệu ăn được: ${ingNames}. Yêu cầu của tôi: ${userText}`
                : `Tôi vừa gửi ảnh tủ lạnh. Qua hình ảnh nhận diện được các nguyên liệu thực phẩm ăn được: ${ingNames}. Hãy phân tích độ tươi, lưu ý bảo quản và gợi ý 3 món chay ngon nhất, kèm hướng dẫn chế biến nhanh.`;
              if (nonFoodIngredients.length > 0) {
                promptIntro += ` (Lưu ý: Có vật phẩm trong ảnh không ăn được đã được AI tự động loại trừ: ${nonFoodIngredients.map(i => i.name).join(', ')}).`;
              }
              finalPrompt = promptIntro;
            } else if (nonFoodIngredients.length > 0) {
              const nonFoodNames = nonFoodIngredients.map(i => i.name).join(', ');
              finalPrompt = `Tôi vừa tải lên một hình ảnh và AI nhận diện thấy các vật thể: ${nonFoodNames}. Những thứ này KHÔNG phải là nguyên liệu thực phẩm ăn được để nấu ăn (ví dụ như củi khô, tranh vẽ hoạt hình, hoặc đồ dùng gia đình). Bếp trưởng hãy giải thích lịch sự rằng những vật phẩm này không ăn được và hướng dẫn tôi chụp ảnh nguyên liệu rau củ quả, đậu hũ hoặc thực phẩm ăn được thực tế.`;
            } else {
              finalPrompt = userText || 'Tôi vừa gửi ảnh nguyên liệu nấu ăn, hãy tư vấn giúp tôi các món chay thơm ngon phù hợp.';
            }
          } else {
            finalPrompt = userText || 'Tôi vừa gửi ảnh nguyên liệu nấu ăn, hãy tư vấn giúp tôi các món chay thơm ngon phù hợp.';
          }
        } catch (scanErr) {
          console.warn('Vision analysis fallback:', scanErr);
          finalPrompt = userText || 'Tôi gửi ảnh nguyên liệu nấu ăn, hãy tư vấn giúp tôi các món chay thơm ngon phù hợp.';
        } finally {
          setIsAnalyzingImage(false);
        }
      }

      const isFridgeQuery = /tủ\s*lạnh|nguyên\s*liệu\s*(sẵn\s*có|trong\s*tủ)|món\s*ngon\s*tủ\s*lạnh|kho\s*(tủ\s*lạnh|thực\s*phẩm)/i.test(userText);
      if (isFridgeQuery && !currentImg) {
        try {
          const fItems = await fridgeService.list();
          const avail = fItems.filter(i => i.status === 'ACTIVE');
          if (avail.length > 0) {
            const fNames = avail.map(i => `${i.name}${i.quantity ? ` (${i.quantity} ${i.unit || ''})` : ''}`).join(', ');
            finalPrompt = `[Dữ liệu thực tế: Trong kho tủ lạnh VEGEAI của tôi hiện có: ${fNames}]. Yêu cầu của tôi: ${userText}`;
          } else {
            finalPrompt = `[Dữ liệu thực tế: Kho tủ lạnh VEGEAI của tôi hiện đang TRỐNG, chưa có nguyên liệu nào được lưu trữ]. Yêu cầu của tôi: ${userText}`;
          }
        } catch {}
      }

      const history = currentSession.messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text.slice(0, 4000)
      }));

      
      // Check for interactive rich cards requests
      const isSchedule = /lịch\s*biểu|thực\s*đơn\s*tuần|kế\s*hoạch.*(tuần|7\s*ngày)|thời\s*khóa\s*biểu|menu\s*tuần|lên\s*lịch/i.test(userText);
      const isRings = /vòng\s*ring|ring|vòng\s*tròn|chỉ\s*số.*(sức\s*khỏe|thể\s*trạng)|tiến\s*độ\s*calo|hoạt\s*động\s*của\s*tôi|zen\s*ring/i.test(userText);
      const isWearable = /google\s*fit|vòng\s*đeo\s*tay|đồng\s*hồ|xiaomi\s*band|mi\s*fitness|bước\s*chân|thiết\s*bị\s*đeo/i.test(userText);

      let attachedScheduleCard: ChatMealScheduleCardData | undefined = undefined;
      let attachedRingsCard: ChatActivityRingsCardData | undefined = undefined;

      // Deterministic user health metrics matching AccountSettingsPage
      const hNum = userProfile?.heightCm ? Number(userProfile.heightCm) : 0;
      const wNum = userProfile?.weightKg ? Number(userProfile.weightKg) : 0;
      const age = userProfile?.dateOfBirth
        ? Math.max(15, new Date().getFullYear() - new Date(userProfile.dateOfBirth).getFullYear())
        : (userProfile?.age || 25);
      const gender = (userProfile?.gender as any) || 'OTHER';
      const bmr = (hNum > 0 && wNum > 0) ? calculateBmr(wNum, hNum, age, gender) : 0;
      const tdee = bmr > 0 ? calculateTdee(bmr, 1.375) : 0;
      const defaultScientificCalorie = tdee > 0 ? Math.round(tdee) : (bmr > 0 ? Math.round(bmr) : 1800);
      const effectiveCalorieTarget = (userProfile?.dailyCalorieTarget && Number(userProfile.dailyCalorieTarget) > 0)
        ? Number(userProfile.dailyCalorieTarget)
        : defaultScientificCalorie;
      const effectiveProteinTarget = wNum > 0
        ? Math.round(wNum * 1.1)
        : (effectiveCalorieTarget > 0 ? Math.round((effectiveCalorieTarget * 0.20) / 4) : 0);
      const effectiveFiberTarget = effectiveCalorieTarget > 0 ? 35 : 0;

      if (isSchedule) {
        attachedScheduleCard = {
          weekTitle: 'Lịch Thực Đơn Tuần 7 Ngày Thuần Thực Vật Cân Bằng Dinh Dưỡng',
          targetCalories: effectiveCalorieTarget,
          days: DEFAULT_WEEKLY_SCHEDULE
        };
      }

      if (isRings || isWearable) {
        const w = wearableService.getMetrics();

        attachedRingsCard = {
          calories: w.activeCalories > 0 ? w.activeCalories : 0,
          calorieTarget: effectiveCalorieTarget,
          proteinGrams: 0,
          proteinTarget: effectiveProteinTarget,
          fiberGrams: 0,
          fiberTarget: effectiveFiberTarget,
          heightCm: hNum || '',
          weightKg: wNum || '',
          age: age,
          gender: gender,
          steps: w.steps,
          wearableKcal: w.activeCalories,
          heartRate: w.avgHeartRate,
          sleepHours: w.sleepHours,
          isConnected: w.isConnected,
          source: w.source,
          lastSyncedAt: w.lastSyncedAt,
          advice: w.aiAdvice
        };
      }

      const response = await aiService.chat(finalPrompt, currentSession.sessionId, history);

      let replyText = response.reply;
      if (isWearable || isRings) {
        replyText = replyText.replace(/tính năng đồng bộ dữ liệu thời gian thực từ thiết bị đeo.*khung chat này\.?/gi, '').trim();
        replyText = replyText.replace(/mình hỗ trợ các chủ đề về ăn chay, công thức và tính năng của vegeai\.? bạn có muốn tìm một món chay phù hợp hôm nay không\??/gi, '').trim();
        if (!replyText || replyText.length < 20) {
          replyText = 'Hệ thống VEGEAI hỗ trợ kết nối trực tiếp với Google Fit và các thiết bị đeo thông minh (Xiaomi Band, Apple Watch, Smartband...) qua chuẩn OAuth 2.0. Các chỉ số bước chân và calo tiêu hao vận động sẽ được tự động cập nhật vào vòng Zen Rings để Bếp trưởng cân bằng lại thực đơn thích ứng cho bạn. Bạn có thể bấm nút **"Đồng bộ Google Fit"** ngay trên thẻ bên dưới hoặc mở mục **"Hồ sơ & Thể trạng"** để hoàn tất liên kết tài khoản.';
        }
      }

      if (isSchedule && !replyText.includes('Lịch biểu thực đơn tuần')) {
        replyText = '🌿 Dạ, tôi đã gửi ngay cho bạn **Lịch biểu thực đơn tuần 7 ngày tương tác** bên dưới! Bạn có thể nhấp chọn từng ngày từ Thứ Hai đến Chủ Nhật, xem chi tiết 3 bữa ăn kèm năng lượng calo & đạm thực vật, hoặc bấm "Đổi món" và "Đi chợ" trực tiếp ngay trong chat nhé.\n\n' + replyText;
      } else if ((isRings || isWearable) && !replyText.includes('Vòng Ring')) {
        replyText = '✨ Dạ, đây là **Vòng Ring Hoạt Động (Zen Rings)** và các chỉ số thể trạng của bạn hôm nay trực tiếp trong khung chat! Vòng tròn màu đỏ thể hiện Calo, màu xanh lá thể hiện Đạm thực vật, và màu xanh lam thể hiện Vận động từ vòng đeo tay Google Fit.\n\n' + replyText;
      }


      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: replyText,
        time: formatTime(Date.now()),
        mealScheduleCard: attachedScheduleCard,
        activityRingsCard: attachedRingsCard
      };

      const combinedRecipes = Array.from(new Set([
        ...(response.recommendedRecipes || []),
        ...detectedRecipes
      ]));

      setSessions(prev => prev.map(s => {
        if (s.id === currentSession.id) {
          return {
            ...s,
            sessionId: response.sessionId,
            recommendedRecipes: combinedRecipes.length > 0 ? combinedRecipes : s.recommendedRecipes,
            messages: [...s.messages, aiMsg],
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    } catch (err) {
      const errTxt = errorMessage(err);
      const isQuota = /hết lượt|guest trial|quota/i.test(errTxt);
      if (isQuota) {
        setShowQuotaModal(true);
        const quotaMsg = {
          sender: 'ai' as const,
          text: '🌿 Bạn đã dùng hết 3 lượt tư vấn miễn phí cho khách vãng lai hôm nay. Hãy đăng ký hoặc đăng nhập tài khoản VEGEAI hoàn toàn miễn phí để tiếp tục trò chuyện không giới hạn với mình nhé!',
          time: formatTime(Date.now())
        };
        setSessions(prev => prev.map(s => {
          if (s.id === currentSession.id) {
            return {
              ...s,
              messages: [...s.messages, quotaMsg],
              updatedAt: Date.now()
            };
          }
          return s;
        }));
      } else {
        setError(errTxt);
        setInput(userText);
      }
    } finally {
      setBusy(false);
    }
  };

  // Filtered session list
  const filteredSessions = sessions.filter(s => {
    if (activeTabCategory === 'all') return true;
    return s.category === activeTabCategory;
  });

  return (
    <MainLayout>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">
              <span>CĂN BẾP THÔNG MINH</span>
              <span>•</span>
              <span>AI CULINARY ASSISTANT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <ChefHat className="w-8 h-8 text-emerald-600" />
              AI Bếp Trưởng & Phân Tích Thực Phẩm
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/fridge-scan"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold hover:bg-emerald-100 transition shadow-2xs"
            >
              <ScanLine className="w-4 h-4" />
              <span>Quét tủ lạnh ngay</span>
            </Link>

            <button
              type="button"
              onClick={() => createNewSession('ai-chef')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Hội thoại mới</span>
            </button>
          </div>
        </div>

        {/* Guest Mode Privacy Notice Banner */}
        {!user && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  Chế độ Khách (Chưa đăng nhập) — Quyền riêng tư & Bộ nhớ trình duyệt
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Lịch sử trò chuyện này chỉ được lưu tạm thời trên trình duyệt máy bạn qua <strong>LocalStorage</strong> và KHÔNG đồng bộ lên tài khoản hay các thiết bị khác. Nếu bạn mở trên máy khác hoặc trình duyệt khác, đoạn chat này sẽ không hiển thị.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleClearGuestSessions}
                className="px-3 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lịch sử chat khách</span>
              </button>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-2xs"
              >
                Đăng ký tài khoản
              </Link>
            </div>
          </div>
        )}

        {/* Main Grid: Left Session Sidebar + Right Chat Canvas */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
          
          {/* Left Session Drawer / Sidebar */}
          <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col h-[720px]">
            
            {/* Category Filter Switcher */}
            <div className="mb-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Phân loại phiên hội thoại
              </p>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTabCategory('all')}
                  className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
                    activeTabCategory === 'all'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabCategory('fridge-scan')}
                  className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
                    activeTabCategory === 'fridge-scan'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🥬 Quét tủ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabCategory('ai-chef')}
                  className={`py-1.5 px-2 rounded-lg transition cursor-pointer text-center ${
                    activeTabCategory === 'ai-chef'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  👨‍🍳 Bếp trưởng
                </button>
              </div>
            </div>

            {/* Sessions List Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Chưa có phiên hội thoại nào trong danh mục này.
                </div>
              ) : (
                filteredSessions.map(sess => {
                  const isActive = sess.id === activeSessionId;
                  const isFridge = sess.category === 'fridge-scan';
                  return (
                    <div
                      key={sess.id}
                      onClick={() => setActiveSessionId(sess.id)}
                      className={`group relative p-3 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50/70 dark:bg-slate-800 border-emerald-300 dark:border-emerald-600 ring-1 ring-emerald-200 dark:ring-emerald-800'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg text-xs ${
                            isFridge
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isFridge ? <ScanLine className="w-3.5 h-3.5" /> : <ChefHat className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            {isFridge ? 'Quét tủ lạnh' : 'Bếp trưởng AI'}
                          </span>
                        </div>

                        <button
                          type="button"
                          title="Xóa phiên"
                          onClick={(e) => deleteSession(sess.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className={`text-xs font-bold mt-2 truncate ${
                        isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {sess.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        {sess.messages[sess.messages.length - 1]?.text || 'Chưa có tin nhắn'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Quick Links */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/settings?tab=calendar" className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-700 transition">
                <span className="flex items-center gap-2 font-semibold"><Timer className="w-3.5 h-3.5" /> Lịch ăn 30 ngày</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link to="/smart-market" className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-700 transition">
                <span className="flex items-center gap-2 font-semibold"><Utensils className="w-3.5 h-3.5" /> Đi chợ thông minh</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </aside>

          {/* Right Chat Canvas */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col h-[720px]">
            
            {/* Chat Session Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl text-white ${
                  currentSession?.category === 'fridge-scan' ? 'bg-emerald-600' : 'bg-teal-700'
                }`}>
                  {currentSession?.category === 'fridge-scan' ? <ScanLine className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {currentSession?.title || 'Bếp trưởng VEGEAI'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentSession?.category === 'fridge-scan' ? 'Phiên phân tích nguyên liệu quét từ tủ lạnh' : 'Phiên tư vấn thực đơn & công thức chay'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Gemini 3.5 AI Vision & Chef
                </span>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div role="log" aria-live="polite" className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* If no messages yet, show suggestions */}
              {(!currentSession || currentSession.messages.length === 0) && (
                <div className="max-w-xl mx-auto py-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                    Cùng nấu một món chay ngon hôm nay!
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
                    Đặt câu hỏi về nguyên liệu bạn đang có, chế độ ăn kiêng, hoặc bấm vào các gợi ý nhanh bên dưới:
                  </p>

                  <div className="space-y-3 text-left">
                    {DEFAULT_SUGGESTIONS.map(({ icon: Icon, title, text }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          if (text === 'CHECK_FRIDGE_AUTO') {
                            handleFridgeQuickAction();
                            return;
                          }
                          setInput(text);
                          fieldRef.current?.focus();
                        }}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-slate-800 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">{text === 'CHECK_FRIDGE_AUTO' ? 'Tự động truy xuất nguyên liệu trong tủ lạnh của bạn để gợi ý món chay thơm ngon.' : text}</p>
                          </div>
                        </div>
                        <ArrowUp className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 rotate-45 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages list */}
              {currentSession?.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <ChefHat className="w-5 h-5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl px-5 py-3.5 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-700 text-white rounded-tr-none shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 opacity-70 text-[10px]">
                      <span className="font-bold">{msg.sender === 'user' ? 'Bạn' : 'Bếp trưởng VEGEAI'}</span>
                      <span>{msg.time}</span>
                    </div>
                    {msg.image && (
                      <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20 max-w-xs shadow-xs">
                        <img src={msg.image} alt="Ảnh đính kèm" className="w-full h-auto object-cover max-h-56 rounded-lg" />
                      </div>
                    )}
                    <div className="whitespace-pre-wrap font-sans break-words">{msg.text}</div>

                    {/* Interactive 7-Day Meal Schedule Card */}
                    {msg.mealScheduleCard && (
                      <ChatMealScheduleCardView
                        card={msg.mealScheduleCard}
                        onSwapMeal={(mealName, mealType, cal) => {
                          const swapPrompt = `Hãy gợi ý cho tôi 2 món chay thay thế cho món "${mealName}" (${cal} kcal) vào bữa ${mealType} nhé.`;
                          handleSubmitWithText(swapPrompt);
                        }}
                        onAddToShoppingList={(mealName) => {
                          try {
                            const raw = localStorage.getItem('smart_market_cart') || '[]';
                            const list = JSON.parse(raw);
                            list.push({ id: 'chat-' + Date.now(), name: `Nguyên liệu: ${mealName}`, price: 45000, quantity: 1 });
                            localStorage.setItem('smart_market_cart', JSON.stringify(list));
                          } catch (e) {}
                        }}
                      />
                    )}

                    {/* Interactive Activity Zen Rings & Wearable Tracker Card */}
                    {msg.activityRingsCard && (
                      <ChatActivityRingsView
                        card={msg.activityRingsCard}
                        onSyncLive={async () => {
                          try {
                            const token = wearableService.getStoredToken();
                            if (token) {
                              await wearableService.fetchGoogleFitLive(token);
                            } else {
                              await wearableService.openGoogleFitAuthPopup();
                            }
                            const fresh = wearableService.getMetrics();
                            setSessions(prev => prev.map(s => {
                              if (s.id !== activeSessionId) return s;
                              const newMsgs = [...s.messages];
                              if (newMsgs[idx]?.activityRingsCard) {
                                newMsgs[idx] = {
                                  ...newMsgs[idx],
                                  activityRingsCard: {
                                    ...newMsgs[idx].activityRingsCard!,
                                    calories: fresh.activeCalories > 0 ? fresh.activeCalories : 0,
                                    steps: fresh.steps,
                                    wearableKcal: fresh.activeCalories,
                                    heartRate: fresh.avgHeartRate,
                                    lastSyncedAt: fresh.lastSyncedAt,
                                    isConnected: fresh.isConnected,
                                    advice: fresh.aiAdvice
                                  }
                                };
                              }
                              return { ...s, messages: newMsgs, updatedAt: Date.now() };
                            }));
                          } catch (err: any) {
                            alert(err.message || 'Lỗi khi đồng bộ Google Fit');
                          }
                        }}
                        onAskAiAdvice={(advicePrompt) => {
                          handleSubmitWithText(advicePrompt);
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAnalyzingImage ? 'Bếp trưởng đang quét và nhận diện nguyên liệu trong ảnh...' : 'Bếp trưởng đang chuẩn bị câu trả lời dinh dưỡng...'}</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Recommended Recipes Strip if present */}
            {currentSession?.recommendedRecipes && currentSession.recommendedRecipes.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5" />
                  Công thức chay được Bếp trưởng gợi ý trong phiên này:
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentSession.recommendedRecipes.map((rec, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-2xs"
                    >
                      <span className="font-bold">{rec}</span>
                      <Link
                        to={`/explore?keyword=${encodeURIComponent(rec)}`}
                        title="Tìm công thức trong thư viện"
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={`/restaurants?search=${encodeURIComponent(rec)}`}
                        title="Tìm quán chay có món này"
                        className="p-1 rounded text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 transition"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to="/blog/write"
                        state={{
                          recipeTitle: `[Công thức AI] ${rec}`,
                          recipeExcerpt: `Công thức chay sáng tạo "${rec}" được gợi ý từ Bếp Trưởng VEGEAI trong phiên tư vấn dinh dưỡng.`,
                          recipeContent: `## Món chay sáng tạo: ${rec}\n\n### 💡 Giới thiệu\nCông thức được Bếp Trưởng VEGEAI sáng tạo và tối ưu hóa dinh dưỡng thuần thực vật.\n\n### 🥗 Thành phần gợi ý\n- Nguyên liệu chính tươi sạch\n- Gia vị tự nhiên: muối hồng, tiêu thơm, dầu oliu, hạt nêm chay\n\n### 👨‍🍳 Hướng dẫn nấu ăn\n1. Sơ chế sạch các loại nguyên liệu.\n2. Nấu chín tới ở nhiệt độ thích hợp để giữ trọn vi chất dinh dưỡng.\n3. Trình bày và thưởng thức ngon miệng cùng gia đình.\n\n> ✨ *Công thức được tạo bởi AI Bếp Trưởng VEGEAI.*`,
                          recipeCategory: 'KITCHEN'
                        }}
                        title="Tạo bài viết Blog từ món này"
                        className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input Box */}
            <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              {error && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mb-3 font-semibold">{error}</p>
              )}

              {/* Image Preview Thumbnail */}
              {imagePreview && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative inline-block group">
                    <img
                      src={imagePreview}
                      alt="Ảnh đính kèm"
                      className="w-16 h-16 object-cover rounded-xl border-2 border-emerald-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 shadow-xs transition cursor-pointer"
                      title="Xoá ảnh"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Ảnh đã sẵn sàng. Bếp trưởng sẽ tự động phân tích nguyên liệu khi bạn bấm gửi.
                  </span>
                </div>
              )}
              
              
              {/* Quick Interactive Prompt Chips */}
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSubmitWithText('Hãy hiển thị vòng Ring hoạt động, tiến độ calo và thể trạng dinh dưỡng của tôi ngay trong đoạn chat này.')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-2xs"
                >
                  <span>⭕</span> Hiện Vòng Ring Thể Trạng
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitWithText('Hãy gửi cho tôi một lịch biểu thực đơn 7 ngày hoàn chỉnh có thể tương tác bấm chọn từng ngày và xem chi tiết các bữa ngay trong chat.')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800 transition cursor-pointer shadow-2xs"
                >
                  <span>📅</span> Lịch Biểu Thực Đơn Tuần
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitWithText('Tôi muốn kiểm tra và đồng bộ dữ liệu vòng đeo tay Google Fit (bước chân, calo vận động) trên VEGEAI. Bếp trưởng hãy giải thích ý nghĩa các chỉ số trên vòng Zen Rings và cách hệ thống tự động cân đối dinh dưỡng thích ứng theo mức vận động nhé!')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-800 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-800 transition cursor-pointer shadow-2xs"
                >
                  <span>⌚</span> Đồng Bộ Google Fit
                </button>

                <button
                  type="button"
                  onClick={handleFridgeQuickAction}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-800 transition cursor-pointer shadow-2xs"
                >
                  <span>🥗</span> Món Ngon Tủ Lạnh
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 sm:p-2.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="shrink-0 p-2 sm:p-2.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
                  title="Chụp ảnh hoặc chọn ảnh tủ lạnh / món ăn"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <textarea
                  ref={fieldRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  disabled={busy}
                  placeholder={imagePreview ? "Nhập thêm ghi chú hoặc câu hỏi về ảnh này (hoặc bấm gửi ngay)..." : "Nhập nguyên liệu, món muốn nấu hoặc gửi ảnh tủ lạnh..."}
                  className="w-full resize-none bg-transparent text-xs sm:text-sm p-1.5 outline-hidden text-slate-800 dark:text-white placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  disabled={busy || (!input.trim() && !selectedImage)}
                  className="shrink-0 w-10 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                </button>
              </form>

              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3 h-3 text-emerald-600" /> Hỗ trợ chụp ảnh hoặc tải ảnh tủ lạnh trực tiếp
                </span>
                <span>{input.length}/2000 ký tự</span>
              </div>
            </div>

          </section>

        </div>

        {/* Guest Quota Exceeded Modal */}
        {showQuotaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Trải nghiệm trọn vẹn cùng VEGEAI
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bạn đã sử dụng hết <strong>3 lượt tư vấn thử nghiệm</strong> cho khách vãng lai hôm nay. Hãy đăng ký hoặc đăng nhập tài khoản miễn phí để tiếp tục trò chuyện không giới hạn với AI Bếp Trưởng, lưu kế hoạch thực đơn và đồng bộ tủ lạnh!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/login"
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition text-center"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition text-center shadow-xs"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setShowQuotaModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer pt-1"
              >
                Để sau
              </button>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
