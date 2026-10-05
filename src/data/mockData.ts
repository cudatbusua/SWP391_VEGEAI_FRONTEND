import type { Recipe, BlogItem } from '../types';

export const RECIPES: Recipe[] = [
  {
    id: 'dau-hu-sot-ca-chua',
    title: 'Đậu Hũ Sốt Cà Chua Nấm Đùi Gà',
    description: 'Món ăn truyền thống đậm đà hương vị gia đình Việt. Đậu hũ giòn rụm ngấm sốt cà chua thanh ngọt kết hợp cùng nấm đùi gà dai sần sật cực kỳ đưa cơm.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    badge: 'Chay Tịnh',
    secondaryBadge: 'Thuần Chay',
    calories: 318,
    protein: 16,
    carbs: 24,
    fat: 12,
    cookTime: 22,
    difficulty: 'Dễ',
    rating: 4.6,
    reviewsCount: 120,
    mealType: 'Bữa Trưa',
    categoryPills: ['Thuần Chay', 'Giàu Protein'],
    mainIngredients: ['Đậu hũ & Tàu hũ ky', 'Nấm các loại'],
    ingredients: [
      { id: 1, name: 'Đậu hũ trắng', amount: '3 thanh (300g)' },
      { id: 2, name: 'Cà chua chín', amount: '3 quả vừa' },
      { id: 3, name: 'Nấm đùi gà', amount: '2 cây nhỏ' },
      { id: 4, name: 'Hành boa-rô & Gia vị', amount: 'Dầu ăn thực vật, nước tương, tiêu' }
    ],
    steps: [
      'Đậu hũ cắt khối vuông vừa ăn, thấm khô nước rồi chiên vàng đều các mặt trên chảo dầu nóng.',
      'Nấm đùi gà rửa sạch, cắt lát mỏng xéo hoặc thái sợi dày.',
      'Cà chua băm hạt lựu, phi thơm với hành boa-rô thái nhỏ đến khi nhuyễn mịn tạo thành sốt sánh đỏ.',
      'Cho nấm đùi gà và đậu hũ vào đảo đều với lửa nhỏ trong 5-7 phút cho ngấm gia vị.',
      'Nêm 1.5 muỗng nước tương, chút hạt nêm nấm chay, tiêu xay và rắc hành boa-rô lên trên trước khi tắt bếp.'
    ],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 'canh-bi-do-nam-rom',
    title: 'Canh bí đỏ nấu nấm rơm',
    description: 'Món canh thanh mát, giàu dinh dưỡng, kết hợp hoàn hảo giữa vị ngọt tự nhiên của bí đỏ và nấm rơm tươi thanh ngọt, bồi bổ trí não.',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    badge: 'Chay Tịnh',
    secondaryBadge: 'Thuần Chay',
    calories: 452,
    protein: 18,
    carbs: 35,
    fat: 8,
    cookTime: 25,
    difficulty: 'Dễ',
    rating: 4.8,
    reviewsCount: 89,
    mealType: 'Bữa Trưa',
    categoryPills: ['Thuần Chay', 'Món Nước', 'Giàu Protein'],
    mainIngredients: ['Rau củ quả tươi', 'Nấm các loại'],
    ingredients: [
      { id: 1, name: 'Bí đỏ hồ lô', amount: '350g thái miếng vừa' },
      { id: 2, name: 'Nấm rơm tươi', amount: '150g bổ đôi' },
      { id: 3, name: 'Đậu phộng tươi giã dập', amount: '50g' },
      { id: 4, name: 'Ngò gai & rau om', amount: '1 nắm nhỏ' }
    ],
    steps: [
      'Bí đỏ gọt vỏ, bỏ ruột, rửa sạch rồi cắt khối vuông vừa ăn.',
      'Nấm rơm ngâm nước muối loãng 10 phút, xắt đôi.',
      'Nấu sôi 1 lít nước, cho đậu phộng giã và bí đỏ vào hầm mềm.',
      'Thêm nấm rơm nấu tiếp 5 phút, nêm muối hồng và hạt nêm chay.',
      'Múc ra tô rắc ngò om, ngò gai thái nhỏ.'
    ]
  },
  {
    id: 'salad-dau-ga-chanh-day',
    title: 'Salad đậu gà chanh dây',
    description: 'Sự kết hợp độc đáo giữa đậu gà bùi béo và sốt chanh dây chua ngọt kích thích vị giác, bổ sung chất xơ và kiểm soát đường huyết.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    badge: 'Low GI',
    secondaryBadge: 'Giàu Protein',
    calories: 320,
    protein: 14,
    carbs: 28,
    fat: 9,
    cookTime: 15,
    difficulty: 'Dễ',
    rating: 4.9,
    reviewsCount: 142,
    mealType: 'Bữa Tối',
    categoryPills: ['Low GI', 'Dưới 20 phút', 'Giàu Protein'],
    mainIngredients: ['Các loại hạt & Đậu gà', 'Rau củ quả tươi'],
    ingredients: [
      { id: 1, name: 'Đậu gà ngâm luộc chín', amount: '200g' },
      { id: 2, name: 'Xà lách Romaine & Cà chua bi', amount: '150g' },
      { id: 3, name: 'Bơ sáp chín', amount: '1/2 quả' },
      { id: 4, name: 'Nước cốt chanh dây & Mật dừa nước', amount: '3 muỗng canh' }
    ]
  },
  {
    id: 'bun-rieu-chay',
    title: 'Bún riêu chay thanh đạm',
    description: 'Nước dùng đậm đà vị cà chua và riêu cua làm từ đậu hũ, hạt sen thơm ngon bổ dưỡng, chuẩn vị truyền thống Hà Nội.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    badge: 'Món Nước',
    secondaryBadge: 'Thuần Chay',
    calories: 385,
    protein: 22,
    carbs: 45,
    fat: 10,
    cookTime: 35,
    difficulty: 'Trung bình',
    rating: 4.7,
    reviewsCount: 205,
    mealType: 'Bữa Sáng',
    categoryPills: ['Món Nước', 'Giàu Protein', 'Thuần Chay'],
    mainIngredients: ['Đậu hũ & Tàu hũ ky', 'Nấm các loại', 'Rau củ quả tươi'],
    ingredients: [
      { id: 1, name: 'Bún tươi sợi nhỏ', amount: '300g' },
      { id: 2, name: 'Đậu hũ non & Nấm mèo làm riêu', amount: '200g' },
      { id: 3, name: 'Cà chua chín mọng', amount: '3 quả' },
      { id: 4, name: 'Tàu hũ ky chiên giòn', amount: '50g' }
    ]
  },
  {
    id: 'bong-cai-xanh-xao-nam',
    title: 'Bông cải xanh xào nấm đông cô',
    description: 'Món xào nhanh gọn với bông cải xanh giòn ngọt kết hợp nấm đông cô đậm đà hương vị, giàu vitamin C và chất chống oxy hóa.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    badge: 'Ít Calo',
    secondaryBadge: 'Dưới 20 phút',
    calories: 210,
    protein: 10,
    carbs: 18,
    fat: 5,
    cookTime: 12,
    difficulty: 'Dễ',
    rating: 4.5,
    reviewsCount: 76,
    mealType: 'Bữa Tối',
    categoryPills: ['Dưới 20 phút', 'Thuần Chay', 'Low GI'],
    mainIngredients: ['Rau củ quả tươi', 'Nấm các loại'],
    ingredients: [
      { id: 1, name: 'Bông cải xanh (Súp lơ)', amount: '1 búp (300g)' },
      { id: 2, name: 'Nấm đông cô tươi', amount: '100g' },
      { id: 3, name: 'Cà rốt tỉa hoa', amount: '1/2 củ' },
      { id: 4, name: 'Dầu hào chay & tỏi băm', amount: '2 muỗng canh' }
    ]
  },
  {
    id: 'goi-cuon-dau-hu-bo-dau-phong',
    title: 'Gỏi cuốn đậu hũ bơ đậu phộng',
    description: 'Cuộn tròn thanh mát với rau sống tươi, bún và đậu hũ chiên giòn chấm sốt bơ đậu phộng béo ngậy đặc trưng.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    badge: 'Khai Vị',
    secondaryBadge: 'Dưới 20 phút',
    calories: 290,
    protein: 12,
    carbs: 32,
    fat: 11,
    cookTime: 20,
    difficulty: 'Dễ',
    rating: 4.8,
    reviewsCount: 115,
    mealType: 'Ăn Vặt / Tráng Miệng',
    categoryPills: ['Dưới 20 phút', 'Thuần Chay'],
    mainIngredients: ['Đậu hũ & Tàu hũ ky', 'Rau củ quả tươi'],
    ingredients: [
      { id: 1, name: 'Bánh tráng gỏi cuốn', amount: '10 cái' },
      { id: 2, name: 'Đậu hũ chiên giòn thái que', amount: '2 miếng' },
      { id: 3, name: 'Rau thơm, xà lách, dưa leo', amount: '200g' },
      { id: 4, name: 'Sốt bơ đậu phộng tương đen', amount: '1 chén nhỏ' }
    ]
  },
  {
    id: 'che-hat-sen-dau-do',
    title: 'Chè hạt sen đậu đỏ dưỡng nhan',
    description: 'Món tráng miệng ngọt thanh, giúp an thần và bồi bổ cơ thể với hạt sen Huế và đậu đỏ mềm mịn ninh nhừ cùng đường phèn.',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    badge: 'Tráng Miệng',
    secondaryBadge: 'Low GI',
    calories: 240,
    protein: 8,
    carbs: 42,
    fat: 2,
    cookTime: 40,
    difficulty: 'Dễ',
    rating: 4.9,
    reviewsCount: 168,
    mealType: 'Ăn Vặt / Tráng Miệng',
    categoryPills: ['Low GI', 'Thuần Chay'],
    mainIngredients: ['Các loại hạt & Đậu gà'],
    ingredients: [
      { id: 1, name: 'Hạt sen tươi Huế', amount: '150g' },
      { id: 2, name: 'Đậu đỏ hạt nhỏ', amount: '100g ngâm nở' },
      { id: 3, name: 'Đường phèn mật mía', amount: '50g' },
      { id: 4, name: 'Nước cốt dừa tươi', amount: '3 muỗng canh' }
    ]
  },
  {
    id: 'com-chien-trai-thom',
    title: 'Cơm chiên trái thơm hạt điều',
    description: 'Món ăn nhiệt đới đầy màu sắc với dứa tươi, hạt điều rang béo bùi kết hợp rau củ hạt sen xào giòn đậm đà.',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
    badge: 'Chay Tịnh',
    secondaryBadge: 'Giàu Protein',
    calories: 410,
    protein: 15,
    carbs: 58,
    fat: 13,
    cookTime: 25,
    difficulty: 'Trung bình',
    rating: 4.7,
    reviewsCount: 94,
    mealType: 'Bữa Trưa',
    categoryPills: ['Giàu Protein', 'Thuần Chay'],
    mainIngredients: ['Các loại hạt & Đậu gà', 'Rau củ quả tươi'],
    ingredients: [
      { id: 1, name: 'Cơm nguội gạo lứt hoặc gạo thơm', amount: '2 chén' },
      { id: 2, name: 'Trái thơm (dứa) khoét ruột', amount: '1 trái' },
      { id: 3, name: 'Hạt điều rang muối bóc vỏ', amount: '50g' },
      { id: 4, name: 'Cà rốt, đậu cô ve, bắp ngọt', amount: '100g' }
    ]
  }
];

