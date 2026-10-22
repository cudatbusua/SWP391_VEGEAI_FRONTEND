export interface SmartMarketItem {
  id: string;
  name: string;
  amount: string;
  category: 'produce' | 'protein' | 'grains' | 'spices';
  categoryLabel: string;
  mealNote: string;
  checked: boolean;
}


export interface StoreCatalogItem {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  unit: string;
  imageEmoji: string;
  category: string;
  inStock: boolean;
}

export interface SmartMarketStore {
  catalog?: StoreCatalogItem[];
  id: string;
  name: string;
  tagline: string;
  address: string;
  distance: string;
  distanceKm: number;
  duration: string;
  rating: number;
  reviewsCount: number;
  hours: string;
  matchCount: number;
  totalNeeded: number;
  matchPercent: number;
  priceEstimate: string;
  statusBadge: string;
  badgeType: 'high' | 'medium' | 'appliance';
  category: 'SUPERMARKET' | 'GROCERY_STORE' | 'MARKET' | 'APPLIANCE' | 'VEGAN_STORE' | 'CONVENIENCE';
  categoryLabel: string;
  notes: string;
  missingNote?: string;
  featuredItems: string[];
  lat: number;
  lon: number;
  phone?: string;
}

export const INITIAL_SMART_MARKET_ITEMS: SmartMarketItem[] = [
  // Rau củ & Quả tươi (8 món)
  {
    id: 'sm-1',
    name: 'Cà chua Đà Lạt',
    amount: '800 g',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Canh chua dọc mùng, Sốt cà ri đỏ',
    checked: true,
  },
  {
    id: 'sm-2',
    name: 'Nấm đùi gà baby',
    amount: '500 g',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Kho tiêu gừng, Nấm áp chảo sốt teriyaki',
    checked: false,
  },
  {
    id: 'sm-3',
    name: 'Nấm rơm tươi',
    amount: '500 g',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Lẩu nấm dưỡng sinh, Canh khổ qua nấm',
    checked: false,
  },
  {
    id: 'sm-4',
    name: 'Bắp ngọt (ngô ngọt)',
    amount: '4 bắp',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Nước dùng rau củ ngọt, Salad bắp nướng',
    checked: false,
  },
  {
    id: 'sm-5',
    name: 'Hành boa-rô',
    amount: '6 cây',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Gia vị xào, phi thơm canh các bữa',
    checked: false,
  },
  {
    id: 'sm-6',
    name: 'Bí đỏ hồ lô',
    amount: '1 quả (~1.2 kg)',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Súp bí đỏ cốt dừa, Canh hầm đậu phộng',
    checked: false,
  },
  {
    id: 'sm-7',
    name: 'Mướp hương',
    amount: '2 quả',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Canh mướp nấu nấm rơm, mướp xào giá',
    checked: false,
  },
  {
    id: 'sm-8',
    name: 'Cà rốt tươi Đà Lạt',
    amount: '1.2 kg',
    category: 'produce',
    categoryLabel: 'Rau củ & Quả tươi',
    mealNote: 'Xào thập cẩm, Nấu nước dùng chay ngọt',
    checked: true,
  },

  // Đậu hũ & Các loại đậu, Hạt (5 món)
  {
    id: 'sm-9',
    name: 'Đậu hũ trắng hữu cơ',
    amount: '8 miếng',
    category: 'protein',
    categoryLabel: 'Đậu hũ & Các loại đậu, Hạt',
    mealNote: 'Đậu hũ sốt cà, Đậu rán lá lốt, Đậu kho sả ớt',
    checked: false,
  },
  {
    id: 'sm-10',
    name: 'Đậu hũ non Nhật Bản',
    amount: '4 hộp',
    category: 'protein',
    categoryLabel: 'Đậu hũ & Các loại đậu, Hạt',
    mealNote: 'Canh rong biển đậu non, Súp miso chay',
    checked: false,
  },
  {
    id: 'sm-11',
    name: 'Hạt sen tươi Huế',
    amount: '300 g',
    category: 'protein',
    categoryLabel: 'Đậu hũ & Các loại đậu, Hạt',
    mealNote: 'Chè sen long nhãn, Cơm hấp lá sen hạt sen',
    checked: false,
  },
  {
    id: 'sm-12',
    name: 'Đậu gà khô (chickpea)',
    amount: '400 g',
    category: 'protein',
    categoryLabel: 'Đậu hũ & Các loại đậu, Hạt',
    mealNote: 'Cà ri đậu gà nước cốt dừa, Hummus điểm tâm',
    checked: false,
  },
  {
    id: 'sm-13',
    name: 'Yến mạch cán dẹt',
    amount: '250 g',
    category: 'protein',
    categoryLabel: 'Đậu hũ & Các loại đậu, Hạt',
    mealNote: 'Cháo yến mạch củ dền sáng thứ 3 & 5',
    checked: true,
  },

  // Tinh bột & Mì, Bún khô (4 món)
  {
    id: 'sm-14',
    name: 'Gạo lứt huyết rồng',
    amount: '2 kg',
    category: 'grains',
    categoryLabel: 'Tinh bột & Mì, Bún khô',
    mealNote: 'Cơm gạo lứt muối mè, Cơm chiên rau củ',
    checked: false,
  },
  {
    id: 'sm-15',
    name: 'Bún tươi (hoặc bún khô Ba Cây Tre)',
    amount: '1 kg',
    category: 'grains',
    categoryLabel: 'Tinh bột & Mì, Bún khô',
    mealNote: 'Bún riêu chay Nam Bộ, Bún trộn chả giò chay',
    checked: false,
  },
  {
    id: 'sm-16',
    name: 'Miến dong nguyên chất',
    amount: '500 g',
    category: 'grains',
    categoryLabel: 'Tinh bột & Mì, Bún khô',
    mealNote: 'Miến xào nấm đông cô, Canh miến măng khô',
    checked: false,
  },
  {
    id: 'sm-17',
    name: 'Bánh phở tươi Sa Đéc',
    amount: '300 g',
    category: 'grains',
    categoryLabel: 'Tinh bột & Mì, Bún khô',
    mealNote: 'Phở nấm hương mộc nhĩ sáng Chủ Nhật',
    checked: true,
  },

  // Gia vị bếp chay & Dầu ăn (4 món)
  {
    id: 'sm-18',
    name: 'Hạt nêm nấm củ quả hữu cơ',
    amount: '1 gói (400g)',
    category: 'spices',
    categoryLabel: 'Gia vị bếp chay & Dầu ăn',
    mealNote: 'Bếp dùng chung cho 21 bữa ăn',
    checked: false,
  },
  {
    id: 'sm-19',
    name: 'Nước tương đậu nành Tamari',
    amount: '1 chai (500ml)',
    category: 'spices',
    categoryLabel: 'Gia vị bếp chay & Dầu ăn',
    mealNote: 'Lên men tự nhiên > 1 năm, không biến đổi gen',
    checked: false,
  },
  {
    id: 'sm-20',
    name: 'Dầu hạt cải / Dầu mè thơm',
    amount: '1 chai (1L)',
    category: 'spices',
    categoryLabel: 'Gia vị bếp chay & Dầu ăn',
    mealNote: 'Dầu ép lạnh cho món xào giòn & sốt trộn',
    checked: false,
  },
  {
    id: 'sm-21',
    name: 'Tiêu đen Phú Quốc',
    amount: '1 hũ (100g)',
    category: 'spices',
    categoryLabel: 'Gia vị bếp chay & Dầu ăn',
    mealNote: 'Hạt tiêu chín phơi khô nguyên hạt',
    checked: false,
  },
];

