export interface SmartMarketItem {
  id: string;
  name: string;
  amount: string;
  category: 'produce' | 'protein' | 'grains' | 'spices';
  categoryLabel: string;
  mealNote: string;
  checked: boolean;
}

export interface SmartMarketStore {
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
  category: 'SUPERMARKET' | 'GROCERY_STORE' | 'MARKET' | 'APPLIANCE';
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
    name: 'Chay Xanh Mart - Cửa Hàng Thực Phẩm Chay & Hữu Cơ',
    tagline: 'Tối ưu giỏ hàng · Rẻ hơn 12% so với bình quân',
    address: '184 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 850m',
    distanceKm: 0.85,
    duration: '~3 phút đi xe',
    rating: 4.8,
    reviewsCount: 94,
    hours: 'Mở cửa · 07:30 - 21:00',
    matchCount: 15,
    totalNeeded: 16,
    matchPercent: 94,
    priceEstimate: '~285.000 đ',
    statusBadge: 'Khớp 15/16 nguyên liệu',
    badgeType: 'high',
    category: 'SUPERMARKET',
    categoryLabel: 'Siêu thị chay hữu cơ',
    notes: 'Có đầy đủ nông sản Đà Lạt VietGAP, đậu khuôn tươi nóng và gia vị chay chuyên sâu.',
    missingNote: 'Chỉ thiếu: Bột nêm rong biển Kombu (Có thể thay thế bằng nấm men dinh dưỡng có sẵn tại quầy).',
    featuredItems: ['Đậu hũ non hữu cơ', 'Nấm rơm búp tươi', 'Bí đỏ hồ lô', 'Gạo lứt huyết rồng', 'Hành boa-rô'],
    lat: 10.7985,
    lon: 106.6892,
    phone: '028 3995 1284',
  },
  {
    id: 'store-2',
    name: 'Annam Gourmet Phan Xích Long',
    tagline: 'Nhập khẩu & Organic · Đầy đủ nấm cao cấp & Tamari',
    address: '41-43 Phan Xích Long, Phường 3, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 1.2 km',
    distanceKm: 1.2,
    duration: '~5 phút đi xe',
    rating: 4.7,
    reviewsCount: 180,
    hours: 'Mở cửa · 08:00 - 22:00',
    matchCount: 14,
    totalNeeded: 16,
    matchPercent: 88,
    priceEstimate: '~340.000 đ',
    statusBadge: 'Khớp 14/16 nguyên liệu',
    badgeType: 'high',
    category: 'SUPERMARKET',
    categoryLabel: 'Siêu thị cao cấp & Nhập khẩu',
    notes: 'Đầy đủ nấm nhập khẩu, đậu gà hữu cơ Bio, nước tương Tamari Clearspring đạt chuẩn hữu cơ EU.',
    missingNote: 'Giá trung bình cao hơn nông sản nội địa ~15%, chất lượng nguyên liệu đạt chuẩn quốc tế.',
    featuredItems: ['Tamari Clearspring', 'Đậu gà hữu cơ Bio', 'Nấm Portobello', 'Yến mạch hữu cơ'],
    lat: 10.7960,
    lon: 106.6915,
    phone: '028 3517 8899',
  },
  {
    id: 'store-3',
    name: 'Dalat GAP Store - Nông Sản Sạch Phú Nhuận',
    tagline: 'Rau Củ Tươi Về Sáng Nay · VietGAP chuẩn kiểm nghiệm',
    address: '152 Cô Giang, Phường 2, Quận Phú Nhuận, TP.HCM',
    distance: 'Cách 1.6 km',
    distanceKm: 1.6,
    duration: '~6 phút đi xe',
    rating: 4.6,
    reviewsCount: 62,
    hours: 'Mở cửa · 06:30 - 20:00',
    matchCount: 12,
    totalNeeded: 16,
    matchPercent: 75,
    priceEstimate: '~195.000 đ',
    statusBadge: 'Khớp 12/16 nguyên liệu',
    badgeType: 'medium',
    category: 'GROCERY_STORE',
    categoryLabel: 'Cửa hàng nông sản sạch',
    notes: 'Đầy đủ rau thơm, nấm rơm tươi búp, bí đỏ hạt dẻ, bắp ngọt hái trong ngày.',
    missingNote: 'Thiếu các gia vị lên men đặc thù lâu năm (nước tương Tamari).',
    featuredItems: ['Cà rốt Đà Lạt', 'Nấm đùi gà baby', 'Mướp hương', 'Bắp ngọt'],
    lat: 10.7932,
    lon: 106.6880,
    phone: '028 3844 7120',
  },
  {
    id: 'store-4',
    name: 'Chợ Tân Định & Chợ Bến Thành (Khu Nông Sản & Đậu Hũ)',
    tagline: 'Nông sản dân sinh tươi mới mỗi sáng · Đậu hũ nóng tại chỗ',
    address: '336 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM',
    distance: 'Cách 1.8 km',
    distanceKm: 1.8,
    duration: '~6 phút đi xe',
    rating: 4.5,
    reviewsCount: 210,
    hours: 'Mở cửa · 05:30 - 18:30',
    matchCount: 13,
    totalNeeded: 16,
    matchPercent: 81,
    priceEstimate: '~175.000 đ',
    statusBadge: 'Khớp 13/16 nguyên liệu',
    badgeType: 'medium',
    category: 'MARKET',
    categoryLabel: 'Chợ dân sinh truyền thống',
    notes: 'Khu sạp rau củ Đà Lạt phong phú, đậu hũ mơ nóng mới ép mẻ sáng, giá thành tiết kiệm nhất.',
    missingNote: 'Cần tự chọn lọc nguồn hàng và hỏi kỹ xuất xứ hữu cơ.',
    featuredItems: ['Đậu hũ nóng', 'Nấm rơm tươi', 'Hạt sen tươi Huế', 'Hành boa-rô'],
    lat: 10.7895,
    lon: 106.6908,
    phone: '028 3824 1234',
  },
  {
    id: 'store-5',
    name: 'Điện Máy Xanh & Bếp Gia Dụng Phan Xích Long',
    tagline: 'Thiết bị bảo quản thực phẩm, máy xay hạt & hộp chân không',
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
    priceEstimate: 'Thiết bị bếp & bảo quản',
    statusBadge: 'Thiết bị & Bảo quản lạnh',
    badgeType: 'appliance',
    category: 'APPLIANCE',
    categoryLabel: 'Thiết bị & Bảo quản',
    notes: 'Chuỗi Điện Máy Xanh chính hãng - cung cấp dụng cụ sơ chế rau củ, máy ép chậm và hộp bảo quản lạnh cho căn bếp thực vật.',
    featuredItems: ['Hộp thủy tinh chân không', 'Máy xay sữa hạt', 'Nồi áp suất nấu đậu', 'Tủ lạnh Inverter'],
    lat: 10.8010,
    lon: 106.6875,
    phone: '1800 1061',
  },
];
