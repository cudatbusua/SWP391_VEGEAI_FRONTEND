import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowUp,
  ChefHat,
  Leaf,
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
  Square,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { aiService } from '../services/aiService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import { HealthActivityRings } from '../components/HealthActivityRings';
import { fridgeService } from '../services/fridgeService';
import { userService } from '../services/userService';
import type { UserProfile, FridgeItem } from '../types/api';

export type SessionCategory = 'fridge-scan' | 'ai-chef';

export interface ChatIngredientItem {
  name: string;
  category?: string;
  isVegetarian?: boolean;
  freshness?: string;
  freshnessScore?: number;
  shelfLifeEstimate?: string;
  storageTip?: string;
  confidence?: number;
  checked?: boolean;
}

export interface ChatIngredientsPoll {
  items: ChatIngredientItem[];
  status: 'pending' | 'confirmed' | 'dismissed';
  confirmedCount?: number;
  confirmedAt?: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  image?: string;
  ingredientsPoll?: ChatIngredientsPoll;
  recommendedRecipes?: string[];
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
  { icon: Soup, title: 'Nấu từ nguyên liệu có sẵn', text: 'Tôi có đậu phụ non, nấm đùi gà và cà chua bi. Gợi ý 3 món chay cho bữa tối.' },
  { icon: Timer, title: 'Bữa ngon trong 20 phút', text: 'Gợi ý một bữa cơm chay thanh đạm dễ nấu trong 20 phút, kèm định lượng chi tiết.' },
  { icon: Leaf, title: 'Đổi vị cho ngày hôm nay', text: 'Gợi ý 3 món chay phong cách Việt Nam thanh mát, ít dầu mỡ, nguyên liệu dễ mua.' },
  { icon: Calendar, title: 'Lên thực đơn tuần 7 ngày', text: 'Lên giúp tôi một thực đơn tuần 7 ngày cân bằng dinh dưỡng, giàu đạm và phù hợp với chỉ số thể trạng của tôi.' },
];

