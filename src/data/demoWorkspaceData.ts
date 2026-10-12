/** Seed records for frontend-only demonstrations; API-backed data must replace these values later. */
export interface DemoNotification {
  id: number;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  href: string;
}

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 1,
    title: 'Thực đơn tuần mới đã sẵn sàng',
    description: 'AI đã gợi ý 7 ngày ăn chay cân bằng cho bạn.',
    time: '10 phút trước',
    unread: true,
    href: '/meal-plan'
  },
  {
    id: 2,
    title: 'Công thức mới dành cho bạn',
    description: 'Thử món salad đậu gà giàu protein thực vật.',
    time: 'Hôm qua',
    unread: true,
    href: '/recipe/salad-dau-ga-chanh-day'
  },
  {
    id: 3,
    title: 'Chào mừng bạn đến với VEGEAI',
    description: 'Hoàn thiện hồ sơ dinh dưỡng để nhận gợi ý phù hợp.',
    time: '2 ngày trước',
    unread: false,
    href: '/onboarding'
  }
];

export const DEMO_GROCERIES = [
  { id: 1, name: 'Đậu hũ non', amount: '2 miếng', checked: false },
  { id: 2, name: 'Cà chua chín', amount: '4 quả', checked: false },
  { id: 3, name: 'Rau cải xanh', amount: '1 bó', checked: true },
  { id: 4, name: 'Gạo lứt', amount: '500 g', checked: false }
];
