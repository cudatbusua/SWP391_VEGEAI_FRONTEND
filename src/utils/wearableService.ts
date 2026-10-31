/**
 * VEGEAI Omni-Wearable Health Hub & Google Fit Service
 * Handles cross-platform wearable syncing (Xiaomi Smart Band, Apple Watch, Galaxy Watch)
 * via Google Fit REST API / Health Connect bridge, with simulation fallback for testing.
 */

export const GOOGLE_FIT_CLIENT_ID = '164354959561-84vaff9lo56ummq04itrgq642kmjd4qo.apps.googleusercontent.com';

export interface WearableMetrics {
  steps: number;
  stepTarget: number;
  activeCalories: number;
  activeMinutes: number;
  avgHeartRate: number;
  sleepHours: string;
  source: 'google-fit' | 'xiaomi-band' | 'simulator' | 'none';
  lastSyncedAt: string;
  isConnected: boolean;
  deviceModel: string;
  aiAdvice: string;
  recommendedSnack: string;
}

const STORAGE_KEYS = {
  TOKEN: 'google_fit_access_token',
  STEPS: 'wearable_steps',
  KCAL: 'wearable_kcal',
  HEART_RATE: 'wearable_heart_rate',
  SOURCE: 'wearable_source',
  SYNC_TIME: 'wearable_last_synced',
  PRESET: 'wearable_preset',
  DEVICE: 'wearable_device'
};

export const WEARABLE_PRESETS = {
  light: {
    steps: 3850,
    stepTarget: 10000,
    activeCalories: 180,
    activeMinutes: 22,
    avgHeartRate: 68,
    sleepHours: '6h 45m',
    aiAdvice: 'Hôm nay mức vận động còn nhẹ (3.850 bước). Đề xuất đi bộ thư giãn thêm 20 phút vào buổi chiều tối và ưu tiên thực đơn thanh đạm, giàu chất xơ.',
    recommendedSnack: 'Nước ép cần tây dưa leo hạt chia (85 kcal)'
  },
  moderate: {
    steps: 8420,
    stepTarget: 10000,
    activeCalories: 485,
    activeMinutes: 52,
    avgHeartRate: 74,
    sleepHours: '7h 35m',
    aiAdvice: 'Bạn đã tiêu hao khoảng 485 kcal từ 8.420 bước chân. Đề xuất bổ sung thêm bữa phụ giàu đạm thực vật để hồi phục cơ bắp và bù nước điện giải.',
    recommendedSnack: 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)'
  },
  intense: {
    steps: 13600,
    stepTarget: 10000,
    activeCalories: 760,
    activeMinutes: 85,
    avgHeartRate: 82,
    sleepHours: '8h 10m',
    aiAdvice: 'Cường độ vận động cao (13.600 bước, 760 kcal)! Hãy tăng khẩu phần bữa tối hoặc bổ sung nước dừa tươi bù khoáng chất.',
    recommendedSnack: 'Bát yến mạch ngâm sữa đậu nành & hạt óc chó (280 kcal · 12g protein)'
  }
};