export const SMART_MARKET_STORES: SmartMarketStore[] = [
  {
    id: 'store-1',
    name: 'Chay Xanh Mart - Cửa Hàng Chay Phú Nhuận',
    tagline: 'Tối ưu giỏ hàng chay · Nông sản VietGAP & Đậu tươi trong ngày',
    address: '184 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 850m',
    distanceKm: 0.85,
    duration: '~3 phút đi xe',
    rating: 4.9,
    reviewsCount: 128,
    hours: 'Mở cửa · 07:30 - 21:00',
    matchCount: 15,
    totalNeeded: 16,
    matchPercent: 94,
    priceEstimate: '~285.000 đ',
    statusBadge: 'Khớp 15/16 nguyên liệu',
    badgeType: 'high',
    category: 'VEGAN_STORE',
    categoryLabel: 'Quán chay & Tiệm đồ chay',
    notes: 'Có đầy đủ nông sản Đà Lạt VietGAP, đậu khuôn tươi nóng và gia vị chay chuyên sâu.',
    missingNote: 'Chỉ thiếu: Bột nêm rong biển Kombu (Có sẵn nấm men dinh dưỡng thay thế).',
    featuredItems: ['Đậu hũ non hữu cơ', 'Nấm rơm búp tươi', 'Bí đỏ hồ lô', 'Gạo lứt huyết rồng', 'Hành boa-rô'],
    lat: 10.7985,
    lon: 106.6892,
    phone: '028 3995 1284',
    catalog: [
      { id: 'cx-1', name: 'Đậu hũ non hữu cơ', price: 18000, priceFormatted: '18.000 đ', unit: 'Hộp 2 bìa', imageEmoji: '🧈', category: 'protein', inStock: true },
      { id: 'cx-2', name: 'Nấm rơm búp tươi Đà Lạt', price: 35000, priceFormatted: '35.000 đ', unit: 'Khay 300g', imageEmoji: '🍄', category: 'produce', inStock: true },
      { id: 'cx-3', name: 'Cải ngọt VietGAP sạch', price: 22000, priceFormatted: '22.000 đ', unit: 'Bó 500g', imageEmoji: '🥬', category: 'produce', inStock: true },
      { id: 'cx-4', name: 'Hạt nêm nấm củ quả hữu cơ', price: 42000, priceFormatted: '42.000 đ', unit: 'Gói 200g', imageEmoji: '🧂', category: 'spices', inStock: true },
      { id: 'cx-5', name: 'Nước tương Tamari ủ gỗ', price: 68000, priceFormatted: '68.000 đ', unit: 'Chai 250ml', imageEmoji: '🍶', category: 'spices', inStock: true },
      { id: 'cx-6', name: 'Bí đỏ hồ lô dẻo ngọt', price: 25000, priceFormatted: '25.000 đ', unit: 'Quả ~1.2kg', imageEmoji: '🎃', category: 'produce', inStock: true }
    ]
  },
  {
    id: 'store-winmart',
    name: 'Bách Hóa Xanh & WinMart+ Phan Xích Long',
    tagline: 'Siêu thị thực phẩm tươi sạch · Đa dạng rau củ & nấm tươi',
    address: '92 Phan Xích Long, Phường 3, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 650m',
    distanceKm: 0.65,
    duration: '~2 phút đi xe',
    rating: 4.7,
    reviewsCount: 215,
    hours: 'Mở cửa · 06:30 - 22:00',
    matchCount: 14,
    totalNeeded: 16,
    matchPercent: 88,
    priceEstimate: '~210.000 đ',
    statusBadge: 'Khớp 14/16 nguyên liệu',
    badgeType: 'high',
    category: 'SUPERMARKET',
    categoryLabel: 'Siêu thị thực phẩm',
    notes: 'Rau củ chuẩn VietGAP kiểm định mỗi sáng, quầy nấm tươi phong phú, đậu hũ chiên sẵn.',
    featuredItems: ['Cải thìa tươi', 'Nấm kim châm', 'Cà chua Đà Lạt', 'Bắp ngọt', 'Đậu hũ trắng'],
    lat: 10.7972,
    lon: 106.6905,
    phone: '1900 1908',
    catalog: [
      { id: 'wm-1', name: 'Cải thìa xanh giòn ngọt', price: 19000, priceFormatted: '19.000 đ', unit: 'Bó 500g', imageEmoji: '🥬', category: 'produce', inStock: true },
      { id: 'wm-2', name: 'Nấm kim châm tươi', price: 14000, priceFormatted: '14.000 đ', unit: 'Gói 150g', imageEmoji: '🍄', category: 'produce', inStock: true },
      { id: 'wm-3', name: 'Cà chua Đà Lạt chín mọng', price: 20000, priceFormatted: '20.000 đ', unit: 'Túi 500g', imageEmoji: '🍅', category: 'produce', inStock: true },
      { id: 'wm-4', name: 'Bắp ngọt giống Mỹ', price: 22000, priceFormatted: '22.000 đ', unit: 'Túi 2 bắp', imageEmoji: '🌽', category: 'produce', inStock: true },
      { id: 'wm-5', name: 'Đậu hũ chiên vàng giòn', price: 16000, priceFormatted: '16.000 đ', unit: 'Hộp 3 miếng', imageEmoji: '🧈', category: 'protein', inStock: true }
    ]
  },
  {
    id: 'store-thien-duyen',
    name: 'Quán Cơm Chay Thiện Duyên & Đặc Sản Chay',
    tagline: 'Cơm chay & Món ăn chế biến sẵn giao nhanh trong 20 phút',
    address: '45 Cô Giang, Phường 2, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 900m',
    distanceKm: 0.9,
    duration: '~3 phút đi xe',
    rating: 4.8,
    reviewsCount: 310,
    hours: 'Mở cửa · 07:00 - 20:30',
    matchCount: 16,
    totalNeeded: 16,
    matchPercent: 100,
    priceEstimate: '~150.000 đ',
    statusBadge: 'Quán chay chuẩn vị',
    badgeType: 'high',
    category: 'VEGAN_STORE',
    categoryLabel: 'Quán chay & Tiệm đồ chay',
    notes: 'Quán chay lâu năm với các món mặn chay chế biến sẵn, chả lụa chay, súp nấm hạt sen và bún lứt xào.',
    featuredItems: ['Cơm chiên mì gói chay', 'Đậu khìa nước dừa', 'Canh chua thanh mát', 'Chả lụa chay'],
    lat: 10.7945,
    lon: 106.6870,
    phone: '028 3845 6789',
    catalog: [
      { id: 'td-1', name: 'Cơm chiên mì gói chay giòn rụm', price: 38000, priceFormatted: '38.000 đ', unit: 'Hộp cơm đầy đủ', imageEmoji: '🍛', category: 'ready_meal', inStock: true },
      { id: 'td-2', name: 'Đậu khìa nước dừa đưa cơm', price: 42000, priceFormatted: '42.000 đ', unit: 'Phần 2 người', imageEmoji: '🥘', category: 'ready_meal', inStock: true },
      { id: 'td-3', name: 'Canh chua rau củ nấm thanh nhiệt', price: 35000, priceFormatted: '35.000 đ', unit: 'Tô lớn', imageEmoji: '🍲', category: 'ready_meal', inStock: true },
      { id: 'td-4', name: 'Bún gạo lứt xào nấm ngũ sắc', price: 45000, priceFormatted: '45.000 đ', unit: 'Đĩa suất ăn', imageEmoji: '🍜', category: 'ready_meal', inStock: true },
      { id: 'td-5', name: 'Chả lụa chay thủ công từ nấm', price: 40000, priceFormatted: '40.000 đ', unit: 'Đòn 250g', imageEmoji: '🥢', category: 'protein', inStock: true }
    ]
  },
  {
    id: 'store-convenience',
    name: 'FamilyMart & Ministop 24h Hoàng Hoa Thám',
    tagline: 'Cửa hàng tiện lợi 24/7 · Cơm nắm chay Onigiri & Sữa hạt dinh dưỡng',
    address: '12 Hoàng Hoa Thám, Phường 7, Quận Bình Thạnh, TP.HCM',
    distance: 'Cách 1.3 km',
    distanceKm: 1.3,
    duration: '~5 phút đi xe',
    rating: 4.6,
    reviewsCount: 88,
    hours: 'Mở cửa cả ngày · 24/24',
    matchCount: 10,
    totalNeeded: 16,
    matchPercent: 65,
    priceEstimate: '~90.000 đ',
    statusBadge: 'Tiện lợi 24/7',
    badgeType: 'medium',
    category: 'CONVENIENCE',
    categoryLabel: 'Cửa hàng tiện lợi',
    notes: 'Phục vụ bữa ăn chay nhanh: Onigiri rong biển chay, sữa hạt óc chó/đậu nành nguyên chất, bánh bao chay.',
    featuredItems: ['Cơm nắm Onigiri chay', 'Sữa hạt đậu nành Fami', 'Bánh bao nấm chay', 'Nước khoáng Lavie'],
    lat: 10.8035,
    lon: 106.6940,
    phone: '028 3551 2233',
    catalog: [
      { id: 'fm-1', name: 'Cơm nắm Onigiri rong biển chay', price: 16000, priceFormatted: '16.000 đ', unit: 'Cái', imageEmoji: '🍙', category: 'ready_meal', inStock: true },
      { id: 'fm-2', name: 'Sữa đậu nành hạt óc chó hữu cơ', price: 14000, priceFormatted: '14.000 đ', unit: 'Hộp 200ml', imageEmoji: '🥛', category: 'beverage', inStock: true },
      { id: 'fm-3', name: 'Bánh bao chay nhân nấm tươi', price: 15000, priceFormatted: '15.000 đ', unit: 'Cái nóng hổi', imageEmoji: '🥟', category: 'ready_meal', inStock: true }
    ]
  },
  {
    id: 'store-appliance',
    name: 'Điện Máy Xanh & Bếp Thực Vật Phan Xích Long',
    tagline: 'Chuỗi Điện Máy Xanh chính hãng · Hộp hút chân không & Thiết bị bảo quản',
    address: '312 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 1.1 km',
    distanceKm: 1.1,
    duration: '~4 phút đi xe',
    rating: 4.9,
    reviewsCount: 340,
    hours: 'Mở cửa · 08:00 - 21:30',
    matchCount: 16,
    totalNeeded: 16,
    matchPercent: 100,
    priceEstimate: 'Thiết bị & Bảo quản',
    statusBadge: 'Thiết bị & Bảo quản lạnh',
    badgeType: 'appliance',
    category: 'APPLIANCE',
    categoryLabel: 'Điện Máy Xanh & Bếp',
    notes: 'Chuỗi Điện Máy Xanh chính hãng - cung cấp dụng cụ sơ chế rau củ, máy ép chậm và hộp bảo quản lạnh cho căn bếp thực vật.',
    featuredItems: ['Hộp thủy tinh chân không', 'Máy xay sữa hạt', 'Nồi áp suất nấu đậu', 'Tủ lạnh Inverter'],
    lat: 10.8010,
    lon: 106.6875,
    phone: '1800 1061',
    catalog: [
      { id: 'dmx-1', name: 'Bộ 3 hộp thủy tinh Lock&Lock giữ tươi rau củ', price: 189000, priceFormatted: '189.000 đ', unit: 'Bộ 3 hộp', imageEmoji: '🍱', category: 'equipment', inStock: true },
      { id: 'dmx-2', name: 'Máy làm sữa hạt & xay mịn thực vật Tefal', price: 890000, priceFormatted: '890.000 đ', unit: 'Chiếc', imageEmoji: '⚙️', category: 'equipment', inStock: true }
    ]
  }
];