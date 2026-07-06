# Checklist deploy Phần B: push GitHub + Vercel

Cho Long dev. Đã review code thật ngày 06/07/2026.

## Tình trạng code (đã kiểm, không phải làm lại)

Phần A của plan cũ (chuyển session RAM sang DB để chạy serverless) đã hoàn thành trong code:

- Phiên đăng nhập (token, OTP, device binding, rate limit, notification read) đã nằm ở Postgres, không còn Map trong RAM.
- Schema đã có đủ 5 bảng session: auth_tokens, otp_sessions, device_bindings, otp_requests, notification_reads.
- Đã tách `server/app.ts` (createApp) và có entry serverless `api/index.ts` + `vercel.json`.
- Seed đã chặn tự chạy ở production (`server/routes.ts`: chỉ seed khi không phải production hoặc có cờ SEED_ON_BOOT=1).
- `npm run check` (tsc) sạch, 0 lỗi.

Kết luận: KHÔNG làm lại Phần A. Chỉ chạy Phần B dưới đây.

## Bước 1. Tạo database Neon

- Tạo project Postgres free tại neon.tech.
- Lấy chuỗi kết nối POOLED (endpoint có chữ `-pooler`), dạng
  `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`.
- Dùng pooled cho serverless, không dùng endpoint direct.

## Bước 2. Đưa schema và seed lên Neon (chạy local, trỏ Neon)

```
DATABASE_URL="<neon-pooled-url>" npm run db:push
DATABASE_URL="<neon-pooled-url>" npm run seed
```

- `db:push` tạo mọi bảng gồm 5 bảng session.
- `seed` chạy một lần, idempotent (chỉ chèn khi bảng rỗng).
- Kiểm: vào Neon SQL editor thấy các bảng users, orders, auth_tokens, commission_records.

## Bước 3. Push code lên GitHub

```
git status                 # xác nhận nhánh feature/new-ui-redesign, ~133 file
git add -A
git commit -m "feat: new UI + session sang DB, sẵn sàng deploy"
git push origin feature/new-ui-redesign
```

- Đảm bảo KHÔNG commit .env (đã có trong .gitignore).

## Bước 4. Deploy Vercel

- Import repo PhuN291/commission-app-np.
- Production Branch: `feature/new-ui-redesign` (không đụng main). Hoặc merge vào main rồi deploy main, tùy chọn.
- Vercel tự đọc `vercel.json`: buildCommand `npm run vercel-build`, output `dist/public`. Framework preset: Other.
- Environment Variables (Production):
  - `DATABASE_URL` = chuỗi Neon pooled ở bước 1
  - `NODE_ENV` = `production`
- Deploy.

## Bước 5. Bảo mật, bắt buộc trước khi đưa URL cho bất kỳ ai

- Bật Vercel Deployment Protection (Password hoặc SSO) trong Project Settings.
- Lý do: đăng nhập app hiện chỉ là số điện thoại nhân viên cộng mã tạm 062026, vì Zalo OA chưa nối. URL công khai nghĩa là ai biết một số điện thoại nhân viên và con số 062026 đều vào xem được toàn bộ lương thưởng phòng khám.
- Giữ nguyên 062026, không xóa, vì đó là lối đăng nhập duy nhất lúc này.

## Bước 6. Nghiệm thu sau deploy

- Mở URL, đăng nhập một số điện thoại staff + 062026.
- Bấm qua lại Trang chủ, Đơn hàng, Hoa hồng nhiều lần liên tiếp. Không được văng ra bắt đăng nhập lại. Đây là bằng chứng phiên sống qua cold-start (token đã ở DB).
- Đăng nhập từ trình duyệt hoặc máy khác. CEO và Trưởng ca phải nhận thông báo đổi thiết bị.
- Kiểm Neon còn dữ liệu seed.

## Chỗ dễ vấp

- SSL Neon: `server/db.ts` tạo pg Pool từ DATABASE_URL, không set SSL tường minh. Neon bắt buộc SSL. Giữ `sslmode=require` trong URL (Neon cấp sẵn). Nếu deploy báo lỗi kiểu self-signed certificate hoặc no encryption, thêm `ssl: { rejectUnauthorized: false }` vào Pool trong `server/db.ts`, hoặc đặt biến `PGSSLMODE=require` trên Vercel.
- Dùng đúng endpoint pooled (`-pooler`) cho serverless.
- Bí mật: DATABASE_URL chỉ nhập ở máy và ở Vercel. Không dán vào chat, không commit.

## Nếu vấp serverless mà muốn nhẹ đầu

Code này chạy được nguyên trạng trên Railway hoặc Render như một server thường (không cần bận tâm cold-start hay SSL serverless). Chỉ cần Postgres, đặt DATABASE_URL, chạy `npm run build && npm start`. Cân nhắc nếu Vercel phát sinh rắc rối không đáng.
