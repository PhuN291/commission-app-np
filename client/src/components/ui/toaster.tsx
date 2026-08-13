import { AlertTriangle, Verified } from "@/components/np/icon"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

/**
 * Toast báo kết quả thao tác. Bố cục: icon trạng thái, chữ ở giữa, nút hành động
 * (nếu có) và nút đóng bên phải.
 *
 * Thời gian tự tắt chia theo loại: báo thành công đọc lướt là xong, còn báo lỗi
 * thường kèm câu hướng dẫn làm lại nên cần lâu hơn.
 */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const loi = props.variant === "destructive"
        const Icon = loi ? AlertTriangle : Verified
        return (
          <Toast key={id} duration={loi ? 6000 : 3500} {...props}>
            <Icon
              size={18}
              className={`mt-px flex-shrink-0 ${loi ? "text-np-danger" : "text-np-brand-ink"}`}
            />
            <div className="min-w-0 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
