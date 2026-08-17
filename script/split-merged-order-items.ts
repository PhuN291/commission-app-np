/**
 * Tách những dòng order_items đang gộp nhiều dịch vụ thành mỗi dịch vụ một dòng.
 *
 * Vì sao có dòng gộp: bảng orders lưu dịch vụ theo kiểu gộp (serviceName nối bằng
 * ", "), mà cổng nhận đơn cũ đọc thẳng từ đó nên đơn hai dịch vụ chỉ đẻ ra MỘT
 * dòng mang cái tên đã nối, số lượng cộng dồn và đơn giá bình quân. Đơn giá bình
 * quân không đúng với dịch vụ nào cả. Cổng nhận đơn nay đã ghi đúng từng dòng
 * (server/ingest.ts), script này dọn nốt đơn cũ.
 *
 * Số lượng của từng dịch vụ KHÔNG khôi phục được từ dòng gộp (chỉ còn tổng), nên
 * đặt về 1 và lấy đơn giá thật trong danh mục. Script tự đối chiếu tổng tiền sau
 * khi tách với orders.total_price, lệch thì BỎ QUA đơn đó và báo ra, không tự ý
 * sửa tiền.
 *
 * Chạy thử (không ghi gì):  npx tsx script/split-merged-order-items.ts
 * Chạy thật:                npx tsx script/split-merged-order-items.ts --ghi
 */
import { eq } from "drizzle-orm";
import { orderItems, orders, services as servicesTable } from "@shared/schema";
import { db } from "../server/db";
import { SERVICE_PACKAGES } from "@/pages/service-detail";

const GHI = process.argv.includes("--ghi");

const dsService = await db.select().from(servicesTable);
const dsItem = await db.select().from(orderItems);
const gop = dsItem.filter((it) => it.serviceName.includes(", "));

console.log(`Tìm thấy ${gop.length} dòng gộp trên tổng ${dsItem.length} dòng.\n`);

let daTach = 0;
let boQua = 0;

for (const it of gop) {
  const don = (await db.select().from(orders).where(eq(orders.id, it.orderId)))[0];
  if (!don) {
    console.log(`  Bỏ qua item ${it.id}: không tìm thấy đơn ${it.orderId}`);
    boQua += 1;
    continue;
  }

  const manh = it.serviceName.split(", ").filter(Boolean);
  const dongMoi: { serviceId: number; serviceName: string; unitPrice: number; cost: number }[] = [];
  let thieu = false;

  for (const ten of manh) {
    const sv = dsService.find((s) => ten === s.title || ten.startsWith(`${s.title} - `));
    if (!sv) {
      console.log(`  Bỏ qua đơn ${don.code}: không tra ra dịch vụ cho "${ten}"`);
      thieu = true;
      break;
    }
    const pkgs = SERVICE_PACKAGES[sv.code] ?? [];
    const dau = `${sv.title} - `;
    const tenGoi = ten.startsWith(dau) ? ten.slice(dau.length) : null;
    const pkg = tenGoi ? pkgs.find((p) => p.name === tenGoi) : undefined;
    if (tenGoi && !pkg) {
      console.log(`  Bỏ qua đơn ${don.code}: không tra ra gói "${tenGoi}" của ${sv.title}`);
      thieu = true;
      break;
    }
    dongMoi.push({
      serviceId: sv.id,
      serviceName: ten,
      unitPrice: pkg ? pkg.price : sv.price,
      cost: sv.defaultCost,
    });
  }

  if (thieu) {
    boQua += 1;
    continue;
  }

  const tongMoi = dongMoi.reduce((s, x) => s + x.unitPrice, 0);
  const tongCu = it.unitPrice * it.quantity;
  console.log(
    `Đơn ${don.code} (item ${it.id}): ${manh.length} dịch vụ, ` +
      `tổng cũ ${tongCu.toLocaleString("vi-VN")}₫ → tổng mới ${tongMoi.toLocaleString("vi-VN")}₫`,
  );
  for (const d of dongMoi) {
    console.log(`    - ${d.serviceName}: 1 × ${d.unitPrice.toLocaleString("vi-VN")}₫`);
  }

  if (tongMoi !== tongCu) {
    console.log(`    LỆCH TIỀN, bỏ qua đơn này để người kiểm tra bằng tay.`);
    boQua += 1;
    continue;
  }

  if (GHI) {
    await db.delete(orderItems).where(eq(orderItems.id, it.id));
    for (const d of dongMoi) {
      await db.insert(orderItems).values({
        orderId: it.orderId,
        serviceId: d.serviceId,
        serviceName: d.serviceName,
        quantity: 1,
        unitPrice: d.unitPrice,
        cost: d.cost,
        // Giữ nguyên phần trạng thái của dòng cũ: tách dòng là việc sửa cách LƯU,
        // không phải sự kiện nghiệp vụ, không được đổi trạng thái hay tiền hoàn.
        status: it.status,
        skippedReason: it.skippedReason,
        performedByUserId: it.performedByUserId,
        recallDueDate: it.recallDueDate,
        refundedAmount: 0,
      });
    }
    daTach += 1;
  }
}

console.log(
  `\n${GHI ? "Đã tách" : "Sẽ tách"} ${GHI ? daTach : gop.length - boQua} đơn, bỏ qua ${boQua} đơn.`,
);
if (!GHI) console.log("Đây là chạy thử, chưa ghi gì. Thêm --ghi để chạy thật.");
process.exit(0);