export const BLOG_POSTS: BlogItem[] = [
  {
    id: '1',
    title: '5 Nguồn Protein Thực Vật Dồi Dào Nhất Dành Cho Người Ăn Chay',
    excerpt: 'Khám phá bí quyết bổ sung đạm đầy đủ không lo thiếu chất từ đậu nành, hạt gai dầu, diêm mạch và đậu lăng.',
    author: 'Chuyên gia Dinh dưỡng VEGEAI',
    date: '04 Tháng 10, 2026',
    readTime: '5 phút đọc',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    category: 'Dinh Dưỡng Chay',
    tags: ['Protein', 'Sức Khỏe', 'Thực Đơn']
  },
  {
    id: '2',
    title: 'Cách Phối Hợp Gia Vị Tự Nhiên Giúp Món Chay Đậm Đà Chuẩn Vị Việt',
    excerpt: 'Học cách dùng nước tương nấm, boa-rô phi, củ cải khô và mật dừa nước để tạo vị ngọt tự nhiên không cần bột ngọt hóa học.',
    author: 'Chef Tuệ Minh',
    date: '01 Tháng 10, 2026',
    readTime: '7 phút đọc',
    image: 'https://images.unsplash.com/photo-1505253758473-96b3015f240a?auto=format&fit=crop&w=600&q=80',
    category: 'Mẹo Bếp Chay',
    tags: ['Gia Vị Chay', 'Bí Quyết Nấu']
  },
  {
    id: '3',
    title: 'Chỉ Số Đường Huyết Low GI Trong Chế Độ Ăn Chay Giảm Cân',
    excerpt: 'Hiểu rõ chỉ số GI giúp bạn duy trì năng lượng bền bỉ, hạn chế tích mỡ thừa và hỗ trợ phòng chống tiểu đường type 2.',
    author: 'BS. Lê Hoài An',
    date: '28 Tháng 09, 2026',
    readTime: '6 phút đọc',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    category: 'Khoa Học Thực Phẩm',
    tags: ['Low GI', 'Giảm Cân', 'BMI']
  }
];

