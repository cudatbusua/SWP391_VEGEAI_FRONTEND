# VEGEAI Frontend Architecture

Ứng dụng React 19 + TypeScript chạy với Vite 8 và React Router. Các trang giữ giao diện, service chịu trách nhiệm gọi backend Spring Boot và chuyển đổi DTO.

```text
src/
  App.tsx                  # Router và AuthProvider
  pages/                   # Recipe, dashboard, auth, verify email, AI chat, fridge scan
  layouts/                 # MainLayout và AuthLayout
  features/auth/components # Form đăng nhập, đăng ký, khôi phục mật khẩu
  features/dashboard/components # Tổng quan minh họa và form hồ sơ API
  services/
    apiClient.ts           # Fetch, API envelope, cookie, Bearer, timeout, refresh và lỗi
    authService.ts         # Auth DTO, SHA-256, OTP và phiên
    userService.ts         # GET/PUT /users/me
    aiService.ts           # Chat và multipart scan
  store/AuthContext.tsx    # User hiện tại, khôi phục phiên, cập nhật user và logout
  types/api.ts             # DTO tương ứng backend
  types/auth.ts            # Kiểu dữ liệu form và user giao diện
  utils/password.ts        # SHA-256 bằng Web Crypto
  data/mockData.ts         # Công thức mẫu khi backend chưa có API
  components/              # Input/Button dùng chung
  styles/                  # CSS và Tailwind
 tests/api-integration.test.mjs # Kiểm tra hợp đồng API với phản hồi mô phỏng
```

Luồng request: component → service → apiClient → `/api` → Vite proxy (dev/preview) hoặc reverse proxy (production) → Spring Boot. `VITE_API_BASE_URL` chọn base URL; `API_PROXY_TARGET` chọn backend cho Vite.

Access token giữ trong bộ nhớ. Backend cấp refresh token bằng HttpOnly cookie. localStorage hoặc sessionStorage chỉ lưu dấu hiệu phiên; tải lại trang gọi refresh và GET hồ sơ để xác thực. Refresh dùng một promise chung để gộp yêu cầu đồng thời; 401 thử lại tối đa một lần. Mất quyền xác thực phát sự kiện để AuthContext xóa user. Các phản hồi cũ không được phép khôi phục hoặc vô hiệu hóa phiên mới.

Đăng ký trả về tài khoản chờ xác minh; frontend chuyển sang OTP và yêu cầu đăng nhập sau khi xác minh. Profile gửi đúng các trường backend hỗ trợ, email chỉ đọc, BMI lấy từ phản hồi backend. Chat giữ sessionId do server cấp; quét ảnh gửi FormData với field image và không tự đặt Content-Type multipart.

Không có tầng server React/Next.js, server actions hay middleware auth phía frontend. `src/proxy.ts` cũ là placeholder, không tham gia request. Kiểm soát quyền cuối cùng do backend thực hiện; route dashboard frontend có guard để hướng người chưa đăng nhập về login.

Xem README.md để cấu hình backend, triển khai và danh sách tính năng còn dùng dữ liệu minh họa.
