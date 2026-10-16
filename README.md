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
- Tổng quan hiển thị mục tiêu dinh dưỡng, công thức và tủ lạnh từ backend; lượng nước và ghi chú đi chợ lưu riêng trên trình duyệt theo tài khoản.

## Bắt đầu

### Yêu cầu

- Node.js 20.19+ hoặc 22.12+ (theo yêu cầu Vite 8)
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

- Xác thực đã kết nối backend; tài khoản mới phải xác minh OTP email trước khi đăng nhập.
- Một số tính năng ở menu điều hướng có dạng demo, nhằm thể hiện luồng UX của sản phẩm.
- Dự án có file `ARCHITECTURE.md` mô tả kiến trúc tổng thể nếu bạn muốn tìm hiểu sâu hơn.

## Đóng góp

Mọi đóng góp đều được chào đón. Nếu bạn muốn cải thiện UI, quy trình auth, hoặc thêm tính năng mới, hãy mở PR với mô tả rõ ràng.

## Tác giả

Dự án frontend thuộc nhóm SWP391 - VEGEAI.

## License

Dự án hiện chưa khai báo license cụ thể trong repo.

## Kết nối backend và các API đã tích hợp

Frontend tích hợp theo controller/DTO trong file ZIP backend được cung cấp. Backend mặc định chạy tại `http://localhost:8081`.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Mặc định trình duyệt gọi `/api`, Vite proxy tới `http://localhost:8081`. Đổi `API_PROXY_TARGET` trong `.env` nếu backend chạy ở địa chỉ khác; khởi động lại Vite sau khi đổi cấu hình.

| Màn hình / chức năng | API backend |
| --- | --- |
| Đăng ký | `POST /api/auth/register` |
| Xác minh email | `POST /api/auth/verify-email` |
| Gửi lại OTP (cooldown 30 giây) | `POST /api/auth/resend-otp` |
| Đăng nhập bằng username hoặc email | `POST /api/auth/login` |
| Khôi phục phiên / làm mới token | `POST /api/auth/refresh` |
| Đăng xuất | `POST /api/auth/logout` |
| Quên / đặt lại mật khẩu | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Hồ sơ người dùng | `GET /api/users/me`, `PUT /api/users/me` |
| Dinh dưỡng / tính mục tiêu | `/api/nutrition/profile`, `/api/nutrition/calculate`, `/api/nutrition/options` |
| Công thức / lọc / chi tiết | `POST /api/recipes/filter`, `GET /api/recipes/tags`, `GET /api/recipes/{id}` |
| Gợi ý món từ tủ lạnh | `GET /api/recipes/fridge-match` |
| Tìm quán / siêu thị / cửa hàng | `/api/places/nearby`, `/api/places/search`, `/api/places/categories` |
| Quán chay trên bản đồ | `/api/places/verified/nearby`, `/api/places/verified/search` |
| Thông báo tài khoản | `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/{id}/read`, `/api/notifications/read-all` |
| Admin quản lý công thức / thẻ | `/api/admin/recipes`, `/api/admin/recipes/{id}`, `/api/admin/tags`, `/api/admin/tags/{id}` |
| AI Bếp Trưởng (`/ai-chef`) | `POST /api/ai/chat` |
| Quét Tủ Lạnh (`/fridge-scan`) | `POST /api/ai/fridge-scan` (multipart field `image`) |

Luồng đăng ký: nhập username, họ tên, email, mật khẩu → nhập OTP 6 số tại `/verify-email` → đăng nhập. Trang xác minh cũng truy cập được từ trang đăng nhập để gửi lại mã. Mã OTP lấy từ email thật; frontend không sinh hoặc hiển thị mã giả.

Mật khẩu được chuyển thành SHA-256 hex bằng Web Crypto theo hợp đồng backend. Access token chỉ giữ trong bộ nhớ, refresh token do backend lưu bằng HttpOnly cookie; mọi request gửi `credentials: include`. “Ghi nhớ đăng nhập” chỉ lưu dấu hiệu có phiên vào localStorage, còn phiên thông thường dùng sessionStorage. Tải lại trang sẽ gọi refresh cookie và tải hồ sơ thật. Refresh được gộp khi nhiều request đồng thời, HTTP 401 được thử lại tối đa một lần; lỗi mạng/403/429 được hiển thị để người dùng xử lý.

