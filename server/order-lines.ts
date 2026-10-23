/**
 * Dòng dịch vụ và mã đơn do máy chủ quyết định.
 *
 * Điện thoại chỉ được nói khách đặt dịch vụ nào, gói nào, bao nhiêu lượt. Giá, tên
 * dòng, tổng tiền máy chủ tự tra từ danh mục (BR-DM01-02: App không sửa giá), nên
 * sửa request bằng DevTools hay app cũ còn cache giá cũ cũng không đổi được tiền.
 */
import { z } from "zod";
import { and, like, sql } from "drizzle-orm";
import { orders, type Service } from "@shared/schema";
import { ORDER_LINE_LIMIT } from "@shared/types";
import { tenDongDichVu, timGoi } from "@shared/service-packages";
import { vnDateKey } from "@shared/vn-time";
import type { DbTx } from "./db-tx";
import type { ChiTietDichVu } from "./ingest";

export const dongDichVuSchema = z.object({
  serviceCode: z.string().trim().min(1, "Dịch vụ không hợp lệ"),
  packageName: z.string().trim().min(1).nullish(),
  // App bản cũ chưa gửi packageName, chỉ gửi tên đã ghép "Dịch vụ - Gói": đọc gói
  // từ đó. Giá và các trường tiền khác trong dòng bị bỏ qua.
  serviceName: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1")
    .max(99, "Số lượng tối đa là 99"),
});
export type DongGuiLen = z.infer<typeof dongDichVuSchema>;

export const danhSachDongSchema = z
  .array(dongDichVuSchema, { required_error: "Đơn phải có ít nhất một dịch vụ" })
  .min(1, "Đơn phải có ít nhất một dịch vụ")
  .max(ORDER_LINE_LIMIT, `Mỗi đơn tối đa ${ORDER_LINE_LIMIT} dịch vụ`);

/** Gắn giá danh mục cho từng dòng. Dịch vụ hoặc gói không có trong danh mục thì từ chối cả đơn. */
export function giaDongTuDanhMuc(
  dong: DongGuiLen[],
  danhMuc: Service[],
): { ok: true; lines: ChiTietDichVu[] } | { ok: false; message: string } {
  const lines: ChiTietDichVu[] = [];
  for (const x of dong) {
    const sv = danhMuc.find((s) => s.code === x.serviceCode);
    if (!sv) return { ok: false, message: `Không tìm thấy dịch vụ mã ${x.serviceCode} trong danh mục` };
    let tenGoi = x.packageName ?? null;
    const dau = `${sv.title} - `;
    if (!tenGoi && x.serviceName?.startsWith(dau)) tenGoi = x.serviceName.slice(dau.length);
    const goi = tenGoi ? timGoi(sv.code, tenGoi) : undefined;
    if (tenGoi && !goi) return { ok: false, message: `Dịch vụ ${sv.title} không có gói "${tenGoi}"` };
    lines.push({
      serviceCode: sv.code,
      serviceName: tenDongDichVu(sv.title, goi?.name),
      serviceCategory: sv.category ?? null,
      quantity: x.quantity,
      unitPrice: goi ? goi.price : sv.price,
    });
  }
  return { ok: true, lines };
}

/**
 * Bản gộp các dòng cho bảng orders, nơi vẫn lưu một dịch vụ mỗi đơn: tên nối bằng
 * ", ", số lượng là tổng lượt, đơn giá là của dòng đầu. Chi tiết thật ở order_items.
 * Tạo đơn và sửa dịch vụ cùng gộp một kiểu để hai đường không ra hai con số.
 */
export function tomTatDong(lines: ChiTietDichVu[]) {
  return {
    serviceName: lines.map((x) => x.serviceName).join(", "),
    serviceCode: lines[0].serviceCode,
    serviceCategory: lines[0].serviceCategory ?? null,
    quantity: lines.reduce((s, x) => s + x.quantity, 0),
    unitPrice: lines[0].unitPrice,
    subtotal: lines.reduce((s, x) => s + x.unitPrice * x.quantity, 0),
  };
}

/**
 * Mã đơn "#NPyyMMdd" + số thứ tự trong ngày Việt Nam, cấp trong transaction tạo đơn.
 *
 * Đếm tiếp từ số lớn nhất đã có trong ngày chứ không từ 001: đơn cũ mang đuôi ngẫu
 * nhiên 100 tới 999 do điện thoại tự sinh, đếm từ đầu là đụng mã cũ. Ngày đã lên quá
 * 999 thì đuôi dài thêm một chữ số, mã vẫn không trùng.
 */
export async function capMaDon(tx: DbTx, now: Date = new Date()): Promise<string> {
  const [y, m, d] = vnDateKey(now).split("-");
  const tienTo = `#NP${y.slice(2)}${m}${d}`;
  // Hai người bấm Tạo đơn cùng lúc phải ra hai số: khoá theo ngày tới hết transaction,
  // người sau chờ người trước commit rồi mới đọc số lớn nhất.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`ma_don:${tienTo}`}))`);
  const batDau = sql.raw(String(tienTo.length + 1));
  const [r] = await tx
    .select({ cuoi: sql<number | null>`max(substring(${orders.code} from ${batDau})::int)` })
    .from(orders)
    .where(and(like(orders.code, `${tienTo}%`), sql`substring(${orders.code} from ${batDau}) ~ '^[0-9]{1,6}$'`));
  const so = Number(r?.cuoi ?? 0) + 1;
  return `${tienTo}${String(so).padStart(3, "0")}`;
}
