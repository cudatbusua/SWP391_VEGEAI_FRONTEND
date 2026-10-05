export interface Ingredient {
  id: number;
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  badge: string;
  secondaryBadge?: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  cookTime: number; // in minutes
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  rating: number;
  reviewsCount: number;
  mealType: 'Bữa Sáng' | 'Bữa Trưa' | 'Bữa Tối' | 'Ăn Vặt / Tráng Miệng';
  categoryPills: string[];
  mainIngredients: string[];
  ingredients: Ingredient[];
  steps?: string[];
  videoUrl?: string;
}

export interface FilterState {
  searchQuery: string;
  categoryPill: string;
  cookTimes: string[];
  calorieRanges: string[];
  mealTypes: string[];
  mainIngredients: string[];
  sortBy: 'popular' | 'calories_asc' | 'time_asc' | 'rating_desc';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface BlogItem {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  category: string;
  tags: string[];
}