Hồ sơ chỉ lưu các trường backend hỗ trợ, dùng ngày sinh thay vì tuổi, cho phép đặt mục tiêu calo và đọc BMI do backend trả về. Email chỉ đọc. Backend chưa hỗ trợ xóa giá trị ngày sinh/chiều cao/cân nặng/mục tiêu calo đã lưu bằng null, nên các trường đó không thể bỏ trống sau khi đã có dữ liệu.

AI hỗ trợ khách và người đã đăng nhập theo backend. Chat giữ `sessionId`, hiển thị quota dùng thử từ phản hồi; quét ảnh kiểm tra định dạng JPG/PNG/WEBP và dung lượng tối đa 5 MB. Khóa Gemini chỉ cấu hình ở backend, không đưa vào frontend.

### Chạy backend

Cần chạy dự án Spring Boot cập nhật tại `D:\be\SWP391_FA26_VEGEAI_PROJECT_THEVEGANCROCO`, cấu hình PostgreSQL, Redis, SMTP để nhận OTP và Gemini để dùng AI theo README backend. Frontend không tự khởi động các dịch vụ này. Có thể mở Swagger tại `http://localhost:8081/swagger-ui.html` để kiểm tra backend. Script `scripts/start-backend.ps1` mặc định trỏ tới thư mục này.

### Xử lý lỗi 502 và Java runtime trên Windows

Nếu đăng ký báo `POST /api/auth/register 502`, kiểm tra backend đã khởi động ở cổng 8081. Thông báo React DevTools chỉ là gợi ý của React, không gây lỗi API.

Log `class file version 65.0 ... recognizes ... 61.0` nghĩa là code Java 21 đang được chạy bằng Java 17. `java -version` có thể là 21 nhưng Maven vẫn dùng 17 vì `JAVA_HOME` trỏ tới JDK cũ; kiểm tra bằng `.\mvnw.cmd -version`.

Máy hiện tại đã có JDK 21 tại `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot`. Sau khi chạy PostgreSQL/Redis bằng Docker Compose, có thể chạy từ thư mục frontend:

```powershell
.\scripts\start-backend.ps1
```

Script chọn JDK 21 cho tiến trình Maven, đọc cấu hình database/cache từ các container `vegeai-postgres` và `vegeai-redis` đang chạy để tránh sai mật khẩu. Không in mật khẩu và không thay đổi JAVA_HOME của Windows lâu dài. Giữ terminal chạy backend; dừng bằng Ctrl+C. Có thể truyền `-BackendPath` và `-JdkHome` khi đổi máy hoặc thư mục.

Hoặc chỉ sửa Java trong terminal backend hiện tại:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd -version
.\mvnw.cmd spring-boot:run
```

Cách chạy trực tiếp này cần DB_PASSWORD/REDIS_PASSWORD khớp cấu hình Docker. Khi backend đã chạy, `http://localhost:5173/api-docs` phải trả JSON OpenAPI thay vì 502.

### Triển khai production

`API_PROXY_TARGET` chỉ dùng cho máy chủ phát triển/preview Vite. Khi triển khai file `dist`, cấu hình reverse proxy `/api` tới backend và fallback route frontend về `index.html`. Nếu dùng backend URL trực tiếp, đặt `VITE_API_BASE_URL=https://your-backend.example/api` trước khi build và cấu hình CORS backend cho origin frontend cùng cookie phù hợp. Cấu hình backend hiện dùng `SameSite=Strict`; triển khai frontend/backend cùng site giúp refresh cookie hoạt động đúng. Web Crypto cần HTTPS hoặc localhost.

### Kiểm tra và giới hạn

```bash
npm test
npm run build
```

