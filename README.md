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
/                       -> Trang khám phá công thức
/recipe/:id            -> Trang chi tiết món ăn
/dashboard             -> Dashboard chính
/login                 -> Đăng nhập
/register              -> Đăng ký
/forgot-password       -> Quên mật khẩu
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
- Dùng để mô phỏng trải nghiệm người dùng đã đăng nhập

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

- Dự án hiện đang có chế độ thử nghiệm người dùng với khả năng chuyển đổi giữa Guest và Authorized User trong giao diện.
- Một số tính năng ở menu điều hướng có dạng demo, nhằm thể hiện luồng UX của sản phẩm.
- Dự án có file `ARCHITECTURE.md` mô tả kiến trúc tổng thể nếu bạn muốn tìm hiểu sâu hơn.

## Đóng góp

Mọi đóng góp đều được chào đón. Nếu bạn muốn cải thiện UI, quy trình auth, hoặc thêm tính năng mới, hãy mở PR với mô tả rõ ràng.

## Tác giả

Dự án frontend thuộc nhóm SWP391 - VEGEAI.

## License

Dự án hiện chưa khai báo license cụ thể trong repo.
