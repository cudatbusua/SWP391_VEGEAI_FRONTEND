# VEGEAI Frontend

VEGEAI Frontend là giao diện React + TypeScript cho nền tảng khám phá món ăn chay, đề xuất công thức, và theo dõi hồ sơ dinh dưỡng cá nhân. Dự án tập trung vào trải nghiệm người dùng cho việc tìm kiếm công thức, xem chi tiết món ăn, đăng nhập/đăng ký, và quản lý dashboard sức khỏe.

## Tóm tắt dự án

- Khám phá các công thức nấu ăn chay theo nhu cầu cá nhân
- Xem chi tiết từng món ăn với thông tin dinh dưỡng và mô tả
- Hệ thống đăng nhập, đăng ký, quên mật khẩu
- Dashboard tổng quan và hồ sơ dinh dưỡng
- Giao diện hiện đại sử dụng React, Vite và Tailwind CSS

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite
- React Router DOM
- Tailwind CSS
- Lucide React

## Cấu trúc thư mục

```text
SWP391_VEGEAI_FRONTEND/
├─ public/
├─ scripts/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ features/
│  │  ├─ auth/
│  │  └─ dashboard/
│  ├─ hooks/
│  ├─ layouts/
│  ├─ pages/
│  │  ├─ DashboardPage.tsx
│  │  ├─ LoginPage.tsx
│  │  ├─ RegisterPage.tsx
│  │  ├─ ForgotPasswordPage.tsx
│  │  ├─ RecipeDiscoveryPage.tsx
│  │  └─ RecipeDetailPage.tsx
│  ├─ services/
│  ├─ store/
│  │  └─ AuthContext.tsx
│  ├─ styles/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ style.css
│  ├─ types.ts
│  └─ utils/
├─ .gitignore
├─ ARCHITECTURE.md
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

## Các route chính

```text
/                         -> Khám phá và lọc công thức
/recipe/:id              -> Chi tiết công thức, lưu món và đưa nguyên liệu vào danh sách
/saved-recipes           -> Công thức đã lưu (cần đăng nhập)
/dashboard               -> Tổng quan cá nhân (cần đăng nhập)
/onboarding               -> Hồ sơ dinh dưỡng (cần đăng nhập)
/meal-plan                -> Kế hoạch bữa ăn tuần (cần đăng nhập)
/grocery-list             -> Danh sách đi chợ (cần đăng nhập)
/ai-assistant             -> Giao diện trợ lý/nhận diện nguyên liệu (cần đăng nhập)
/notifications            -> Hộp thông báo (cần đăng nhập)
/restaurants              -> Tìm quán chay
/restaurants/:id          -> Chi tiết quán và đánh giá
/reviews                  -> Viết/đọc đánh giá (cần đăng nhập)
/blog                     -> Bài viết đã xuất bản
/blog/write               -> Soạn và gửi bài viết (cần đăng nhập)
/blog/preview             -> Xem trước bản nháp và gửi kiểm duyệt (cần đăng nhập)
/admin                    -> Tổng quan, kiểm duyệt và lịch sử admin
/login, /register         -> Đăng nhập và tạo tài khoản
/forgot-password          -> Khôi phục mật khẩu
```

## Tính năng chính

### 1. Khám phá công thức
- Hiển thị danh sách món ăn chay theo giao diện thân thiện
- Dễ dàng tìm kiếm và xem chi tiết công thức

### 2. Trang chi tiết món ăn
- Hiển thị thông tin nguyên liệu, cách làm, đánh giá và mô tả
- Dành cho trải nghiệm xem công thức chuyên sâu

### 3. Đăng nhập và xác thực
- Cung cấp luồng đăng nhập, đăng ký và khôi phục mật khẩu
- Sử dụng `AuthContext` để quản lý trạng thái người dùng

### 4. Dashboard người dùng
- Giao diện tổng quan cá nhân
- Tab "Tổng quan cá nhân" và "Hồ sơ dinh dưỡng"
- Dữ liệu hồ sơ, danh sách đi chợ, công thức lưu và kế hoạch tuần được chia sẻ giữa các trang

### 5. Bản demo các vai trò và luồng giao diện
- Trong `npm run dev`, dùng nút **Demo khách hàng** hoặc **Demo Admin** trên thanh trạng thái để vào giao diện mà không cần tạo tài khoản backend.
- Tài khoản demo chỉ là trạng thái frontend, không phát hành access token, không tạo phiên đăng nhập backend và không thay thế quyền của tài khoản backend thật.
- Các luồng có thể trình diễn: lưu công thức; tạo kế hoạch rồi thêm nguyên liệu vào danh sách đi chợ; xem quán rồi gửi đánh giá; soạn, xem trước, gửi bài, duyệt bài và xem bài đã xuất bản; kiểm duyệt công thức/báo cáo và xem lịch sử admin.
- Các dữ liệu minh họa nằm trong `localStorage` với tiền tố `vegeai-demo:` để trạng thái còn lại khi chuyển trang hoặc tải lại. Đây chưa phải dữ liệu tài khoản nhiều người dùng và không được gửi lên backend.
- `src/hooks/useDemoState.ts` là adapter tạm cho trạng thái UI. Khi API được thống nhất, thay các thao tác demo bằng service/repository của từng tính năng và giữ nguyên form, route, trạng thái tải/lỗi tương ứng.
- Nội dung và phản hồi AI/quán/bài viết hiện là dữ liệu mẫu; nhãn demo trên giao diện nhắc rõ thao tác nào chưa gọi API.

## Bắt đầu

### Yêu cầu

- Node.js >= 18
- npm hoặc yarn

### Cài đặt

```bash
npm install
```

### Chạy môi trường phát triển

```bash
npm run dev
```

Ứng dụng sẽ chạy trên địa chỉ mặc định của Vite, thường là:

```text
http://localhost:5173
```

### Build production

```bash
npm run build
```

### Xem bản build

```bash
npm run preview
```

## Scripts có sẵn

Trong file `package.json`, dự án có các lệnh sau:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

## Lưu ý

- Auth thật tiếp tục xác thực với backend qua `src/services/authService.ts`; chế độ Demo chỉ chạy trong môi trường Vite development.
- Những API chưa có hợp đồng backend được thể hiện bằng dữ liệu mẫu và trạng thái frontend, không giả làm thao tác đã lưu trên máy chủ.
- Dự án có file `ARCHITECTURE.md` mô tả kiến trúc tổng thể nếu bạn muốn tìm hiểu sâu hơn.

## Đóng góp

Mọi đóng góp đều được chào đón. Nếu bạn muốn cải thiện UI, quy trình auth, hoặc thêm tính năng mới, hãy mở PR với mô tả rõ ràng.

## Tác giả

Dự án frontend thuộc nhóm SWP391 - VEGEAI.

## License

Dự án hiện chưa khai báo license cụ thể trong repo.
