export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  timestamp?: string;
}
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
}
export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  dietaryPreferences?: string;
  allergies?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  dailyCalorieTarget?: number;
}
export type UpdateUserProfile = Partial<Pick<UserProfile,
  'fullName' | 'phoneNumber' | 'dateOfBirth' | 'gender' | 'address' |
  'dietaryPreferences' | 'allergies' | 'heightCm' | 'weightKg' | 'dailyCalorieTarget'
>>;
export interface AiChatMessage {
  role: 'user' | 'model';
  text: string;
}
export interface AiChatResponse {
  reply: string;
  sessionId: string;
  recommendedRecipes?: string[];
  timestamp: string;
  isGuestTrial: boolean;
  remainingGuestQuota?: number;
}
export interface FridgeScanResponse {
  summary: string;
  totalItemsDetected: number;
  hasNonVegetarianItem: boolean;
  ingredients: {
    name: string;
    category: string;
    isVegetarian: boolean;
    freshness: string;
    freshnessScore?: number;
    shelfLifeEstimate?: string;
    visualSigns?: string;
    confidence?: number;
    storageTip?: string;
  }[];
  suggestedRecipes?: string[];
  warnings?: string[];
  scannedAt: string;
}

export type FridgeItemStatus = 'ACTIVE' | 'CONSUMED' | 'DISCARDED';
export type FreshnessStatus = 'FRESH' | 'USABLE' | 'SPOILED';

export interface FridgeItem {
  itemId: string;
  name: string;
  category?: string;
  isVegetarian: boolean;
  quantity?: number;
  unit?: string;
  freshnessStatus: FreshnessStatus;
  freshnessScore?: number;
  firstScannedAt?: string;
  lastScannedAt?: string;
  estimatedShelfLifeDays?: number;
  expiryDate?: string;
  daysInFridge: number;
  daysRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  status: FridgeItemStatus;
  storageTip?: string;
  notes?: string;
  confidence?: number;
  warningMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FridgeItemInput = Partial<Pick<FridgeItem,
  'name' | 'category' | 'isVegetarian' | 'quantity' | 'unit' | 'freshnessStatus' |
  'estimatedShelfLifeDays' | 'expiryDate' | 'storageTip' | 'notes'
>>;

export interface ConfirmFridgeScanResponse {
  totalProcessed: number;
  newlyAddedCount: number;
  updatedExistingCount: number;
  items: FridgeItem[];
  memoryInsights?: string[];
}

export interface FridgeSummary {
  totalActiveItems: number;
  freshCount: number;
  usableCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  veganCount: number;
  urgentWarnings?: string[];
}

export type NutritionGender = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type NutritionGoal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';

export interface NutritionTargets {
  bmi: number;
  bmiCategory: string;
  bmiCategoryLabel: string;
  bmr: number;
  tdee: number;
  dailyCaloriesTarget: number;
  customCalorieTarget: boolean;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  fiberTargetG: number;
  warnings?: string[];
}

export interface NutritionProfile {
  nutritionProfileId: string;
  userId: string;
  gender: NutritionGender;
  dateOfBirth: string;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  customDailyCalories?: number;
  targets: NutritionTargets;
  createdAt?: string;
  updatedAt?: string;
}

export interface NutritionProfileInput {
  gender: NutritionGender;
  dateOfBirth: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
  customDailyCalories?: number | null;
}

export interface NutritionCalculateInput extends Omit<NutritionProfileInput, 'dateOfBirth'> {
  age: number;
}

export interface OptionItem {
  code: string;
  description: string;
  value?: number;
}

export interface NutritionOptions {
  genders: string[];
  activityLevels: OptionItem[];
  goals: OptionItem[];
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'LOCKED' | 'DISABLED';
export type AdminUserRole = 'ADMIN' | 'MEMBER';

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  lockedUsers: number;
  disabledUsers: number;
  memberCount: number;
  adminCount: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}

export interface AiModelStatus {
  modelName: string;
  provider: string;
  version: string;
  status: string;
  latencyMs: number;
  rateLimitQuota: string;
}

export interface AiOpsStatus {
  systemHealth: string;
  uptimePercentage: number;
  averageLatencyMs: number;
  totalAiRequests: number;
  guestAiRequestsToday: number;
  lastHealthCheckAt: string;
  models: AiModelStatus[];
}

export interface AiAuditLogEntry {
  logId: string;
  timestamp: string;
  model: string;
  operation: string;
  latencyMs: number;
  userType: string;
  status: string;
  promptSummary: string;
}
