# Man hinh Hoi dap va Video

## Duong dan

- `/questions`: cau hoi cong khai, tim kiem, loc da/chua tra loi, phan trang va gui cau hoi.
- `/questions/mine`: cau hoi cua toi va loc trang thai.
- `/questions/:id`, `/questions/mine/:id`: chi tiet cong khai/rieng, cau tra loi, ly do tu choi.
- `/videos`: danh sach video, loc danh muc, tim kiem, phan trang.
- `/videos/saved`: video da luu cua tai khoan hien tai, bo luu.
- `/videos/:id`: trinh phat, luu/bo luu, tao/sua/xoa binh luan, video lien quan.
- `/admin/questions`: hang cho duyet va tim kiem cau hoi.
- `/admin/questions/:id`: luu cau tra loi, duyet/tu choi kem ly do, xoa cau hoi.
- `/admin/videos`: danh sach ca video nhap/cong khai, tim kiem, loc, xoa.
- `/admin/videos/new`, `/admin/videos/:id/edit`: tao/sua video va xem truoc anh bia.

Menu chinh co Hoi dap/Video; menu mo rong tren dien thoai hien tat ca muc.
Trang admin he thong co lien ket den hai khu vuc quan tri moi.

## Tich hop

`communityService` dung `apiClient` hien tai: Bearer trong bo nho, refresh
cookie HttpOnly, khong tao cach dang nhap hoac luu token moi. Guest duoc
doc noi dung cong khai. Sau dang nhap, nguoi dung quay lai duong dan da chon.

Tat ca du lieu lay tu API `/api/questions`, `/api/videos` va `/api/admin/...`.
Khong dung du lieu mau hay tu dong sao chep video/cau hoi tu website tham khao.
Khi database chua co noi dung, cac man hinh hien trang thai rong.

Admin dung `version` moi nhat do BE tra ve cho cac lenh sua, duyet, xoa.
Loi 409 duoc hien ra, khong tu thu lai de ghi de noi dung cua nguoi khac.
Gui cau tra loi va duyet la hai thao tac rieng, dung theo API.
Frontend khong cho hien video nhap/cau hoi chua duyet thanh noi dung cong khai.

Trinh phat chi nhung iframe tu YouTube/YouTube-nocookie va Vimeo theo
danh sach hostname chinh xac. MP4/WebM/OGG dung video HTML goc; URL HTTP(S)
khac mo bang lien ket ra ngoai. Khong nhung iframe tuy y tu du lieu admin.
Chu va binh luan render bang React text, khong dung innerHTML.

Anh bia lay tu API, anh YouTube hoac anh local du phong. Anh chon theo noi
dung that; khong gan video mau vao database de lam day giao dien.

## Kiem tra

```sh
npm test
npm run build
```

Test service bao phu duong dan/method, query, phan quyen guest, versions,
loi 409, yeu thich va kiem tra URL/trinh phat.
Playwright da kiem tra luong nguoi dung/admin voi API fixture co trang thai
co lap, anh local thuc te, noi dung XSS dang text, loi/retry, auth guard,
quay lai sau dang nhap va bo cuc desktop/mobile (320 va 390 px).
Khong ghi/xoa du lieu that khi kiem tra thao tac quan tri.
