export type BlogStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type BlogCategory = 'KITCHEN' | 'GREEN_LIVING' | 'EXPLORATION' | 'NUTRITION';

export interface BlogPost {
  postId: string;
  authorId: string;
  authorName: string;
  title: string;
  excerpt: string;
  content?: string;
  coverImage?: string;
  videoUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
  category: BlogCategory;
  status: BlogStatus;
  version: number;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
  reviewerName?: string;
  moderationReason?: string;
  aiModerationStatus?: string;
  aiModerationReason?: string;
}

export interface BlogInput {
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  coverImage: string;
  videoUrl?: string;
  version?: number;
}

export interface BlogComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  rating: number;
  createdAt: string;
}

export const blogCategories: Record<BlogCategory, string> = {
  KITCHEN: '🍲 Công thức & Vào bếp',
  NUTRITION: '🧬 Kiến thức Dinh dưỡng',
  GREEN_LIVING: '🌱 Lan tỏa Sống xanh',
  EXPLORATION: '📍 Review & Khám phá'
};

export interface PostClassificationTemplate {
  category: BlogCategory;
  badgeLabel: string;
  shortLabel: string;
  emoji: string;
  aiMode: 'RECIPE_STEPS' | 'KNOWLEDGE_INSIGHT';
  aiActionLabel: string;
  description: string;
  classificationRule: string;
  titlePlaceholder: string;
  excerptPlaceholder: string;
  defaultCover: string;
  contentTemplate: string;
}

