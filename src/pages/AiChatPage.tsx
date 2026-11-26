import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  RotateCcw,
  X
} from 'lucide-react';
import { compressImageForUpload } from '../utils/fridgeImageCompress';
import { MainLayout } from '../layouts/MainLayout';
import { aiService } from '../services/aiService';
import { ApiError, errorMessage } from '../services/apiClient';
import {
  GUEST_CHAT_STORAGE_KEY,
  chatSessionsKey,
  clearChatSessions,
  readChatSessions,
  stashChatHandoff,
  takeChatHandoff,
  writeChatSessions
} from '../features/ai/chatSessionStore';
import { useAuth } from '../hooks/useAuth';
import {
  ChatMealScheduleCardView,
  ChatActivityRingsView
} from '../components/ChatInteractiveWidgets';
import type {
  ChatMealScheduleCardData,
  ChatActivityRingsCardData
} from '../components/ChatInteractiveWidgets';
import { ChatFridgeScanCardView } from '../components/ChatFridgeScanCardView';
import {
  buildFridgeChefInitialPrompt,
  buildFridgeContextData,
  collectScanImageUrls,
  inferIngredientUnit,
  isIngredientAllowedForDiet,
  mergeFridgeItems,
  safeChatImageUrl,
  type ChatFridgeScanCardData,
  type ChatFridgeScanItem,
  type FridgeChatHandoffState
} from '../features/ai/fridgeChatBridge';
import { DEFAULT_WEEKLY_SCHEDULE } from '../data/weeklyScheduleData';
import type { ScheduledDayPlan, ScheduledMealItem } from '../data/weeklyScheduleData';
import { wearableService } from '../utils/wearableService';
import { userService } from '../services/userService';
import { fridgeService } from '../services/fridgeService';
import { mealPlanService } from '../services/mealPlanService';
import type { MealPlan, PlannedMeal } from '../types/mealPlan';

