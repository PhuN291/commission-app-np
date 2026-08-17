import type { ReactNode } from "react";
import {
  CR_STATUS_LABEL,
  ROLE_LABEL,
  canKhieuNai,
  hoursRemainingKhieuNai,
  type CRStatus,
  type UserRole,
} from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { NPButton } from "./button";
import { CR_TONE } from "./order-status-badges";

/**
 * Một khoản hoa hồng, đủ thông tin để quyết định có cho khiếu nại hay không.
 *
 * Khai kiểu theo cấu trúc chứ không dùng type của một màn cụ thể: màn Thu nhập và
 * màn chi tiết đơn nhận dữ liệu từ hai endpoint khác nhau, `id` một bên là chuỗi
 * một bên là số, nhưng phần dùng để xét khiếu nại thì giống hệt.
 */
export type CommissionRecordView = {
  id: string | number;
  role?: string;
  userId: number;
  amount: number;
  status: CRStatus;
  rejectedAt: number | null;
  rejectedReason: string | null;
  /** Đã gửi khiếu nại cho khoản này chưa. Mỗi khoản chỉ khiếu nại một lần. */
  daKhieuNai?: boolean;
};

function fmtVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

/**
 * Một dòng hoa hồng kèm nút khiếu nại, dùng chung cho mọi màn có hoa hồng.
 *
 * Vì sao gom: trước đây màn chi tiết đơn và màn Thu nhập chép tay cùng một khối,
 * và chép lệch nhau. Chi tiết đơn kiểm người đứng tên khoản đó, Thu nhập không
 * kiểm; chữ trên nút cũng khác nhau. Gom lại thì luật chỉ còn một bản, và màn
 * hoa hồng nào thêm sau này cũng có nút mà không phải chép lần thứ ba.
 *
 * Luật hiển thị nút nằm trong `canKhieuNai` ở shared/types, KHÔNG viết lại ở đây:
 * máy chủ cũng gọi đúng hàm đó khi nhận khiếu nại, hai bên lệch nhau là nút bấm
 * được mà gửi lên bị chối.
 */
export function CommissionRow({
  cr,
  currentUserId,
  onComplaint,
  complaint,
  showRole = false,
  actions,
  last,
  className,
}: {
  cr: CommissionRecordView;
  currentUserId: number;
  onComplaint: () => void;
  /** Khiếu nại đã gửi. Có thì in lại nội dung thay cho nút. */
  complaint?: { content: string; createdAt: number } | null;
  /** In tên vai trò trước nhãn trạng thái. Màn Thu nhập không cần vì đã gom theo đơn. */
  showRole?: boolean;
  /** Nút của vai khác, ví dụ nút từ chối của kế toán. Đặt trước nút khiếu nại. */
  actions?: ReactNode;
  last?: boolean;
  className?: string;
}) {
  const laChuKhoan = cr.userId === currentUserId;
  const hienKhieuNai = laChuKhoan && cr.status === "TU_CHOI" && !cr.daKhieuNai;
  const conHan = canKhieuNai({ status: cr.status, rejectedAt: cr.rejectedAt });
  const gioConLai = hoursRemainingKhieuNai(cr.rejectedAt);

  return (
    <div className={cn("px-4 py-3.5", !last && "np-divider", className)}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {showRole && cr.role && (
              <span className="text-[14px] font-bold text-np-ink">
                {ROLE_LABEL[cr.role as UserRole] ?? cr.role}
              </span>
            )}
            <Badge tone={CR_TONE[cr.status]}>{CR_STATUS_LABEL[cr.status]}</Badge>
          </div>
          {cr.status === "TU_CHOI" && cr.rejectedReason && (
            <div className="mt-1 text-[11px] text-np-text-sub">Lý do: {cr.rejectedReason}</div>
          )}
          {/* In lại lời mình đã viết. Trước đây gửi xong là nút biến mất và nội
              dung không hiện ở đâu, người gửi không nhớ nổi mình đã trình bày gì. */}
          {complaint && laChuKhoan && (
            <div className="mt-1.5 rounded-np-button bg-np-surface-sub p-2 text-[11px] leading-[1.5] text-np-text-sub">
              <span className="font-semibold">Khiếu nại của bạn:</span> {complaint.content}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-[14px] font-extrabold tabular-nums text-np-brand-ink">
          {fmtVND(cr.amount)}
        </div>
      </div>

      {(actions || hienKhieuNai) && (
        // Chặn nổi bọt: ở màn Thu nhập cả hàng bấm được để sang chi tiết đơn, bấm
        // nút mà không chặn thì vừa mở hộp khiếu nại vừa nhảy trang.
        <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
          {hienKhieuNai &&
            (conHan ? (
              <NPButton tone="primary" size="sm" onClick={onComplaint}>
                Khiếu nại hoa hồng (còn {gioConLai}h)
              </NPButton>
            ) : (
              <NPButton tone="ghost" size="sm" disabled>
                Quá hạn khiếu nại (3 ngày)
              </NPButton>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hộp nhập nội dung khiếu nại, một bản duy nhất cho cả app.
 *
 * Không tự gọi máy chủ: mỗi màn cần làm mới một tập dữ liệu khác nhau sau khi
 * gửi, nên phần gọi để lại cho nơi dùng, ở đây chỉ lo phần nhập và nhắc luật.
 */
export function ComplaintSheet({
  open,
  onOpenChange,
  cr,
  content,
  onContentChange,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cr: CommissionRecordView | null;
  content: string;
  onContentChange: (v: string) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Khiếu nại hoa hồng</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {cr?.rejectedReason && (
            <div className="rounded-np-button border border-np-border bg-np-surface-sub p-3 text-[12px]">
              <div className="font-bold text-np-text-sub">Lý do từ chối:</div>
              <div className="mt-0.5 text-np-ink">{cr.rejectedReason}</div>
            </div>
          )}
          <div>
            <label
              htmlFor="noi-dung-khieu-nai"
              className="mb-1.5 block text-[12px] font-medium text-np-text-sub"
            >
              Nội dung khiếu nại
            </label>
            <Textarea
              id="noi-dung-khieu-nai"
              placeholder="Trình bày lý do khiếu nại để kế toán xem lại..."
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-np-text-muted">
            Khiếu nại trong vòng 3 ngày sau khi hoa hồng bị từ chối. Mỗi khoản chỉ khiếu nại được
            một lần. Kế toán sẽ xem lại trong 1 tới 2 ngày.
          </p>
        </div>
        <DialogFooter>
          <NPButton tone="ghost" onClick={() => onOpenChange(false)}>
            Hủy
          </NPButton>
          <NPButton
            tone="primary"
            disabled={content.trim().length < 2 || saving}
            onClick={onSubmit}
          >
            {saving ? "Đang gửi..." : "Gửi khiếu nại"}
          </NPButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mã lỗi máy chủ trả về khi nộp khiếu nại → câu tiếng Việt.
 *
 * Gom vào đây vì hai màn từng chép nguyên khối này, sửa chữ ở một chỗ là hai màn
 * nói hai kiểu về cùng một lỗi.
 */
export function loiKhieuNai(err: unknown): string {
  const ma = (err as { error?: string })?.error;
  if (ma === "ownership") return "Chỉ khiếu nại được hoa hồng của mình";
  if (ma === "window_expired") return "Đã quá hạn khiếu nại (3 ngày)";
  if (ma === "invalid_state") return "Khoản này không khiếu nại được nữa";
  if (ma === "not_found") return "Không tìm thấy khoản hoa hồng";
  return "Không gửi được khiếu nại";
}