export const BLOG_POST_TEMPLATES: Record<BlogCategory, PostClassificationTemplate> = {
  KITCHEN: {
    category: 'KITCHEN',
    badgeLabel: '🍲 Chia sẻ Công thức & Món nấu',
    shortLabel: 'Công thức nấu ăn',
    emoji: '🍲',
    aiMode: 'RECIPE_STEPS',
    aiActionLabel: '✨ AI Phân tích Công thức & Bước nấu',
    description: 'Đăng công thức món chay kèm hình ảnh/video. AI sẽ tự động bóc tách nguyên liệu, các bước nấu chi tiết và hỗ trợ tìm nơi mua nguyên liệu hoặc tư vấn tiếp qua Chatbot.',
    classificationRule: 'Rule phân loại: Có chứa danh sách nguyên liệu, định lượng (g, ml, muỗng), các bước chế biến hoặc video hướng dẫn nấu món chay.',
    titlePlaceholder: 'VD: Cách làm Đậu hũ non sốt nấm đông cô thanh đạm trong 15 phút',
    excerptPlaceholder: 'Tóm tắt hương vị món ăn, thời gian chuẩn bị và điểm đặc biệt của công thức...',
    defaultCover: '/images/vietnamese-vegan-table.png',
    contentTemplate: `## 🥗 Nguyên liệu cần chuẩn bị
- Đậu hũ non hoặc nấm tươi: 200g
- Rau củ đi kèm (cà rốt, cải ngọt...): 150g
- Gia vị thuần chay: Nước tương Tamari, hạt nêm nấm, dầu mè

## 👨‍🍳 Các bước thực hiện
1. **Bước 1 - Sơ chế**: Rửa sạch nguyên liệu với nước muối loãng, để ráo và cắt miếng vừa ăn.
2. **Bước 2 - Chế biến chính**: Làm nóng chảo, cho nguyên liệu vào đảo đều trên lửa vừa để giữ độ ngọt tự nhiên.
3. **Bước 3 - Hoàn thiện & Trình bày**: Nêm nếm gia vị chay vừa miệng, tắt bếp và bày ra đĩa thưởng thức nóng.

## 💡 Mẹo nhỏ từ căn bếp của mình
- Nên chọn nguyên liệu tươi trong ngày để món ăn giữ trọn dưỡng chất.`
  },
  NUTRITION: {
    category: 'NUTRITION',
    badgeLabel: '🧬 Kiến thức Dinh dưỡng & Sức khỏe',
    shortLabel: 'Kiến thức dinh dưỡng',
    emoji: '🧬',
    aiMode: 'KNOWLEDGE_INSIGHT',
    aiActionLabel: '🧠 AI Tóm tắt Kiến thức & Tư vấn Dinh dưỡng',
    description: 'Chia sẻ kiến thức khoa học về đạm thực vật, vi chất (B12, Sắt, Canxi, Omega-3) và chế độ ăn lành mạnh. AI sẽ đúc kết luận điểm cốt lõi và mở phiên tư vấn cá nhân hóa trên Chatbot.',
    classificationRule: 'Rule phân loại: Tập trung vào kiến thức dinh dưỡng, calo, macro/micro-nutrients, lợi ích sức khỏe thực vật mà không phải hướng dẫn nấu 1 món cụ thể.',
    titlePlaceholder: 'VD: 5 nguồn bổ sung Đạm & Sắt thực vật dễ hấp thu nhất cho người ăn chay',
    excerptPlaceholder: 'Tóm tắt giá trị dinh dưỡng hoặc câu hỏi sức khỏe mà bài viết giải đáp...',
    defaultCover: '/images/fresh-vegetables.png',
    contentTemplate: `## 📌 Vấn đề dinh dưỡng cần lưu ý
Nhiều người mới bắt đầu ăn chay thường băn khoăn làm sao để cân bằng đủ đạm thực vật và vi chất mỗi ngày mà không bị thiếu hụt năng lượng.

## 🔬 Phân tích & Giải pháp khoa học
- **Nhóm thực phẩm chủ lực**: Kết hợp họ đậu (đậu gà, đậu lăng, đậu hũ) cùng ngũ cốc nguyên cám (gạo lứt, yến mạch).
- **Mẹo tăng hấp thu**: Bổ sung thực phẩm giàu Vitamin C (cam, ớt chuông, cà chua) trong bữa ăn để tăng khả năng hấp thu sắt không heme từ thực vật.

## ✅ Lời khuyên áp dụng thực tế
- Chia đều lượng đạm thực vật vào cả 3 bữa chính Sáng - Trưa - Tối và bổ sung các loại hạt vào bữa phụ.`
  },
  GREEN_LIVING: {
    category: 'GREEN_LIVING',
    badgeLabel: '🌱 Lan tỏa Ăn chay & Lối sống Xanh',
    shortLabel: 'Lan tỏa sống xanh',
    emoji: '🌱',
    aiMode: 'KNOWLEDGE_INSIGHT',
    aiActionLabel: '🌱 AI Phân tích Giá trị & Tư vấn Lộ trình Xanh',
    description: 'Chia sẻ câu chuyện truyền cảm hứng ăn chay, mẹo tiết kiệm chi tiêu, bảo vệ môi trường. AI sẽ phân tích thông điệp, gợi ý thói quen thực hành và kết nối trực tiếp với Chatbot.',
    classificationRule: 'Rule phân loại: Nội dung truyền cảm hứng, câu chuyện cá nhân, lối sống bền vững, mẹo đi chợ tiết kiệm hoặc lan tỏa tinh thần ăn chay.',
    titlePlaceholder: 'VD: Hành trình 30 ngày ăn chay tự nấu tại nhà: Nhẹ bụng, tiết kiệm và tràn đầy năng lượng',
    excerptPlaceholder: 'Chia sẻ ngắn gọn cảm hứng hoặc bài học tâm đắc từ hành trình sống xanh của bạn...',
    defaultCover: '/images/vegan-tofu-meal.png',
    contentTemplate: `## 🌱 Câu chuyện & Cảm hứng bắt đầu
Chia sẻ lý do hoặc khoảnh khắc khiến bạn bắt đầu yêu thích những bữa ăn thuần thực vật thanh đạm và lối sống xanh bền vững.

## ✨ Những thay đổi tích cực mình nhận được
- **Về sức khỏe & tinh thần**: Cơ thể nhẹ nhàng, giấc ngủ sâu hơn và tiêu hóa tốt hơn.
- **Về chi tiêu & căn bếp**: Tự chuẩn bị nguyên liệu tươi theo mùa vừa an toàn vừa tiết kiệm chi phí.

## 💬 Thông điệp gửi tới cộng đồng VEGEAI
- Chỉ cần bắt đầu từ 1–2 bữa chay mỗi tuần, bạn đã tạo nên thay đổi tuyệt vời cho sức khỏe và môi trường!`
  },
  EXPLORATION: {
    category: 'EXPLORATION',
    badgeLabel: '📍 Review Quán chay & Khám phá Nguyên liệu',
    shortLabel: 'Review & Khám phá',
    emoji: '📍',
    aiMode: 'KNOWLEDGE_INSIGHT',
    aiActionLabel: '🧭 AI Tổng hợp Điểm nhấn & Tư vấn Trải nghiệm',
    description: 'Review trải nghiệm quán chay ngon, giới thiệu nguyên liệu đặc sản vùng miền. AI sẽ tổng hợp điểm nổi bật và hỗ trợ định vị quán chay hoặc tư vấn cách làm món tương tự.',
    classificationRule: 'Rule phân loại: Đánh giá không gian/món ăn tại quán chay, giới thiệu nông sản/nguyên liệu mới hoặc khám phá ẩm thực vùng miền.',
    titlePlaceholder: 'VD: Review không gian & thực đơn chay thanh tịnh cuối tuần cho gia đình',
    excerptPlaceholder: 'Điểm ấn tượng nhất về món ăn, nguyên liệu hoặc địa điểm bạn muốn giới thiệu...',
    defaultCover: '/images/vietnamese-vegan-table.png',
    contentTemplate: `## 📍 Giới thiệu Địa điểm / Nguyên liệu khám phá
- **Tên quán / Nguyên liệu**: ...
- **Khu vực / Đặc trưng**: Không gian ấm cúng, nguyên liệu tươi mới trong ngày.

## 🍽️ Trải nghiệm hương vị & Điểm cộng
- Món đáng thử nhất và cảm nhận về cách chế biến thanh đạm, ít dầu mỡ.
- Mức giá tham khảo và sự phù hợp cho bữa ăn gia đình / bạn bè.

## ⭐ Đánh giá tổng kết
- Gợi ý thời điểm ghé thăm hoặc mẹo chọn mua nguyên liệu chuẩn nhất.`
  }
};

