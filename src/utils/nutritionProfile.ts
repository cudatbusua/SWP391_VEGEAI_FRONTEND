export const dietLabels: Record<string, string> = {
  VEGAN: 'Thuần chay', VEGETARIAN: 'Ăn chay', OVO_LACTO: 'Chay có trứng và sữa', LACTO_OVO: 'Chay có trứng và sữa',
  LACTO: 'Chay có sữa', OVO: 'Chay có trứng', RAW_VEGAN: 'Thuần chay thô',
  PESCATARIAN: 'Chế độ có hải sản', FLEXITARIAN: 'Bán chay',
};
export const allergyLabels: Record<string, string> = {
  PEANUTS: 'Đậu phộng', TREE_NUTS: 'Hạt dinh dưỡng', SOY: 'Đậu nành', GLUTEN: 'Gluten',
  DAIRY: 'Sữa', EGGS: 'Trứng', SESAME: 'Mè', MUSHROOMS: 'Nấm', CORN: 'Bắp',
};
export function displayAllergies(value?: string) {
  return !value || value === 'NONE' ? '' : value.split(',').map(part => allergyLabels[part.trim()] || part.trim()).join(', ');
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
}

export function calculateExactAge(dateOfBirth?: string | null, fallbackAge: number = 25): number {
  if (!dateOfBirth) return fallbackAge;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return fallbackAge;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(13, Math.min(100, age));
}

export interface BmiCategoryInfo {
  label: string;
  color: string;
  bg: string;
  badgeClass: string;
  description: string;
}

/**
 * BMI classification using WHO Asia-Pacific (IDI & WPRO) cut-offs applied in Vietnam,
 * synchronized with Backend BmiCategory.java (< 18.5, < 23.0, < 25.0, >= 25.0).
 */
export function getBmiCategory(bmi: number): BmiCategoryInfo {
  if (bmi <= 0) {
    return {
      label: 'Chưa có dữ liệu',
      color: 'text-slate-500',
      bg: 'bg-slate-100 dark:bg-slate-800',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      description: 'Vui lòng cập nhật chiều cao và cân nặng để tính BMI.',
    };
  }
  if (bmi < 18.5) {
    return {
      label: 'Thiếu cân (Gầy)',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      description: 'Nên bổ sung thêm đạm thực vật, các loại đậu và hạt dinh dưỡng.',
    };
  }
  if (bmi < 23.0) {
    return {
      label: 'Bình thường (Cân đối)',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      description: 'Thể trạng tuyệt vời theo chuẩn Châu Á! Hãy duy trì thực đơn rau củ cân bằng hiện tại.',
    };
  }
  if (bmi < 25.0) {
    return {
      label: 'Thừa cân',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/50',
      badgeClass: 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      description: 'Nên tăng cường rau lá xanh giàu chất xơ và hạn chế đồ ngọt, dầu mỡ.',
    };
  }
  return {
    label: 'Béo phì (Cần chú ý)',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Nên kiểm soát calo nạp vào và tham khảo thêm tư vấn từ bác sĩ dinh dưỡng.',
  };
}

export function calculateBmr(weightKg: number, heightCm: number, age: number = 25, gender: string = 'FEMALE'): number {
  if (!weightKg || !heightCm) return 0;
  // Mifflin-St Jeor equation (1990) — synchronized with Backend NutritionCalculator.java
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'MALE') return Math.round(base + 5);
  return Math.round(base - 161);
}

export function calculateTdee(bmr: number, activityMultiplier: number = 1.375): number {
  if (!bmr) return 0;
  return Math.round(bmr * activityMultiplier);
}