Kiểm tra tự động dùng phản hồi mô phỏng theo DTO backend để xác nhận request, SHA-256, OTP, session/cookie, Bearer, refresh đồng thời, lỗi/đăng xuất và multipart ảnh. Đây không phải kiểm thử end-to-end với PostgreSQL/SMTP/Gemini thật.

Backend cập nhật đã hỗ trợ công thức, lọc phân trang, thẻ phân loại, so khớp tủ lạnh và địa điểm. Trang công thức đọc dữ liệu từ backend, có trạng thái tải/lỗi/rỗng; ID không tồn tại trả lỗi thay vì hiển thị món khác. Bộ lọc dùng thẻ từ máy chủ, AND/OR, loại trừ, thời gian, calo, đạm và độ khó.

Trang `/fridge` có mục gợi ý món dựa trên nguyên liệu đang lưu. Trang `/admin` có biểu mẫu tạo/sửa/xóa công thức và tạo/xóa thẻ, yêu cầu quyền ADMIN. Để sửa công thức, lấy ID từ URL `/recipe/{id}` và tải vào biểu mẫu. API hiện không có danh sách riêng cho bản nháp/lưu trữ; giữ ID trả về khi lưu để tải lại các món này.

Trang quán chay dùng các endpoint `/api/places/verified/*`, chỉ nhận kết quả thật có Google Places type `vegetarian_restaurant`, không sử dụng fallback/mock và ẩn các POI chung trên bản đồ Google. Cần cấu hình `VITE_GOOGLE_MAPS_API_KEY` bằng khóa Maps JavaScript API bị giới hạn theo HTTP referrer; không dùng hoặc đưa khóa backend vào frontend. Nhãn Google là tiêu chí lọc chứ không bảo đảm nhà hàng không bán món mặn; cần xác minh thủ công trước khi coi là danh sách thuần chay tuyệt đối.

Chuông thông báo đọc dữ liệu tài khoản từ API có xác thực và cập nhật số chưa đọc theo chu kỳ 60 giây. API ghi nhận thay đổi hồ sơ/dinh dưỡng, thao tác kho lạnh/thực đơn, bài viết chờ duyệt, kết quả duyệt/trả lời hỏi đáp và bình luận/lưu video. Danh sách phân trang bắt đầu từ `page=0`; chủ tài khoản mới có thể đọc/sửa thông báo của họ.

Dashboard hiển thị mục tiêu dinh dưỡng từ `/api/nutrition/profile`, trạng thái tủ lạnh từ `/api/fridge/summary` và công thức từ API lọc. Chưa có hồ sơ thì hiển thị trạng thái trống và liên kết thiết lập, không dùng số liệu dinh dưỡng giả. Theo dõi nước và ghi chú đi chợ lưu trong localStorage theo tài khoản; chưa đồng bộ sang thiết bị khác.

Blog đã kết nối API với luồng bản nháp → chờ duyệt → xuất bản/từ chối. Người dùng viết tại `/blog/write`, quản lý tại `/blog/my-posts`; admin duyệt tại `/admin/blog`. Chỉ bài đã duyệt xuất hiện trên Blog công khai. Xem `docs/blog-workflow.md` để biết API và quy tắc sửa/gửi lại.

Hỏi đáp tại `/questions` và Video tại `/videos` đã nối API database. User gửi/theo dõi câu hỏi, bình luận và lưu video; admin quản lý tại `/admin/questions` và `/admin/videos`. Có tìm kiếm, phân trang, xác nhận xóa và xử lý version khi cập nhật. Xem `docs/community-screens.md` để biết đầy đủ các màn hình và kiểm tra.

Thực đơn tuần, nhật ký ăn uống, danh sách đi chợ đồng bộ và lưu công thức chưa có API trong bản backend này. Google login chưa có API. Kiểm thử tự động dùng fixture cho các màn hình yêu cầu đăng nhập; không ghi hoặc xóa dữ liệu thật khi kiểm thử. Prompt và đường dẫn ba ảnh món ăn mới nằm trong `docs/ui-image-update.md`.