/**
 * Best-Rule Classifier: Determines whether a post should be analyzed by AI as a Cooking Recipe (Step-by-step + Ingredients)
 * or as a Knowledge / Lifestyle / Review article (Key Insights + Nutritional/Lifestyle Advice + Chatbot Consultation).
 */
export function resolvePostAiMode(post: Pick<BlogPost, 'category' | 'title' | 'excerpt' | 'content' | 'videoUrl'>): 'RECIPE_STEPS' | 'KNOWLEDGE_INSIGHT' {
  if (post.category === 'KITCHEN' || Boolean(post.videoUrl)) {
    return 'RECIPE_STEPS';
  }
  const text = `${post.title || ''} ${post.excerpt || ''} ${post.content || ''}`.toLowerCase();
  const hasExplicitRecipeStructure =
    (text.includes('nguyên liệu') && (text.includes('bước 1') || text.includes('cách làm') || text.includes('các bước thực hiện'))) ||
    /công thức nấu|hướng dẫn nấu|cách nấu món/i.test(post.title || '');
  if (hasExplicitRecipeStructure && post.category !== 'GREEN_LIVING' && post.category !== 'NUTRITION') {
    return 'RECIPE_STEPS';
  }
  return 'KNOWLEDGE_INSIGHT';
}

export const blogStatuses: Record<BlogStatus, string> = {
  ARCHIVED: 'Kho đã ẩn',
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Bị từ chối'
};
