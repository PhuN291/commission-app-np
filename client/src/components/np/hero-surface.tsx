import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import heroBg from "@/assets/np-hero-bg.jpg";

/**
 * Nền chung của mọi thẻ số lớn: Hoa hồng tạm tính ở Trang chủ (cả bản sale lẫn bản quản lý)
 * và Thực nhận ở màn Hoa hồng. Gom về một chỗ để đổi nền một lần là mọi thẻ đổi theo.
 *
 * Nền là ảnh thiết kế riêng, tông sáng, nên chữ bên trong dùng màu mực và teal np-hero-ink,
 * không dùng trắng. Màu đặc đứng trước url là nền tạm lúc ảnh chưa tải, chọn gần tông ảnh để
 * chữ vẫn đọc được.
 */
export function HeroSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-np-card px-4 py-4 text-np-ink", className)}
      style={{ background: `#D9F4F0 url(${heroBg}) center / cover no-repeat` }}
    >
      {children}
    </div>
  );
}