const VIETNAMESE_WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatScheduleDayName(dateStr: string, dayNumber: number): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return `Ngày ${dayNumber}`;
  const weekday = VIETNAMESE_WEEKDAYS[parsed.getDay()];
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${weekday} (${day}/${month})`;
}

function toScheduledMeal(meal: PlannedMeal | undefined, fallbackCategory: string): ScheduledMealItem {
  if (!meal) {
    return {
      name: 'Chưa xếp món',
      calories: 0,
      protein: 0,
      category: fallbackCategory,
    };
  }
  return {
    name: meal.title,
    calories: Math.round(meal.nutrition?.calories || 0),
    protein: Math.round(meal.nutrition?.protein || 0),
    category: fallbackCategory,
    description: meal.portions > 1 ? `${meal.portions} khẩu phần` : undefined,
  };
}

function mapMealPlanToScheduleCard(plan: MealPlan, fallbackCalories: number): ChatMealScheduleCardData | null {
  const planDays = plan?.plan?.days;
  if (!Array.isArray(planDays) || planDays.length === 0) return null;
  const targetCalories = Math.round(plan.plan.targets?.dailyCaloriesTarget || fallbackCalories);
  const days: ScheduledDayPlan[] = planDays.slice(0, 7).map((day, index) => {
    const sortedMeals = [...(day.meals || [])].sort((a, b) => a.slot - b.slot);
    const breakfast = sortedMeals.find(m => m.slot === 0) || sortedMeals[0];
    const lunch = sortedMeals.find(m => m.slot === 1) || sortedMeals[1] || sortedMeals[0];
    const dinner = sortedMeals.find(m => m.slot === 2) || sortedMeals[sortedMeals.length - 1] || sortedMeals[0];
    return {
      dayName: formatScheduleDayName(day.date, index + 1),
      dayIndex: index + 1,
      targetCal: Math.round(day.totals?.calories || targetCalories),
      breakfast: toScheduledMeal(breakfast, 'Bữa sáng'),
      lunch: toScheduledMeal(lunch, 'Bữa trưa'),
      dinner: toScheduledMeal(dinner, 'Bữa tối'),
    };
  });
  return {
    weekTitle: plan.status === 'SAVED'
      ? 'Thực đơn đã lưu từ Kế hoạch bữa ăn của bạn'
      : 'Thực đơn nháp gần nhất của bạn',
    targetCalories,
    days,
  };
}
import { BlogBody } from '../components/BlogUi';
import { calculateBmr, calculateTdee, calculateExactAge } from '../utils/nutritionProfile';

export type SessionCategory = 'fridge-scan' | 'ai-chef';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  image?: string;
  fridgeScanCard?: ChatFridgeScanCardData;
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
  fridgeContext?: {
    items: ChatFridgeScanItem[];
    images: string[];
    warnings?: string[];
  };
  updatedAt: number;
}

function SafeChatBubbleImage({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  const safe = safeChatImageUrl(src);
  if (!safe || broken) return null;
  const imgEl = (
    <img
      src={safe}
      alt="Ảnh đính kèm"
      onError={() => setBroken(true)}
      className="w-full h-auto object-cover max-h-56 rounded-lg"
    />
  );
  return (
    <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20 max-w-xs shadow-xs">
      {safe.startsWith('data:') ? (
        imgEl
      ) : (
        <a href={safe} target="_blank" rel="noreferrer" title="Mở ảnh gốc">
          {imgEl}
        </a>
      )}
    </div>
  );
}

const DEFAULT_SUGGESTIONS = [
  { icon: Sparkles, title: '⭕ Hiện vòng Ring & Thể trạng hôm nay', text: 'Hãy hiển thị vòng Ring hoạt động, tiến độ calo và thể trạng dinh dưỡng của tôi ngay trong đoạn chat này.' },
  { icon: Sparkles, title: '📅 Gửi lịch biểu thực đơn 7 ngày tương tác', text: 'Hãy gửi cho tôi một lịch biểu thực đơn 7 ngày hoàn chỉnh có thể tương tác bấm chọn từng ngày và xem chi tiết các bữa ngay trong chat.' },
  { icon: Sparkles, title: '⌚ Đồng bộ thiết bị đeo & Google Fit', text: 'Tôi muốn kiểm tra và đồng bộ dữ liệu Google Fit (bước chân, tổng tiêu hao, quãng đường) trên VEGEAI. Bếp trưởng hãy giải thích ý nghĩa 3 vòng tiến độ dinh dưỡng Zen Rings và cách hệ thống cân đối thực đơn theo mức vận động nhé!' },
  { icon: Soup, title: '🥗 Món ngon từ kho tủ lạnh', text: 'CHECK_FRIDGE_AUTO' },
];
function formatTime(timestamp: number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function AiChatPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Keep account history isolated from guest history: each account reads only its own key,
  // guests read only the guest key, so a shared machine can never show the other side.
  const storageKey = chatSessionsKey(user?.id);
  const loadedStorageKeyRef = useRef('');
  const skipNextPersistRef = useRef(false);
  const pendingHandoffRef = useRef<{ session: ChatSession; draft: string } | null>(null);

  // Guest conversations are intentionally ephemeral. They must disappear when
  // the guest leaves the chef page and must never leak into a later visit.
  useEffect(() => {
    if (user?.id) return;
    return () => clearChatSessions(localStorage, GUEST_CHAT_STORAGE_KEY);
  }, [user?.id]);

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const stored = readChatSessions<ChatSession>(localStorage, storageKey);
    if (stored) return stored;
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
    if (!user?.id) return null;
    try {
      const stored = localStorage.getItem(`vegeai_user_profile:${user.id}`) || localStorage.getItem('vegeai_user_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed?.userId || parsed.userId === user.id) return parsed;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      if (!user?.id) {
        setUserProfile(null);
        return;
      }
      try {
        const stored = localStorage.getItem(`vegeai_user_profile:${user.id}`) || localStorage.getItem('vegeai_user_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!parsed?.userId || parsed.userId === user.id) setUserProfile(parsed);
        }
      } catch {}
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }
    userService.getProfile().then(p => {
      setUserProfile(p);
      try {
        localStorage.setItem(`vegeai_user_profile:${user.id}`, JSON.stringify(p));
        localStorage.setItem('vegeai_user_profile', JSON.stringify(p));
      } catch {}
    }).catch(() => {});
  }, [user?.id]);

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingRetry, setPendingRetry] = useState<{
    localSessionId: string;
    backendSessionId?: string;
    prompt: string;
    history?: { role: 'user' | 'model'; text: string }[];
    context?: { contextScreen?: string; contextData?: string };
    extraRecipes?: string[];
  } | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  // Route the guest must return to after logging in from a fridge/scan prompt.
  const [fridgeLoginFrom, setFridgeLoginFrom] = useState<string | null>(null);
  const [resumedAfterLogin, setResumedAfterLogin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    const nextSessions = readChatSessions<ChatSession>(localStorage, storageKey) ?? [{
      id: 'default-welcome',
      title: 'Chào mừng bạn đến với Bếp trưởng',
      category: 'ai-chef' as const,
      messages: [{
        sender: 'ai' as const,
        text: 'Xin chào! Tôi là Bếp trưởng VEGEAI. Tôi có thể giúp bạn lên thực đơn chay, phân tích nguyên liệu từ tủ lạnh, hoặc hướng dẫn nấu các món chay bổ dưỡng và ngon miệng. Hôm nay bạn muốn nấu gì?',
        time: formatTime(Date.now())
      }],
      updatedAt: Date.now()
    }];
    skipNextPersistRef.current = true;
    loadedStorageKeyRef.current = storageKey;
    setSessions(nextSessions);
    setActiveSessionId(previousId => nextSessions.some(s => s.id === previousId) ? previousId : nextSessions[0].id);
    setActiveTabCategory('all');
    setError('');
  }, [isAuthLoading, storageKey]);

  // Restore the conversation and the unanswered question kept while the guest logged in from
  // the "out of free turns" prompt, so the login round-trip leaves them exactly where they were.
  useEffect(() => {
    if (isAuthLoading || !user?.id) return;
    const handoff = takeChatHandoff<ChatSession>(sessionStorage);
    if (!handoff) return;
    pendingHandoffRef.current = null;
    const signature = (m: ChatMessage) => `${m.sender}|${m.time}|${m.text}`;
    setSessions(prev => {
      const existing = prev.find(s => s.id === handoff.session.id);
      if (!existing) return [handoff.session, ...prev];
      // Same session id (e.g. the default welcome session): keep the guest turns first and
      // append anything the account wrote in the meantime, without duplicating messages.
      const restored = new Set(handoff.session.messages.map(signature));
      const merged: ChatSession = {
        ...existing,
        ...handoff.session,
        messages: [...handoff.session.messages, ...existing.messages.filter(m => !restored.has(signature(m)))],
        updatedAt: Date.now()
      };
      return prev.map(s => (s.id === existing.id ? merged : s));
    });
    setActiveSessionId(handoff.session.id);
    setActiveTabCategory('all');
    if (handoff.draft) setInput(handoff.draft);
    setShowQuotaModal(false);
    setResumedAfterLogin(true);
  }, [isAuthLoading, user?.id]);

  // Handle cross-navigation from Blog/Community ("Hỏi sâu hơn với AI Chef")
  useEffect(() => {
    const state = location.state as {
      source?: string;
      title?: string;
      initialPrompt?: string;
      ingredients?: string[];
      scanItems?: ChatFridgeScanItem[];
      recipeContext?: any;
    } | null;

    if (
      !state?.initialPrompt ||
      state.source === 'fridge-scan' ||
      state.ingredients?.length ||
      state.scanItems?.length ||
      state.recipeContext
    ) {
      return;
    }

    const newSessionId = `handoff-${Date.now()}`;
    const sessionTitle = state.title || 'Tư vấn món ăn từ bài đăng';
    const newSession: ChatSession = {
      id: newSessionId,
      title: sessionTitle.length > 35 ? sessionTitle.slice(0, 32) + '...' : sessionTitle,
      category: 'ai-chef',
      messages: [
        {
          sender: 'ai',
          text: `Chào bạn! Tôi đã nắm được thông tin về "${state.title || 'bài đăng công thức'}". Hãy cho tôi biết bạn muốn tìm hiểu sâu hơn về bước nấu nào, cần thay thế nguyên liệu hay muốn cân đối dinh dưỡng theo thể trạng của bạn nhé!`,
          time: formatTime(Date.now()),
        }
      ],
      updatedAt: Date.now(),
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setInput(state.initialPrompt);

    // Clean up state so refresh doesn't trigger duplicate session
    try {
      window.history.replaceState({}, document.title);
    } catch {}
  }, [location.state]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.id) {
      e.target.value = '';
      setFridgeLoginFrom('/fridge-scan');
      return;
    }
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
    writeChatSessions(localStorage, storageKey, sessions);
  }, [isAuthLoading, sessions, storageKey]);

  // Current session
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentSession?.messages, busy]);

  // Handle incoming Hand-off from FridgeScanPage, VideoDetailPage, RecipeDetailPage, or BlogDetailPage
  const handledHandoffRef = useRef<string>('');
  useEffect(() => {
    if (isAuthLoading || loadedStorageKeyRef.current !== storageKey) return;
    const state = location.state as (Partial<FridgeChatHandoffState> & {
      source?: string;
      ingredients?: string[];
      title?: string;
      initialPrompt?: string;
      recipeContext?: {
        title: string;
        cookTimeMinutes?: number;
        estimatedCalories?: number;
        dietaryType?: string;
        ingredients?: string[];
        instructions?: string[];
        safetyNotes?: string[];
      };
    }) | null;

    if (!state) return;
    const stateFingerprint = JSON.stringify({
      s: state.source,
      t: state.title,
      p: state.initialPrompt,
      i: state.ingredients,
      imgs: state.scanImageUrls,
      saved: state.alreadySavedToFridge,
    });
    if (handledHandoffRef.current === stateFingerprint) return;

    // 1. Hand-off from FridgeScanPage
    const hasRichItems = Array.isArray(state.scanItems) && state.scanItems.length > 0;
    const hasNameItems = Array.isArray(state.ingredients) && state.ingredients.length > 0;
    if (hasRichItems || (state.source === 'fridge-scan' && hasNameItems) || hasNameItems) {
      handledHandoffRef.current = stateFingerprint;
      const scanItems: ChatFridgeScanItem[] = hasRichItems
        ? state.scanItems!
        : state.ingredients!.map((name) => ({
            name,
            category: 'VEGAN',
            isVegetarian: true,
            freshness: 'FRESH',
            quantity: 1,
            unit: 'phần',
          }));
      const scanImages = Array.from(
        new Set([
          ...((state.scanImageUrls || []).map((u) => safeChatImageUrl(u)).filter((u): u is string => Boolean(u))),
          ...collectScanImageUrls(undefined, scanItems),
        ])
      );
      const userPromptText = state.initialPrompt || buildFridgeChefInitialPrompt(scanItems);
      const contextData = buildFridgeContextData(scanItems, state.warnings);
      const sessionTitle = state.title || `Quét tủ lạnh (${scanItems.length} món)`;
      const cardData: ChatFridgeScanCardData = {
        images: scanImages,
        items: scanItems,
        warnings: state.warnings ?? [],
        suggestedRecipes: state.suggestedRecipes ?? [],
        savedToFridge: Boolean(state.alreadySavedToFridge),
        savedSummary: state.alreadySavedToFridge ? 'Đã đồng bộ vào Kho Tủ Lạnh (/fridge)' : undefined,
      };

      const newSession: ChatSession = {
        id: `scan-${Date.now()}`,
        title: sessionTitle,
        category: 'fridge-scan',
        fridgeContext: {
          items: scanItems,
          images: scanImages,
          warnings: state.warnings ?? [],
        },
        messages: [
          {
            sender: 'user',
            text: userPromptText,
            fridgeScanCard: cardData,
            time: formatTime(Date.now())
          }
        ],
        updatedAt: Date.now()
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setActiveTabCategory('fridge-scan');

      setBusy(true);
      setError('');
      aiService.chat(userPromptText, undefined, undefined, {
        contextScreen: 'FRIDGE',
        contextData,
      })
        .then(res => {
          const mergedRecipes = Array.from(new Set([
            ...(res.recommendedRecipes || []),
            ...(state.suggestedRecipes || []),
          ]));
          setSessions(prev => prev.map(s => {
            if (s.id === newSession.id) {
              return {
                ...s,
                sessionId: res.sessionId,
                recommendedRecipes: mergedRecipes,
                messages: [
                  ...s.messages,
                  { sender: 'ai', text: res.reply, time: formatTime(Date.now()) }
                ],
                updatedAt: Date.now()
              };
            }
            return s;
          }));
        })
        .catch(err => {
          setError(errorMessage(err));
          setPendingRetry({
            localSessionId: newSession.id,
            prompt: userPromptText,
            context: {
              contextScreen: 'FRIDGE',
              contextData,
            },
            extraRecipes: state.suggestedRecipes || [],
          });
        })
        .finally(() => {
          setBusy(false);
          window.history.replaceState({}, document.title);
        });
      return;
    }

    // 2. Hand-off from Recipe / Video / Blog into a brand-new chat session
    if (state.initialPrompt || state.recipeContext) {
      handledHandoffRef.current = stateFingerprint;
      const rc = state.recipeContext;
      const sessionTitle = state.title || (rc?.title ? `Nấu: ${rc.title}` : 'Tư vấn công thức chay');
      const initialMessages: ChatMessage[] = [];

      if (rc) {
        const ingText = rc.ingredients && rc.ingredients.length > 0
          ? `\n• **Nguyên liệu (${rc.ingredients.length}):** ${rc.ingredients.join(', ')}`
          : '';
        const stepText = rc.instructions && rc.instructions.length > 0
          ? `\n• **Các bước chính:**\n${rc.instructions.map((st, idx) => `  ${idx + 1}. ${st.replace(/^Bước\s*\d+:\s*/i, '')}`).join('\n')}`
          : '';
        initialMessages.push({
          sender: 'ai',
          text: `🌿 **Đã mở phiên tư vấn mới cho món: ${rc.title}**\n• **Thời gian:** ${rc.cookTimeMinutes ?? 20} phút · **Năng lượng:** ~${rc.estimatedCalories ?? '--'} kcal/khẩu phần · **Chế độ:** ${rc.dietaryType || 'Thuần chay'}${ingText}${stepText}`,
          time: formatTime(Date.now())
        });
      }

      const userPromptText = state.initialPrompt || `Hãy tư vấn chi tiết hơn về món "${rc?.title || sessionTitle}" và cách chế biến giữ trọn dinh dưỡng nhé!`;
      initialMessages.push({
        sender: 'user',
        text: userPromptText,
        time: formatTime(Date.now())
      });

      const newSession: ChatSession = {
        id: `recipe-${Date.now()}`,
        title: sessionTitle,
        category: 'ai-chef',
        messages: initialMessages,
        updatedAt: Date.now()
      };

      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setActiveTabCategory('all');

      setBusy(true);
      setError('');
      const historyForAi = initialMessages.slice(0, -1).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text.slice(0, 4000)
      }));

      aiService.chat(userPromptText, undefined, historyForAi)
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
                ],
                updatedAt: Date.now()
              };
            }
            return s;
          }));
        })
        .catch(err => {
          setError(errorMessage(err));
          setPendingRetry({
            localSessionId: newSession.id,
            prompt: userPromptText,
            history: historyForAi,
          });
        })
        .finally(() => {
          setBusy(false);
          window.history.replaceState({}, document.title);
        });
    }
  }, [isAuthLoading, location.state, storageKey]);

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
    setPendingRetry(null);
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

  const handleFridgeQuickAction = async () => {
    if (!user?.id) {
      setFridgeLoginFrom('/ai-chef');
      return;
    }
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

  const [savingCardKey, setSavingCardKey] = useState<string | null>(null);
  const [saveCardErrors, setSaveCardErrors] = useState<Record<string, string>>({});

  const handleSaveScanCardToFridge = async (
    sessionId: string,
    messageIdx: number,
    card: ChatFridgeScanCardData
  ) => {
    const key = `${sessionId}:${messageIdx}`;
    if (savingCardKey || card.savedToFridge || !card.items.length) return;
    const allowedItems = card.items.filter((item) =>
      isIngredientAllowedForDiet(item, userProfile?.dietaryPreferences)
    );
    if (allowedItems.length === 0) {
      setSaveCardErrors((prev) => ({
        ...prev,
        [key]: 'Không có nguyên liệu phù hợp chế độ ăn hiện tại để lưu vào kho (đồ mặn, hỏng hoặc không khớp chế độ chay đã được bỏ qua).',
      }));
      return;
    }
    setSavingCardKey(key);
    setSaveCardErrors((prev) => ({ ...prev, [key]: '' }));
    try {
      const saved = await fridgeService.confirmScan({
        summary: `Lưu từ AI Bếp Trưởng (${allowedItems.length} nguyên liệu)`,
        totalItemsDetected: allowedItems.length,
        hasNonVegetarianItem: false,
        scannedAt: new Date().toISOString(),
        scanImageUrl: card.images[0],
        ingredients: allowedItems,
      });
      const summaryLabel = `Đã lưu ${saved.totalProcessed} món (${saved.newlyAddedCount} mới, ${saved.updatedExistingCount} cập nhật)`;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const nextMessages = [...s.messages];
          const target = nextMessages[messageIdx];
          if (target?.fridgeScanCard) {
            nextMessages[messageIdx] = {
              ...target,
              fridgeScanCard: {
                ...target.fridgeScanCard,
                savedToFridge: true,
                savedSummary: summaryLabel,
              },
            };
          }
          return { ...s, messages: nextMessages, updatedAt: Date.now() };
        })
      );
    } catch (err) {
      setSaveCardErrors((prev) => ({ ...prev, [key]: errorMessage(err) }));
    } finally {
      setSavingCardKey(null);
    }
  };

  const handleAddManualIngredientToCard = (
    sessionId: string,
    messageIdx: number,
    ingredientName: string
  ) => {
    const cleaned = ingredientName.trim();
    if (!cleaned) return;
    const newItem: ChatFridgeScanItem = {
      name: cleaned,
      category: 'VEGAN',
      isVegetarian: true,
      freshness: 'FRESH',
      quantity: 1,
      unit: inferIngredientUnit(cleaned),
    };
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const nextMessages = [...s.messages];
        const target = nextMessages[messageIdx];
        if (!target?.fridgeScanCard) return s;
        const nextCardItems = mergeFridgeItems(target.fridgeScanCard.items, [newItem]);
        nextMessages[messageIdx] = {
          ...target,
          fridgeScanCard: {
            ...target.fridgeScanCard,
            items: nextCardItems,
            savedToFridge: false,
            savedSummary: undefined,
          },
        };
        const nextContextItems = mergeFridgeItems(s.fridgeContext?.items || nextCardItems, [newItem]);
        return {
          ...s,
          fridgeContext: {
            items: nextContextItems,
            images: s.fridgeContext?.images || target.fridgeScanCard.images || [],
            warnings: s.fridgeContext?.warnings || target.fridgeScanCard.warnings || [],
          },
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const retryPendingChat = async () => {
    if (!pendingRetry || busy) return;
    const retryPayload = pendingRetry;
    setBusy(true);
    setError('');
    try {
      const res = await aiService.chat(
        retryPayload.prompt,
        retryPayload.backendSessionId,
        retryPayload.history,
        retryPayload.context
      );
      setPendingRetry(null);
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== retryPayload.localSessionId) return s;
          const combined = Array.from(
            new Set([
              ...(res.recommendedRecipes || []),
              ...(retryPayload.extraRecipes || []),
            ])
          );
          return {
            ...s,
            sessionId: res.sessionId,
            recommendedRecipes: combined.length > 0 ? combined : s.recommendedRecipes,
            messages: [
              ...s.messages,
              { sender: 'ai', text: res.reply, time: formatTime(Date.now()) },
            ],
            updatedAt: Date.now(),
          };
        })
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
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
    const optimisticMsgTime = formatTime(Date.now());
    const previousTitle = currentSession.title;
    const previousCategory = currentSession.category;

    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setPendingRetry(null);
    setBusy(true);
    setError('');

    const userMsg: ChatMessage = {
      sender: 'user',
      text: userText || (currentImg ? 'Đã gửi ảnh nguyên liệu / tủ lạnh để nhờ Bếp Trưởng tư vấn' : ''),
      image: currentImgPreview || undefined,
      time: optimisticMsgTime,
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

    let finalPrompt = userText;
    let detectedRecipes: string[] = [];
    let chatContext: { contextScreen?: string; contextData?: string } | undefined =
      currentSession.category === 'fridge-scan' && currentSession.fridgeContext?.items?.length
        ? {
            contextScreen: 'FRIDGE',
            contextData: buildFridgeContextData(
              currentSession.fridgeContext.items,
              currentSession.fridgeContext.warnings
            ),
          }
        : undefined;
    let messageCommittedWithScan = false;
    const history = currentSession.messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      text: m.text.slice(0, 4000)
    }));

    try {
      if (currentImg) {
        setIsAnalyzingImage(true);
        try {
          const optimizedImage = await compressImageForUpload(currentImg);
          const scanRes = await aiService.scanFridge(optimizedImage);
          const persistedImgUrl = safeChatImageUrl(scanRes?.scanImageUrl);
          if (scanRes.isFoodScene === false) {
            if (!userText) {
              const directReason =
                scanRes.summary?.trim() ||
                scanRes.warnings?.[0]?.trim() ||
                'Hình ảnh tải lên không phải khung cảnh tủ lạnh hoặc nguyên liệu thực phẩm.';
              const directReply = `🌿 ${directReason}\n\nBạn hãy chụp rõ nguyên liệu nấu ăn (rau củ, đậu hũ, nấm hoặc ngăn tủ lạnh đủ sáng) để Bếp trưởng phân tích và gợi ý món chay chuẩn xác nhé!`;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSession.id) return s;
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].sender === 'user') {
                    // Drop heavy inline base64 preview for rejected non-food images to protect localStorage quota
                    msgs[lastIdx] = { ...msgs[lastIdx], image: undefined };
                  }
                  return {
                    ...s,
                    messages: [...msgs, { sender: 'ai', text: directReply, time: formatTime(Date.now()) }],
                    updatedAt: Date.now(),
                  };
                })
              );
              return;
            }
            finalPrompt = `Tôi vừa gửi ảnh nhưng AI nhận diện đây không phải cảnh nguyên liệu hay tủ lạnh. Câu hỏi thêm của tôi: ${userText}`;
          } else if (scanRes && scanRes.ingredients && scanRes.ingredients.length > 0) {
            const isNonFood = (name: string) => {
              const l = name.toLowerCase();
              return l.includes('củi') || l.includes('que củi') || l.includes('cành cây') || l.includes('sỏi đá') || l.includes('rác') || l.includes('hoạt hình');
            };
            const edibleIngredients = scanRes.ingredients.filter(
              (i) => i.isEdible !== false && i.category !== 'NON_FOOD' && !isNonFood(i.name)
            );
            const saveableIngredients = edibleIngredients.filter((i) =>
              isIngredientAllowedForDiet(i, userProfile?.dietaryPreferences)
            );
            const nonFoodIngredients = scanRes.ingredients.filter(
              (i) => i.isEdible === false || i.category === 'NON_FOOD' || isNonFood(i.name)
            );

            if (edibleIngredients.length > 0) {
              const ingNames = edibleIngredients.map(i => i.name).join(', ');
              detectedRecipes = scanRes.suggestedRecipes || [];
              const fridgeItemsForCard = saveableIngredients.length > 0 ? saveableIngredients : edibleIngredients;
              const serverImages = persistedImgUrl ? [persistedImgUrl] : [];
              const previousContextItems =
                currentSession.category === 'fridge-scan' ? (currentSession.fridgeContext?.items || []) : [];
              const mergedContextItems = mergeFridgeItems(previousContextItems, fridgeItemsForCard);
              const mergedContextImages = Array.from(
                new Set([
                  ...(currentSession.category === 'fridge-scan' ? (currentSession.fridgeContext?.images || []) : []),
                  ...serverImages,
                ])
              );
              const mergedWarnings = Array.from(
                new Set([
                  ...(currentSession.category === 'fridge-scan' ? (currentSession.fridgeContext?.warnings || []) : []),
                  ...(scanRes.warnings ?? []),
                ])
              );
              chatContext = {
                contextScreen: 'FRIDGE',
                contextData: buildFridgeContextData(mergedContextItems, mergedWarnings),
              };
              const scanCard: ChatFridgeScanCardData = {
                images: serverImages,
                items: fridgeItemsForCard,
                warnings: scanRes.warnings ?? [],
                suggestedRecipes: detectedRecipes,
                savedToFridge: false,
              };
              messageCommittedWithScan = true;

              // Replace heavy base64 preview with lightweight server scanImageUrl & attach interactive scan card
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id !== currentSession.id) return s;
                  const msgs = [...s.messages];
                  const lastIdx = msgs.length - 1;
                  if (lastIdx >= 0 && msgs[lastIdx].sender === 'user') {
                    msgs[lastIdx] = {
                      ...msgs[lastIdx],
                      image: serverImages.length > 0 ? undefined : msgs[lastIdx].image,
                      fridgeScanCard: scanCard,
                    };
                  }
                  return {
                    ...s,
                    fridgeContext: {
                      items: mergedContextItems,
                      images: mergedContextImages,
                      warnings: mergedWarnings,
                    },
                    messages: msgs,
                    updatedAt: Date.now(),
                  };
                })
              );

              let promptIntro = userText
                ? `Tôi vừa gửi thêm ảnh tủ lạnh/món ăn. AI thị giác nhận diện được: ${ingNames}. Yêu cầu của tôi: ${userText}`
                : previousContextItems.length > 0
                ? `Tôi vừa quét bổ sung thêm ngăn tủ mới gồm: ${ingNames}. Tổng hợp tất cả ${mergedContextItems.length} nguyên liệu đã quét trong phiên này: ${mergedContextItems
                    .slice(0, 18)
                    .map((i) => i.name)
                    .join(', ')}. Hãy gợi ý 3 món chay ngon nhất kết hợp các nguyên liệu đang có nhé!`
                : buildFridgeChefInitialPrompt(fridgeItemsForCard);
              if (nonFoodIngredients.length > 0) {
                promptIntro += ` (Lưu ý: Có vật phẩm trong ảnh không ăn được đã được AI tự động loại trừ: ${nonFoodIngredients.map(i => i.name).join(', ')}).`;
              }
              finalPrompt = promptIntro.length > 1900 ? `${promptIntro.slice(0, 1897)}...` : promptIntro;
            } else if (nonFoodIngredients.length > 0) {
              if (persistedImgUrl) {
                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id !== currentSession.id) return s;
                    const msgs = [...s.messages];
                    const lastIdx = msgs.length - 1;
                    if (lastIdx >= 0 && msgs[lastIdx].sender === 'user') {
                      msgs[lastIdx] = { ...msgs[lastIdx], image: persistedImgUrl };
                    }
                    return { ...s, messages: msgs };
                  })
                );
              }
              const nonFoodNames = nonFoodIngredients.map(i => i.name).join(', ');
              finalPrompt = `Tôi vừa tải lên một hình ảnh và AI nhận diện thấy các vật thể: ${nonFoodNames}. Những thứ này KHÔNG phải là nguyên liệu thực phẩm ăn được để nấu ăn (ví dụ như củi khô, tranh vẽ hoạt hình, hoặc đồ dùng gia đình). Bếp trưởng hãy giải thích lịch sự rằng những vật phẩm này không ăn được và hướng dẫn tôi chụp ảnh nguyên liệu rau củ quả, đậu hũ hoặc thực phẩm ăn được thực tế.`;
            } else {
              finalPrompt = userText || 'Tôi vừa gửi ảnh nguyên liệu nấu ăn, hãy tư vấn giúp tôi các món chay thơm ngon phù hợp.';
            }
          } else {
            finalPrompt = userText || 'Tôi vừa gửi ảnh nguyên liệu nấu ăn, hãy tư vấn giúp tôi các món chay thơm ngon phù hợp.';
          }
        } finally {
          setIsAnalyzingImage(false);
        }
      }

      // Backend GeminiAiService.buildUserHealthContext already injects active fridge inventory (or empty state)
      // for authenticated members, so avoid redundant client-side /fridge/items fetches and duplicate prompt lists.
      
      // Check for interactive rich cards requests
      const isSchedule = /lịch\s*biểu|thực\s*đơn\s*tuần|kế\s*hoạch.*(tuần|7\s*ngày)|thời\s*khóa\s*biểu|menu\s*tuần|lên\s*lịch/i.test(userText);
      const isRings = /vòng\s*ring|ring|vòng\s*tròn|chỉ\s*số.*(sức\s*khỏe|thể\s*trạng)|tiến\s*độ\s*calo|hoạt\s*động\s*của\s*tôi|zen\s*ring/i.test(userText);
      const isWearable = /google\s*fit|vòng\s*đeo\s*tay|đồng\s*hồ|xiaomi\s*band|mi\s*fitness|bước\s*chân|thiết\s*bị\s*đeo/i.test(userText);

      let attachedScheduleCard: ChatMealScheduleCardData | undefined = undefined;
      let attachedRingsCard: ChatActivityRingsCardData | undefined = undefined;

      // Deterministic user health metrics matching AccountSettingsPage
      const hNum = userProfile?.heightCm ? Number(userProfile.heightCm) : 0;
      const wNum = userProfile?.weightKg ? Number(userProfile.weightKg) : 0;
      const age = calculateExactAge(userProfile?.dateOfBirth, userProfile?.age || 25);
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
        let loadedPlanCard: ChatMealScheduleCardData | null = null;
        if (user?.id) {
          try {
            const page = await mealPlanService.list(0);
            const latestSummary = page.items?.[0];
            if (latestSummary?.id) {
              const fullPlan = await mealPlanService.get(latestSummary.id);
              loadedPlanCard = mapMealPlanToScheduleCard(fullPlan, effectiveCalorieTarget);
            }
          } catch (planErr) {
            console.debug('[AI-CHAT] Could not load saved meal plan, using sample schedule:', planErr);
          }
        }
        attachedScheduleCard = loadedPlanCard ?? {
          weekTitle: 'Thực đơn mẫu 7 ngày thuần thực vật (tham khảo)',
          targetCalories: effectiveCalorieTarget,
          days: DEFAULT_WEEKLY_SCHEDULE
        };
      }

      if (isRings || isWearable) {
        const w = wearableService.getMetrics();

        attachedRingsCard = {
          calories: 0,
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
          wearableKcal: w.todayActiveCalories,
          totalCalories: w.totalCaloriesExpended,
          distanceKm: w.distanceKm,
          isConnected: w.isConnected,
          source: w.source,
          lastSyncedAt: w.lastSyncedAt,
          advice: w.aiAdvice
        };
      }

      const response = await aiService.chat(finalPrompt, currentSession.sessionId, history, chatContext);

      let replyText = response.reply;
      if (isWearable || isRings) {
        replyText = replyText.replace(/tính năng đồng bộ dữ liệu thời gian thực từ thiết bị đeo.*khung chat này\.?/gi, '').trim();
        replyText = replyText.replace(/mình hỗ trợ các chủ đề về ăn chay, công thức và tính năng của vegeai\.? bạn có muốn tìm một món chay phù hợp hôm nay không\??/gi, '').trim();
        if (!replyText || replyText.length < 20) {
          replyText = 'VEGEAI hỗ trợ kết nối trực tiếp với **Google Fit** (từ điện thoại hoặc thiết bị đeo thông minh) để lấy số bước chân, tổng tiêu hao và quãng đường thực tế, kết hợp cùng **biểu đồ 3 vòng Zen Rings** theo dõi tiến độ dinh dưỡng hôm nay (Đỏ: Calo nạp · Xanh lá: Đạm thực vật · Xanh lam: Chất xơ). Bạn có thể bấm **"Đồng bộ Google Fit"** ngay trên thẻ bên dưới hoặc mở **"Hồ sơ & Thể trạng"** để xem chi tiết lịch biểu 7 ngày.';
        }
      }

      if (isSchedule && !replyText.includes('Lịch biểu thực đơn tuần')) {
        replyText = '🌿 Dạ, tôi đã gửi ngay cho bạn **Lịch biểu thực đơn tuần 7 ngày tương tác** bên dưới! Bạn có thể nhấp chọn từng ngày từ Thứ Hai đến Chủ Nhật, xem chi tiết 3 bữa ăn kèm năng lượng calo & đạm thực vật, hoặc bấm "Đổi món" và "Đi chợ" trực tiếp ngay trong chat nhé.\n\n' + replyText;
      } else if ((isRings || isWearable) && !replyText.includes('Zen Rings')) {
        replyText = '✨ Đây là **biểu đồ tiến độ dinh dưỡng Zen Rings** (Đỏ: Calo nạp hôm nay · Xanh lá: Đạm thực vật · Xanh lam: Chất xơ) kèm dữ liệu vận động **Google Fit** của bạn ngay bên dưới!\n\n' + replyText;
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
      // The guest trial limit is a stable contract (429 + GUEST_AI_QUOTA_EXCEEDED 1402).
      const quotaExceeded = err instanceof ApiError && (err.code === 1402 || err.status === 429);
      if (quotaExceeded && !user?.id) {
        // Keep the conversation and the question the guest was about to send, so the
        // login round-trip returns them to exactly the same place.
        pendingHandoffRef.current = { session: currentSession, draft: userText };
        setShowQuotaModal(true);
        const quotaMsg = {
          sender: 'ai' as const,
          text: '🌿 Bạn đã dùng hết lượt trò chuyện nhanh miễn phí hôm nay. Hãy đăng nhập hoặc tạo tài khoản VEGEAI miễn phí để tiếp tục trò chuyện không giới hạn với mình nhé!',
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
        if (messageCommittedWithScan) {
          setInput('');
          setPendingRetry({
            localSessionId: currentSession.id,
            backendSessionId: currentSession.sessionId,
            prompt: finalPrompt,
            history,
            context: chatContext,
            extraRecipes: detectedRecipes,
          });
        } else {
          // Roll back optimistic user bubble and restore draft + attachment so retry never duplicates
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== currentSession.id) return s;
              const msgs = [...s.messages];
              const lastIdx = msgs.length - 1;
              const matchesOptimistic =
                lastIdx >= 0 &&
                msgs[lastIdx].sender === 'user' &&
                msgs[lastIdx].time === optimisticMsgTime &&
                msgs[lastIdx].text === userMsg.text;
              return {
                ...s,
                title: previousTitle,
                category: previousCategory,
                messages: matchesOptimistic ? msgs.slice(0, -1) : msgs,
              };
            })
          );
          setInput(userText);
          if (currentImg) {
            setSelectedImage(currentImg);
            setImagePreview(currentImgPreview);
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // Dashboard / fridge / meal-plan shortcuts land here with ?prompt=... — send it once so the
  // button actually does what it promises, then strip the query so a refresh does not resend it.
  const promotedPromptRef = useRef('');
  useEffect(() => {
    if (isAuthLoading) return;
    const prompt = new URLSearchParams(location.search).get('prompt');
    if (!prompt || promotedPromptRef.current === prompt) return;
    promotedPromptRef.current = prompt;
    window.history.replaceState(window.history.state, '', '/ai-chef');
    handleSubmitWithText(prompt);
  }, [isAuthLoading, location.search]);

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

        {/* Guest trial reminder + resumed-conversation confirmation */}
        {resumedAfterLogin && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start sm:items-center gap-2.5">
            <ChefHat className="w-4 h-4 shrink-0" />
            <span>
              Bạn đã đăng nhập. Cuộc trò chuyện và câu hỏi đang viết dở được giữ nguyên — bấm gửi để tiếp tục.
            </span>
            <button
              type="button"
              onClick={() => setResumedAfterLogin(false)}
              className="ml-auto text-emerald-700/70 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-100 cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
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
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        setError('');
                        setPendingRetry(prev => (prev?.localSessionId === sess.id ? prev : null));
                      }}
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
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
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
                    {msg.fridgeScanCard && (
                      <ChatFridgeScanCardView
                        card={msg.fridgeScanCard}
                        canSaveToFridge={Boolean(user?.id)}
                        saving={savingCardKey === `${currentSession.id}:${idx}`}
                        saveError={saveCardErrors[`${currentSession.id}:${idx}`] || ''}
                        onSaveToFridge={() => handleSaveScanCardToFridge(currentSession.id, idx, msg.fridgeScanCard!)}
                        onAskCookPriority={(priorityPrompt) => handleSubmitWithText(priorityPrompt)}
                        onScanMoreInChat={() => fileInputRef.current?.click()}
                        onAddManualIngredient={(name) =>
                          handleAddManualIngredientToCard(currentSession.id, idx, name)
                        }
                      />
                    )}
                    {msg.image && !msg.fridgeScanCard?.images?.length && (
                      <SafeChatBubbleImage src={msg.image} />
                    )}
                    {msg.sender === 'user' ? (
                      <div className="whitespace-pre-wrap font-sans break-words">{msg.text}</div>
                    ) : (
                      <div className="font-sans break-words text-slate-800 dark:text-slate-100">
                        <BlogBody content={msg.text} />
                      </div>
                    )}

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
                            let token = wearableService.getStoredToken();
                            if (!token) {
                              token = await wearableService.openGoogleFitAuthPopup();
                            }
                            await wearableService.fetchGoogleFitLive(token);
                            const fresh = wearableService.getMetrics();
                            setSessions(prev => prev.map(s => {
                              if (s.id !== activeSessionId) return s;
                              const newMsgs = [...s.messages];
                              if (newMsgs[idx]?.activityRingsCard) {
                                newMsgs[idx] = {
                                  ...newMsgs[idx],
                                  activityRingsCard: {
                                    ...newMsgs[idx].activityRingsCard!,
                                    steps: fresh.steps,
                                    wearableKcal: fresh.todayActiveCalories,
                                    totalCalories: fresh.totalCaloriesExpended,
                                    distanceKm: fresh.distanceKm,
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
                      <button
                        type="button"
                        onClick={() =>
                          handleSubmitWithText(
                            `Hãy hướng dẫn tôi công thức chi tiết và các bước nấu món "${rec}" từ nguyên liệu vừa quét nhé!`
                          )
                        }
                        title="Hỏi Bếp trưởng cách nấu món này"
                        className="font-bold text-left hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                      >
                        {rec}
                      </button>
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/90 dark:bg-rose-950/40 px-3 py-2">
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{error}</p>
                  {pendingRetry?.localSessionId === currentSession?.id && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={retryPendingChat}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 px-2.5 py-1 text-[11px] font-bold text-white transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Thử hỏi lại Bếp trưởng
                    </button>
                  )}
                </div>
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
                  onClick={() => {
                    if (!user?.id) {
                      navigate('/login', { state: { from: '/ai-chef' } });
                      return;
                    }
                    handleSubmitWithText('Hãy hiển thị vòng Ring hoạt động, tiến độ calo và thể trạng dinh dưỡng của tôi ngay trong đoạn chat này.');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-2xs"
                >
                  <span>⭕</span> Hiện Vòng Ring Thể Trạng
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!user?.id) {
                      navigate('/login', { state: { from: '/ai-chef' } });
                      return;
                    }
                    handleSubmitWithText('Hãy gửi cho tôi một lịch biểu thực đơn 7 ngày hoàn chỉnh có thể tương tác bấm chọn từng ngày và xem chi tiết các bữa ngay trong chat.');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800 transition cursor-pointer shadow-2xs"
                >
                  <span>📅</span> Lịch Biểu Thực Đơn Tuần
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!user?.id) {
                      navigate('/login', { state: { from: '/ai-chef' } });
                      return;
                    }
                    handleSubmitWithText('Tôi muốn kiểm tra và đồng bộ dữ liệu Google Fit (bước chân, tổng tiêu hao, quãng đường) trên VEGEAI. Bếp trưởng hãy giải thích ý nghĩa 3 vòng tiến độ dinh dưỡng Zen Rings và cách hệ thống cân đối thực đơn theo mức vận động nhé!');
                  }}
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

                <Link
                  to="/smart-market"
                  state={{
                    recipeTitle: currentSession?.title || 'Nguyên liệu từ AI Bếp Trưởng',
                    ingredients:
                      currentSession?.fridgeContext?.items && currentSession.fridgeContext.items.length > 0
                        ? currentSession.fridgeContext.items.map((item) => item.name)
                        : (location.state as { recipeContext?: { ingredients?: string[] } } | null)?.recipeContext
                            ?.ingredients || undefined,
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-2xs"
                >
                  <span>📍</span> Tìm Nơi Bán Nguyên Liệu &amp; Quán Chay (GPS)
                </Link>
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
                  onClick={() => {
                    if (!user?.id) {
                      setFridgeLoginFrom('/fridge-scan');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={busy}
                  className="shrink-0 p-2 sm:p-2.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
                  title={user?.id ? 'Chụp ảnh hoặc chọn ảnh tủ lạnh / món ăn' : 'Đăng nhập để quét ảnh tủ lạnh'}
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
                Hãy đăng nhập hoặc đăng ký tài khoản miễn phí để tiếp tục trò chuyện không giới hạn với AI Bếp Trưởng, lưu kế hoạch thực đơn và đồng bộ tủ lạnh!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/login"
                  state={{ from: '/ai-chef' }}
                  onClick={() => {
                    if (pendingHandoffRef.current) {
                      stashChatHandoff(sessionStorage, pendingHandoffRef.current);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition text-center"
                >
                  Đăng nhập &amp; tiếp tục
                </Link>
                <Link
                  to="/register"
                  state={{ from: '/ai-chef' }}
                  onClick={() => {
                    if (pendingHandoffRef.current) {
                      stashChatHandoff(sessionStorage, pendingHandoffRef.current);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition text-center shadow-xs"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  pendingHandoffRef.current = null;
                  setShowQuotaModal(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer pt-1"
              >
                Để sau
              </button>
            </div>
          </div>
        )}

        {/* Fridge features are account-only: prompt before any upload happens. */}
        {fridgeLoginFrom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-xs">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Đăng nhập để dùng Tủ lạnh thông minh
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Quét ảnh tủ lạnh, lưu nguyên liệu và nhận gợi ý món ăn cá nhân hóa cần một tài khoản VEGEAI miễn phí.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to="/login"
                  state={{ from: fridgeLoginFrom }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition text-center shadow-xs"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  state={{ from: fridgeLoginFrom }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition text-center"
                >
                  Đăng ký
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setFridgeLoginFrom(null)}
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