export const AI_PRESET_ANSWERS: Record<string, string> = {
  'protein': '🌱 **Nguồn đạm thực vật vàng cho người ăn chay:**\n\n1. **Đậu nành & Đậu hũ:** ~15-18g protein / 100g, chứa trọn vẹn 9 axit amin thiết yếu.\n2. **Đậu gà & Đậu lăng:** 1 chén đậu nấu chín cung cấp ~15g protein và dồi dào chất xơ Low GI.\n3. **Hạt chia & Hạt gai dầu:** Giàu protein và Omega-3 thực vật tốt cho tim mạch.\n\n💡 *Mẹo:* Bạn nên kết hợp ngũ cốc nguyên hạt (gạo lứt, yến mạch) với các loại họ đậu để tạo nguồn protein hoàn chỉnh nhất!',
  'gout': '🩺 **Người có acid uric cao/bệnh Gout ăn chay thế nào?**\n\n- Các nghiên cứu y khoa hiện đại chỉ ra purin từ nguồn thực vật (đậu hũ, nấm ăn vừa phải) **ít gây bùng phát cơn gout** hơn rất nhiều so với purin từ thịt đỏ và hải sản.\n- Ưu tiên rau lá xanh, dưa leo, củ cải, hạt óc chó và uống đủ 2-2.5 lít nước mỗi ngày để tăng đào thải acid uric.\n- Đậu hũ có thể dùng 2-3 bữa/tuần với cách chế biến hấp hoặc luộc thanh đạm.',
  'calo': '🥗 **Gợi ý bữa sáng chay dưới 300 kcal:**\n\n1. **Bát Yến mạch sữa đậu nành & hạt chia** (~240 kcal, 11g Protein)\n2. **Gỏi cuốn đậu hũ nướng sốt tương mè** (2 cuộn ~ 210 kcal)\n3. **Bánh mì ngũ cốc nguyên cám + 1/3 quả bơ dầm tiêu** (~260 kcal)\n\nCung cấp năng lượng bền bỉ, chỉ số đường huyết Low GI giúp no lâu suốt buổi sáng!'
};
