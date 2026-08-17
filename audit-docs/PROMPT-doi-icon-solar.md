# Prompt cho Claude Code: đổi bộ icon sang Solar

## Mục tiêu

Đổi bộ icon của app từ Material Symbols sang **Solar** (bộ của 480 Design, lấy qua Iconify), dùng
kiểu **Bold Duotone** làm mặc định. Lý do chọn: kiểu hai tông có chiều sâu hơn icon phẳng hiện tại.

Giữ nguyên kiến trúc đang có: sinh ra một file React duy nhất qua script, icon nhúng thẳng vào mã
nguồn, không gọi mạng lúc chạy.

## Ràng buộc bắt buộc

1. **Không dùng component tải icon từ máy chủ Iconify.** Phải dùng gói dữ liệu offline
   `@iconify-json/solar`, cài ở devDependencies. App chạy ở phòng khám mạng yếu, icon phải luôn hiện.
2. Giữ nguyên chữ ký component `{size, strokeWidth, className, color, fill}` và alias type
   `LucideIcon`. Vẫn phải nhận `strokeWidth` dù Solar không dùng tới, bỏ đi là lỗi biên dịch hàng loạt
   ở hơn 100 điểm gọi.
3. Không sửa tay `client/src/components/np/icon.tsx`. Đó là file sinh tự động.
4. Không đổi bất kỳ điểm gọi icon nào trong các màn.

---

## Bước 1: Khảo sát trước, DỪNG LẠI báo cáo, chưa sửa gì

Cài `@iconify-json/solar` vào devDependencies.

Đọc file `node_modules/@iconify-json/solar/icons.json`, đối chiếu với bảng `MAP` trong
`script/gen-icons.ts` (khoảng 98 icon, tên bên trái là tên đang dùng trong app).

Lập bảng ánh xạ từ tên đang dùng sang tên icon Solar tương ứng, kiểu `bold-duotone`. Ví dụ dạng tên
Solar: `home-2-bold-duotone`, `user-bold-duotone`, `bell-bold-duotone`.

**Báo cáo lại và dừng ở đây**, gồm:

- Bảng ánh xạ đề xuất cho từng icon.
- Danh sách icon Solar KHÔNG có tương đương, ghi rõ tên nào thiếu.
- Với icon thiếu, đề xuất phương án nhưng không tự quyết.

Không sửa script, không sinh file, chờ duyệt.

Lý do phải dừng: nếu thiếu icon quan trọng thì phải quyết định trước, không được tự thay bằng icon
gần giống rồi làm sai nghĩa.

---

## Bước 2: Sửa script sinh icon (chỉ làm sau khi bước 1 được duyệt)

File `script/gen-icons.ts`. Bốn thay đổi, kèm bẫy phải tránh.

### 2.1 Đổi nguồn

Hiện đọc file SVG rời ở `node_modules/@material-symbols/svg-400/rounded/<tên>.svg`.

Đổi sang đọc `node_modules/@iconify-json/solar/icons.json`. Cấu trúc file này gồm `prefix`, `width`,
`height`, và `icons` là một object với khóa là tên icon, giá trị có trường `body` chứa nội dung SVG.

### 2.2 BẪY LỚN NHẤT: phải giữ nguyên body, không chỉ lấy thuộc tính d

Hàm `extractPaths` hiện tại chỉ bóc thuộc tính `d` của từng thẻ path.

**Tuyệt đối không làm vậy với Solar.** Icon Bold Duotone tạo hiệu ứng hai tông bằng thuộc tính
`opacity` trên một số path. Nếu chỉ lấy `d` thì mất hết lớp mờ, icon thành hình đặc phẳng, mất đúng
cái lý do chọn Solar.

Cách đúng: lấy nguyên chuỗi `body` từ JSON và chèn thẳng vào thẻ svg, giữ đủ mọi thuộc tính gồm
`opacity` và `fill`. Dùng `dangerouslySetInnerHTML` là chấp nhận được vì nội dung lấy từ gói npm lúc
build, không phải dữ liệu người dùng nhập.

### 2.3 Đổi khung nhìn

Material dùng `viewBox="0 -960 960 960"`. Solar dùng hệ 24. Lấy `width` và `height` từ file JSON để
dựng viewBox, đừng đặt cứng. Đặt sai là icon méo hoặc mất tiêu.

### 2.4 Xử lý bản viền cho nút bật tắt

Hiện `fill="none"` được dùng để ép icon về bản viền. Chỗ đang dùng: nút VIP trong
`client/src/pages/customer-detail.tsx` khoảng dòng 407.

Với Material thì bản đặc và bản viền là hai biến thể của cùng một glyph. Với Solar thì đó là hai icon
khác tên: `bold-duotone` và `linear`.

Nên sinh cả hai biến thể cho mỗi icon: `bold-duotone` làm mặc định, `linear` dùng khi truyền
`fill="none"`. Nếu icon nào không có bản `linear` thì dùng `outline`, thiếu cả hai thì báo cáo.

### 2.5 Giữ nguyên phần báo thiếu

Script hiện dừng hẳn và liệt kê icon thiếu. Giữ nguyên hành vi đó, không được sinh icon rỗng.

---

## Bước 3: Sinh và kiểm

1. Chạy `npx tsx script/gen-icons.ts`.
2. Chạy `npm run check`, phải sạch.
3. Chạy build thật, xác nhận không lỗi.
4. Mở app xem bằng mắt ít nhất bốn màn: Trang chủ, Đơn hàng, Chi tiết khách, Tái khám. Kiểm:
   - Icon hiện đủ, không có ô trống.
   - Hiệu ứng hai tông còn nguyên, không bị phẳng thành một màu đặc.
   - Icon ở cỡ nhỏ, khoảng 12 tới 16px, vẫn đọc được hình.
   - Nút VIP ở chi tiết khách đổi được giữa bản viền và bản đặc.
5. So kích thước file `icon.tsx` trước và sau, ghi lại trong báo cáo.

## Việc kèm theo: ghi công giấy phép

Solar dùng giấy phép CC BY 4.0, bắt buộc ghi công tác giả.

Thêm một dòng ghi công ở màn Cài đặt, cuối trang, chữ nhỏ và mờ, nội dung:
"Bộ icon Solar của 480 Design, giấy phép CC BY 4.0."

## Không làm

- Không đổi màu, cỡ chữ, bố cục hay bất cứ thứ gì ngoài icon.
- Không gỡ gói `@material-symbols` khỏi package.json ở đợt này, để còn quay lại được nếu Solar không
  hợp.
- Không tự thay icon thiếu bằng icon gần giống khi chưa được duyệt ở bước 1.

## Báo cáo cuối

Liệt kê: gói đã cài, file đã sửa, số icon sinh ra, icon nào phải thay tên khác so với bước 1, kích
thước file trước sau, và xác nhận đã xem bằng mắt bốn màn.