export const wearableService = {
  getStoredToken(): string {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || '';
  },

  getMetrics(): WearableMetrics {
    const token = this.getStoredToken();
    const storedSteps = localStorage.getItem(STORAGE_KEYS.STEPS);
    const storedKcal = localStorage.getItem(STORAGE_KEYS.KCAL);
    const storedHeartRate = localStorage.getItem(STORAGE_KEYS.HEART_RATE);
    const storedSource = localStorage.getItem(STORAGE_KEYS.SOURCE);
    const storedSync = localStorage.getItem(STORAGE_KEYS.SYNC_TIME);
    const storedDevice = localStorage.getItem(STORAGE_KEYS.DEVICE);
    const presetKey = localStorage.getItem(STORAGE_KEYS.PRESET) as keyof typeof WEARABLE_PRESETS | null;

    // Clean empty state if not linked to Google Fit and no simulator preset chosen
    if (!token && !storedSteps && !presetKey) {
      return {
        steps: 0,
        stepTarget: 10000,
        activeCalories: 0,
        activeMinutes: 0,
        avgHeartRate: 0,
        sleepHours: '—',
        source: 'none',
        lastSyncedAt: 'Chưa liên kết thiết bị',
        isConnected: false,
        deviceModel: 'Chưa kết nối',
        aiAdvice: 'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy kết nối Google Fit hoặc chọn một kịch bản mô phỏng bên dưới để VEGEAI đồng bộ chỉ số và tự động cân đối năng lượng.',
        recommendedSnack: 'Chưa có dữ liệu vận động'
      };
    }

    const preset = presetKey && WEARABLE_PRESETS[presetKey] ? WEARABLE_PRESETS[presetKey] : null;
    const steps = storedSteps !== null ? Number(storedSteps) : (preset?.steps || 0);
    const activeCalories = storedKcal !== null ? Number(storedKcal) : (preset?.activeCalories || 0);
    const avgHeartRate = storedHeartRate !== null ? Number(storedHeartRate) : (preset?.avgHeartRate || 0);

    let adviceText = '';
    if (steps > 0) {
      adviceText = `Đã đồng bộ thực tế từ ${storedDevice || 'Google Fit'}: ${steps.toLocaleString('vi-VN')} bước chân, tiêu hao ${activeCalories.toLocaleString('vi-VN')} kcal.`;
    } else if (preset) {
      adviceText = preset.aiAdvice;
    } else if (token) {
      adviceText = `Đã liên kết Google Fit (${storedDevice || 'Thiết bị đeo'}). Hôm nay chưa ghi nhận dữ liệu bước chân mới. Bạn có thể nhấn "Đồng bộ Google Fit" để làm mới dữ liệu.`;
    } else {
      adviceText = 'Bạn chưa liên kết Google Fit hoặc thiết bị đeo. Hãy bấm "Đồng bộ Google Fit" ở trên hoặc vào mục "Hồ sơ & Thể trạng" để kết nối theo dõi sức khỏe.';
    }

    return {
      steps,
      stepTarget: 10000,
      activeCalories,
      activeMinutes: Math.round(steps / 160),
      avgHeartRate,
      sleepHours: preset?.sleepHours || (token ? '7h 15m' : '—'),
      source: (storedSource as any) || (token ? 'google-fit' : (preset ? 'simulator' : 'none')),
      lastSyncedAt: storedSync || (token ? 'Đã liên kết tài khoản' : 'Chưa đồng bộ'),
      isConnected: Boolean(token),
      deviceModel: token ? (storedDevice || 'Google Fit / Health Connect') : (preset ? 'Mô phỏng thiết bị đeo (Xiaomi / Apple Watch)' : 'Chưa kết nối thiết bị'),
      aiAdvice: adviceText,
      recommendedSnack: steps > 8000
        ? 'Sinh tố bơ chuối sữa hạt sen (195 kcal · 7g protein)'
        : (steps > 0 ? 'Nước ép cần tây dưa leo hạt chia (85 kcal)' : 'Rau củ quả tươi giàu vitamin & khoáng chất')
    };
  },

  setPreset(key: 'light' | 'moderate' | 'intense'): WearableMetrics {
    localStorage.setItem(STORAGE_KEYS.PRESET, key);
    const p = WEARABLE_PRESETS[key];
    localStorage.setItem(STORAGE_KEYS.STEPS, String(p.steps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(p.activeCalories));
    localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(p.avgHeartRate));
    localStorage.setItem(STORAGE_KEYS.SYNC_TIME, `Mô phỏng (${key === 'light' ? 'Nhẹ' : key === 'moderate' ? 'Tiêu chuẩn' : 'Cường độ cao'})`);
    localStorage.setItem(STORAGE_KEYS.SOURCE, 'simulator');
    localStorage.removeItem(STORAGE_KEYS.DEVICE);
    window.dispatchEvent(new Event('wearable_sync_updated'));
    return this.getMetrics();
  },

  disconnect() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.STEPS);
    localStorage.removeItem(STORAGE_KEYS.KCAL);
    localStorage.removeItem(STORAGE_KEYS.HEART_RATE);
    localStorage.removeItem(STORAGE_KEYS.PRESET);
    localStorage.removeItem(STORAGE_KEYS.SOURCE);
    localStorage.removeItem(STORAGE_KEYS.SYNC_TIME);
    localStorage.removeItem(STORAGE_KEYS.DEVICE);
    window.dispatchEvent(new Event('wearable_sync_updated'));
  },

  async fetchGoogleFitLive(token: string): Promise<{ steps: number; calories: number; heartRate: number }> {
    const now = Date.now();
    const startTime = now - 24 * 60 * 60 * 1000;

    // 1. Query Activity metrics (Step count & Calorie expended) - requires fitness.activity.read
    const activityRequestBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' }
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime,
      endTimeMillis: now
    };

    const res = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityRequestBody)
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.disconnect();
        throw new Error('Phiên ủy quyền Google Fit đã hết hạn. Vui lòng lấy Token mới hoặc bấm liên kết lại.');
      }
      const errJson = await res.json().catch(() => null);
      throw new Error(`Google Fit API lỗi (${res.status}): ${errJson?.error?.message || 'Vui lòng kiểm tra lại quyền truy cập.'}`);
    }

    const data = await res.json();
    let steps = 0;
    let calories = 0;
    let detectedDevice = '';

    if (data.bucket && data.bucket.length > 0) {
      for (const bucket of data.bucket) {
        if (!bucket.dataset) continue;
        for (const ds of bucket.dataset) {
          if (!ds.point) continue;
          for (const point of ds.point) {
            if (point.dataTypeName === 'com.google.step_count.delta') {
              steps += point.value?.[0]?.intVal || 0;
              if (point.originDataSourceId && !detectedDevice) {
                const parts = point.originDataSourceId.split(':');
                if (parts.length >= 4) {
                  detectedDevice = `${parts[2]} ${parts[3]}`;
                }
              }
            } else if (point.dataTypeName === 'com.google.calories.expended') {
              calories += point.value?.[0]?.fpVal || 0;
            }
          }
        }
      }
    }

    // 2. Optionally query Heart Rate (requires fitness.body.read). Gracefully fallback to 0 if not granted.
    let heartRate = 0;
    try {
      const hrRequestBody = {
        aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime,
        endTimeMillis: now
      };
      const hrRes = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hrRequestBody)
      });
      if (hrRes.ok) {
        const hrData = await hrRes.json();
        if (hrData.bucket) {
          for (const b of hrData.bucket) {
            if (!b.dataset) continue;
            for (const ds of b.dataset) {
              if (!ds.point) continue;
              for (const pt of ds.point) {
                if (pt.dataTypeName === 'com.google.heart_rate.bpm') {
                  heartRate = Math.round(pt.value?.[0]?.fpVal || 0);
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignored if body scope not granted
    }

    const finalSteps = steps;
    const finalKcal = Math.round(calories);
    const deviceName = detectedDevice ? `Google Fit (${detectedDevice})` : 'Google Fit (Đồng bộ trực tiếp)';

    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.STEPS, String(finalSteps));
    localStorage.setItem(STORAGE_KEYS.KCAL, String(finalKcal));
    localStorage.setItem(STORAGE_KEYS.HEART_RATE, String(heartRate));
    localStorage.setItem(STORAGE_KEYS.DEVICE, deviceName);
    localStorage.setItem(STORAGE_KEYS.SOURCE, 'google-fit');
    localStorage.setItem(STORAGE_KEYS.SYNC_TIME, new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    window.dispatchEvent(new Event('wearable_sync_updated'));
    return { steps: finalSteps, calories: finalKcal, heartRate };
  },

  openGoogleFitAuthPopup(): Promise<string> {
    return new Promise((resolve, reject) => {
      const gOauth2 = (window as any)?.google?.accounts?.oauth2;

      // 1. Primary: Use Google Identity Services OAuth2 Token Client (in-place popup flow)
      // This official GIS flow operates via postMessage and does not require an explicit redirect_uri,
      // eliminating the "redirect_uri_mismatch" error.
      if (gOauth2 && typeof gOauth2.initTokenClient === 'function') {
        try {
          const client = gOauth2.initTokenClient({
            client_id: GOOGLE_FIT_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/fitness.activity.read',
            callback: (tokenResponse: any) => {
              if (tokenResponse?.error) {
                reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Ủy quyền Google Fit không thành công.'));
                return;
              }
              if (tokenResponse?.access_token) {
                localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
                resolve(tokenResponse.access_token);
              } else {
                reject(new Error('Không nhận được Access Token từ Google.'));
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Lỗi cửa sổ ủy quyền Google Identity.'));
            }
          });

          client.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (err: any) {
          console.warn('Google Identity Services initTokenClient error, trying fallback:', err);
        }
      }

      // 2. Fallback: window.open with current origin as redirect_uri
      const redirectUri = window.location.origin;
      const scope = 'https://www.googleapis.com/auth/fitness.activity.read';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_FIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent`;

      const authWindow = window.open(authUrl, 'GoogleFitOAuth', 'width=560,height=680');
      if (!authWindow) {
        reject(new Error('Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để ủy quyền Google Fit.'));
        return;
      }

      const timer = setInterval(() => {
        try {
          if (!authWindow || authWindow.closed) {
            clearInterval(timer);
            const saved = localStorage.getItem(STORAGE_KEYS.TOKEN);
            if (saved) {
              resolve(saved);
            } else {
              reject(new Error('Cửa sổ ủy quyền đã đóng hoặc chưa hoàn tất cấp quyền.'));
            }
            return;
          }

          if (authWindow.location && authWindow.location.href.includes('access_token=')) {
            const hash = authWindow.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            if (token) {
              localStorage.setItem(STORAGE_KEYS.TOKEN, token);
              authWindow.close();
              clearInterval(timer);
              resolve(token);
            }
          }
        } catch {
          // Cross-origin restriction while on Google accounts domain is normal
        }
      }, 600);
    });
  }
};
