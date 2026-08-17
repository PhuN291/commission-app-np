import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "@/components/np/icon"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

/**
 * Vùng chứa toast. Neo đáy và bó trong khung 390px như cả app: bản shadcn gốc thả
 * toast ở góc dưới bên phải CỬA SỔ nên trên máy tính nó rơi hẳn ra ngoài khung
 * điện thoại, nhìn như của ứng dụng khác.
 * pb-[76px] để không đè lên TabBar cao 64px.
 */
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "pointer-events-none fixed inset-x-0 bottom-0 z-[100] mx-auto flex w-full max-w-[390px] flex-col gap-2 px-4 pb-[76px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  cn(
    "group pointer-events-auto relative flex w-full items-start gap-2.5 rounded-np-card border bg-white p-3",
    "shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
    "data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4"
  ),
  {
    variants: {
      variant: {
        // Nền trắng cho cả hai kiểu, phân biệt bằng màu icon. Tô đỏ cả thẻ ở cỡ
        // này thành một mảng đỏ to giữa màn, đọc chữ trắng trên đỏ cũng mệt hơn.
        default: "border-np-border",
        destructive: "border-np-danger-bg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 flex-shrink-0 items-center justify-center rounded-np-button bg-np-ink px-3 text-[13px] font-bold text-white transition-colors hover:bg-np-ink-sub",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

/**
 * Nút đóng LUÔN hiện. Bản gốc để opacity-0 tới khi rê chuột, mà app này chạy trên
 * điện thoại nên không có rê chuột: coi như không có nút đóng.
 */
const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    aria-label="Đóng"
    className={cn(
      "-m-1 flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-np-text-muted transition-colors hover:bg-np-surface-sub hover:text-np-ink",
      className
    )}
    toast-close=""
    {...props}
  >
    <X size={15} strokeWidth={2.5} />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-[14px] font-bold leading-[1.35] text-np-ink", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("mt-0.5 text-[13px] leading-[1.4] text-np-text-sub", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