function formatTime(timestamp: number | string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function AiChatPage() {
  const { user } = useAuth();
  const location = useLocation();

  const storageKey = `vegeai:ai-chef:sessions:${user?.id || 'guest'}`;

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setBusy(false);
    setIsAnalyzingImage(false);
  };

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

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expiringItems, setExpiringItems] = useState<FridgeItem[]>([]);
  const [showHealthDrawer, setShowHealthDrawer] = useState(false);
  const [pollSavingId, setPollSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      userService.getProfile().then(setUserProfile).catch(() => {});
      fridgeService.expiringSoon(2).then(setExpiringItems).catch(() => {});
    }
  }, [user]);

  const handleTogglePollItem = (sessionMsgIdx: number, itemIdx: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const newMessages = [...s.messages];
      const targetMsg = { ...newMessages[sessionMsgIdx] };
      if (!targetMsg.ingredientsPoll) return s;
      const newItems = targetMsg.ingredientsPoll.items.map((it, idx) =>
        idx === itemIdx ? { ...it, checked: !it.checked } : it
      );
      targetMsg.ingredientsPoll = { ...targetMsg.ingredientsPoll, items: newItems };
      newMessages[sessionMsgIdx] = targetMsg;
      return { ...s, messages: newMessages, updatedAt: Date.now() };
    }));
  };

  const handleConfirmPoll = async (sessionMsgIdx: number) => {
    if (!user) {
      alert('Vui lòng đăng nhập tài khoản để lưu nguyên liệu vào Tủ Bếp Của Tôi nhé!');
      return;
    }
    const msg = currentSession?.messages[sessionMsgIdx];
    if (!msg || !msg.ingredientsPoll) return;
    const selected = msg.ingredientsPoll.items.filter(i => i.checked !== false);
    if (selected.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 nguyên liệu.');
      return;
    }

    setPollSavingId(`${sessionMsgIdx}`);
    try {
      for (const item of selected) {
        await fridgeService.add({
          name: item.name,
          category: item.category || 'VEGAN',
          isVegetarian: item.isVegetarian ?? true,
          quantity: 1,
          unit: 'phần',
          freshnessStatus: (item.freshness || 'FRESH') as any,
          estimatedShelfLifeDays: item.shelfLifeEstimate ? (Number(item.shelfLifeEstimate.match(/\d+/)?.[0]) || 3) : 3,
          storageTip: item.storageTip,
          notes: `Quét từ AI Bếp Trưởng: ${item.shelfLifeEstimate || '3-5 ngày'}`
        });
      }
      fridgeService.expiringSoon(2).then(setExpiringItems).catch(() => {});
      setSessions(prev => prev.map(s => {
        if (s.id !== activeSessionId) return s;
        const newMessages = [...s.messages];
        newMessages[sessionMsgIdx] = {
          ...newMessages[sessionMsgIdx],
          ingredientsPoll: {
            ...newMessages[sessionMsgIdx].ingredientsPoll!,
            status: 'confirmed',
            confirmedCount: selected.length,
            confirmedAt: formatTime(Date.now())
          }
        };
        return { ...s, messages: newMessages, updatedAt: Date.now() };
      }));
    } catch (err) {
      alert('Không thể lưu nguyên liệu vào Tủ Bếp: ' + errorMessage(err));
    } finally {
      setPollSavingId(null);
    }
  };

  const handleDismissPoll = (sessionMsgIdx: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const newMessages = [...s.messages];
      if (newMessages[sessionMsgIdx]?.ingredientsPoll) {
        newMessages[sessionMsgIdx] = {
          ...newMessages[sessionMsgIdx],
          ingredientsPoll: {
            ...newMessages[sessionMsgIdx].ingredientsPoll!,
            status: 'dismissed'
          }
        };
      }
      return { ...s, messages: newMessages, updatedAt: Date.now() };
    }));
  };

  const sendQuickPrompt = (promptText: string) => {
    setInput(promptText);
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement | null;
      if (form) form.requestSubmit();
    }, 50);
  };

  const handleCookOnTheSpot = (recipeTitle: string) => {
    sendQuickPrompt(`Bếp trưởng hãy hướng dẫn chi tiết từng bước nấu món "${recipeTitle}" ngay tại chỗ (nguyên liệu, sơ chế, cách nấu, thời gian) nhé!`);
  };

  const handleAddToMealPlan = (recipeTitle: string) => {
    sendQuickPrompt(`Gợi ý cách xếp món "${recipeTitle}" vào thực đơn tuần của tôi (nên ăn vào bữa trưa hay tối thứ mấy để cân bằng calo và dinh dưỡng).`);
  };

  const handleRescueExpiringItems = () => {
    if (expiringItems.length === 0) return;
    const names = expiringItems.map(i => i.name).join(', ');
    sendQuickPrompt(`Trong Tủ Bếp Của Tôi đang có nguyên liệu sắp hết hạn: ${names}. Hãy hướng dẫn 2 món chay thanh đạm để nấu hết nguyên liệu này ngay hôm nay nhé!`);
  };

  const handleRequestWeeklyPlan = () => {
    const tdeeText = userProfile?.dailyCalorieTarget ? `khoảng ${userProfile.dailyCalorieTarget} kcal/ngày` : 'cân bằng calo';
    const dietText = userProfile?.dietaryPreferences ? `theo chế độ ${userProfile.dietaryPreferences}` : 'chay lành mạnh';
    const allergyText = userProfile?.allergies ? `, tuyệt đối không dùng ${userProfile.allergies}` : '';
    sendQuickPrompt(`Hãy lên giúp tôi một thực đơn tuần 7 ngày chi tiết (từ Thứ Hai đến Chủ Nhật, gồm Bữa Sáng, Bữa Trưa, Bữa Tối) ${dietText}, mục tiêu ${tdeeText}${allergyText}.`);
  };

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch {
      // Ignore storage errors
    }
  }, [sessions, storageKey]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || busy || !currentSession) return;

    const userText = input.trim();
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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let finalPrompt = userText;
      let detectedRecipes: string[] = [];
      let detectedPoll: ChatIngredientsPoll | undefined = undefined;

      if (currentImg) {
        setIsAnalyzingImage(true);
        try {
          const scanRes = await aiService.scanFridge(currentImg, controller.signal);
          if (scanRes && scanRes.ingredients && scanRes.ingredients.length > 0) {
            const isNonFood = (name: string) => {
              const l = name.toLowerCase();
              return l.includes('củi') || l.includes('que') || l.includes('gỗ') || l.includes('đá') || l.includes('nhựa') || l.includes('bụi cây') || l.includes('hoạt hình') || l.includes('rêu') || l.includes('khoáng') || l.includes('núi') || l.includes('sỏi');
            };
            const edibleIngredients = scanRes.ingredients.filter(i => i.isEdible !== false && i.category !== 'NON_FOOD' && !isNonFood(i.name));
            const nonFoodIngredients = scanRes.ingredients.filter(i => i.isEdible === false || i.category === 'NON_FOOD' || isNonFood(i.name));

            if (edibleIngredients.length > 0) {
              const ingNames = edibleIngredients.map(i => i.name).join(', ');
              detectedRecipes = scanRes.suggestedRecipes || [];
              detectedPoll = {
                status: 'pending',
                items: edibleIngredients.map(i => ({
                  name: i.name,
                  category: i.category,
                  isVegetarian: i.isVegetarian,
                  freshness: i.freshness,
                  freshnessScore: i.freshnessScore,
                  shelfLifeEstimate: i.shelfLifeEstimate || '3-5 ngày',
                  storageTip: i.storageTip,
                  confidence: i.confidence,
                  checked: true,
                }))
              };

              let promptIntro = userText
                ? `Tôi vừa gửi ảnh chụp nguyên liệu cho Tủ Bếp Của Tôi. AI thị giác nhận diện được: ${ingNames}. Yêu cầu của tôi: ${userText}`
                : `Tôi vừa gửi ảnh chụp nguyên liệu cho Tủ Bếp Của Tôi. Qua hình ảnh nhận diện được các nguyên liệu: ${ingNames}. Hãy phân tích độ tươi, lưu ý bảo quản và gợi ý 3 món chay ngon nhất, kèm hướng dẫn chế biến nhanh.`;
              if (nonFoodIngredients.length > 0) {
                promptIntro += ` (Lưu ý: Có vật phẩm trong ảnh không ăn được đã được AI tự động loại trừ: ${nonFoodIngredients.map(i => i.name).join(', ')}).`;
              }
              finalPrompt = promptIntro;
            } else if (nonFoodIngredients.length > 0) {
              const nonFoodNames = nonFoodIngredients.map(i => i.name).join(', ');
              finalPrompt = `Tôi vừa tải lên một hình ảnh và AI nhận diện thấy các vật thể: ${nonFoodNames}. Những thứ này KHÔNG phải là nguyên liệu thực phẩm ăn được để nấu ăn (ví dụ như khối đá, rêu, que củi, tranh vẽ hoặc đồ vật gia đình). Bếp trưởng hãy giải thích lịch sự rằng những vật phẩm này không ăn được và hướng dẫn tôi chụp ảnh nguyên liệu rau củ quả, đậu hũ hoặc thực phẩm ăn được thực tế.`;
            } else {
              finalPrompt = userText || 'Tôi vừa gửi một hình ảnh nhưng AI không phát hiện thấy nguyên liệu thực phẩm ăn được nào trong ảnh. Bếp trưởng hãy giải thích lịch sự rằng ảnh không có nguyên liệu thực phẩm và hướng dẫn tôi chụp ảnh rau củ quả hoặc nguyên liệu nấu ăn thực tế nhé.';
            }
          } else {
            finalPrompt = userText || 'Tôi vừa gửi một hình ảnh nhưng AI không phát hiện thấy nguyên liệu thực phẩm ăn được nào trong ảnh. Bếp trưởng hãy giải thích lịch sự rằng ảnh không có nguyên liệu thực phẩm và hướng dẫn tôi chụp ảnh rau củ quả hoặc nguyên liệu nấu ăn thực tế nhé.';
          }
        } catch (scanErr: any) {
          if (controller.signal.aborted || scanErr?.name === 'AbortError') throw scanErr;
          console.warn('Vision analysis fallback:', scanErr);
          finalPrompt = userText || 'Tôi vừa tải lên một hình ảnh nhưng hệ thống AI nhận diện đang bận hoặc không đọc được nguyên liệu. Bếp trưởng hãy nhắc nhở tôi kiểm tra lại ảnh hoặc chụp lại rau củ quả thực tế nhé.';
        } finally {
          setIsAnalyzingImage(false);
        }
      }

      const history = currentSession.messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text.slice(0, 4000)
      }));

      const response = await aiService.chat(finalPrompt, currentSession.sessionId, history, controller.signal);

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: response.reply,
        time: formatTime(Date.now()),
        ingredientsPoll: detectedPoll
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
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError') {
        const stoppedMsg: ChatMessage = {
          sender: 'ai',
          text: '*(Bạn đã dừng phản hồi này)*',
          time: formatTime(Date.now())
        };
        setSessions(prev => prev.map(s => {
          if (s.id === currentSession.id) {
            return {
              ...s,
              messages: [...s.messages, stoppedMsg],
              updatedAt: Date.now()
            };
          }
          return s;
        }));
        return;
      }
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
      abortControllerRef.current = null;
      setBusy(false);
      setIsAnalyzingImage(false);
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
              <Link to="/meal-plans" className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-700 transition">
                <span className="flex items-center gap-2 font-semibold"><Timer className="w-3.5 h-3.5" /> Kế hoạch thực đơn tuần</span>
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

            {/* Mini Health Context & Expiry Alert Bar */}
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
              {/* Proactive Expiry Alert if any */}
              {expiringItems.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Tủ Bếp Của Tôi:</strong> Có <strong>{expiringItems.length}</strong> nguyên liệu sắp hết hạn ({expiringItems.map(i => i.name).slice(0, 3).join(', ')}{expiringItems.length > 3 ? '...' : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRescueExpiringItems}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs shrink-0"
                  >
                    <Soup className="w-3 h-3" />
                    <span>Gợi ý món giải cứu ngay</span>
                  </button>
                </div>
              )}

              {/* User Health & Nutrition Pill Bar */}
              <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hồ sơ Bếp Trưởng:</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <Flame className="w-3 h-3 text-orange-500" />
                    TDEE ~{userProfile?.dailyCalorieTarget || 1850} kcal
                  </span>
                  {userProfile?.dietaryPreferences && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                      <Leaf className="w-3 h-3 text-teal-600" />
                      {userProfile.dietaryPreferences}
                    </span>
                  )}
                  {userProfile?.allergies && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                      Kiêng: {userProfile.allergies}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestWeeklyPlan}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition cursor-pointer shadow-2xs"
                    title="Nhờ AI lên thực đơn tuần 7 ngày theo thể trạng"
                  >
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>Lên thực đơn tuần</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHealthDrawer(v => !v)}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showHealthDrawer ? 'Thu gọn vòng chỉ số ▴' : 'Vòng chỉ số BMR/BMI ▾'}
                  </button>
                </div>
              </div>

              {/* Collapsible Health Activity Rings Drawer */}
              {showHealthDrawer && (
                <div className="px-6 py-3 border-t border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/60 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto">
                      <HealthActivityRings
                        calories={userProfile?.dailyCalorieTarget || 1420}
                        calorieTarget={userProfile?.dailyCalorieTarget ? userProfile.dailyCalorieTarget + 400 : 1950}
                        heightCm={userProfile?.heightCm}
                        weightKg={userProfile?.weightKg}
                        compact={true}
                        showDetails={true}
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        💡 Trợ lý AI liên kết đa dịch vụ:
                      </p>
                      <p>• Tự động đối chiếu BMR / TDEE để cân bằng năng lượng từng bữa.</p>
                      <p>• Tuyệt đối cảnh báo & loại trừ các món dính chất dị ứng của bạn.</p>
                      <Link
                        to="/settings?tab=nutrition"
                        className="inline-block mt-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Chỉnh sửa chỉ số tại Cài đặt hồ sơ →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
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
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">{text}</p>
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

                    {/* Zalo-style Poll Confirmation Card for Fridge Inventory */}
                    {msg.ingredientsPoll && (
                      <div className="mt-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-850 p-4 shadow-sm animate-in fade-in duration-300 text-slate-800 dark:text-slate-100">
                        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-emerald-200 dark:border-emerald-800/80">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🧺</span>
                            <div>
                              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                Xác nhận nguyên liệu cho "Tủ Bếp Của Tôi"
                              </h4>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                AI phát hiện {msg.ingredientsPoll.items.length} nguyên liệu có thể lưu kho
                              </p>
                            </div>
                          </div>
                          {msg.ingredientsPoll.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã lưu kho
                            </span>
                          )}
                        </div>

                        {/* Items List with Checkboxes */}
                        <div className="space-y-2 mb-3">
                          {msg.ingredientsPoll.items.map((item, itemIdx) => (
                            <label
                              key={itemIdx}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs transition cursor-pointer ${
                                item.checked !== false
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={msg.ingredientsPoll?.status !== 'pending'}
                                checked={item.checked !== false}
                                onChange={() => handleTogglePollItem(idx, itemIdx)}
                                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 shrink-0">
                                    {item.freshness === 'FRESH' ? 'Tươi xanh' : 'Cần dùng sớm'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span>⏳ Hạn dùng: ~{item.shelfLifeEstimate || '3-5 ngày'}</span>
                                  {item.storageTip && <span>• 💡 {item.storageTip}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Poll Actions */}
                        {msg.ingredientsPoll.status === 'pending' ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={pollSavingId === `${idx}`}
                              onClick={() => handleConfirmPoll(idx)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                              {pollSavingId === `${idx}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Thêm vào Tủ Bếp Của Tôi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissPoll(idx)}
                              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs transition cursor-pointer"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        ) : msg.ingredientsPoll.status === 'confirmed' ? (
                          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <span>✓ Đã lưu {msg.ingredientsPoll.confirmedCount} nguyên liệu vào Tủ Bếp lúc {msg.ingredientsPoll.confirmedAt}.</span>
                            <Link to="/fridge" className="underline font-bold hover:text-emerald-950 dark:hover:text-emerald-200">
                              Mở Tủ Bếp →
                            </Link>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            (Đã bỏ qua lưu vào Tủ Bếp - Bếp trưởng chỉ tư vấn công thức nấu)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs animate-in fade-in duration-200 shadow-2xs">
                  <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{isAnalyzingImage ? 'Bếp trưởng đang quét và nhận diện ảnh...' : 'Bếp trưởng đang chuẩn bị câu trả lời dinh dưỡng...'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs transition cursor-pointer shadow-2xs shrink-0"
                    title="Dừng tạo phản hồi"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Dừng lại</span>
                  </button>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {currentSession.recommendedRecipes.map((rec, i) => (
                    <div
                      key={i}
                      className="flex flex-col justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100 shadow-2xs text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-emerald-900 dark:text-emerald-200 line-clamp-1">{rec}</span>
                        <div className="flex items-center gap-1 shrink-0">
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
                        </div>
                      </div>

                      {/* 3 Interactive Actions: Nấu tại chỗ, Thêm vào thực đơn, Đăng bài */}
                      <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleCookOnTheSpot(rec)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold transition cursor-pointer"
                          title="Bếp trưởng hướng dẫn từng bước nấu món này ngay trong chat"
                        >
                          <Utensils className="w-3 h-3" />
                          <span>Nấu tại chỗ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToMealPlan(rec)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-semibold transition cursor-pointer"
                          title="Hỏi AI cách xếp món này vào thực đơn tuần"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Thêm vào tuần</span>
                        </button>
                        <Link
                          to="/blog/write"
                          state={{
                            recipeTitle: `[Công thức AI] ${rec}`,
                            recipeExcerpt: `Công thức chay sáng tạo "${rec}" được gợi ý từ Bếp Trưởng VEGEAI trong phiên tư vấn dinh dưỡng.`,
                            recipeContent: `## Món chay sáng tạo: ${rec}\n\n### 💡 Giới thiệu\nCông thức được Bếp Trưởng VEGEAI sáng tạo và tối ưu hóa dinh dưỡng thuần thực vật.\n\n### 🥗 Thành phần gợi ý\n- Nguyên liệu chính tươi sạch\n- Gia vị tự nhiên: muối hồng, tiêu thơm, dầu oliu, hạt nêm chay\n\n### 👨‍🍳 Hướng dẫn nấu ăn\n1. Sơ chế sạch các loại nguyên liệu.\n2. Nấu chín tới ở nhiệt độ thích hợp để giữ trọn vi chất dinh dưỡng.\n3. Trình bày và thưởng thức ngon miệng cùng gia đình.\n\n> ✨ *Công thức được tạo bởi AI Bếp Trưởng VEGEAI.*`,
                            recipeCategory: 'KITCHEN'
                          }}
                          title="Tạo bài viết Blog từ món này"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 font-semibold transition"
                        >
                          <PenLine className="w-3 h-3" />
                          <span>Đăng bài</span>
                        </Link>
                      </div>
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

                {busy ? (
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="shrink-0 w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                    title="Dừng sinh phản hồi"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim() && !selectedImage}
                    className="shrink-0 w-10 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shadow-xs"
                    title="Gửi tin nhắn"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                )}
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
