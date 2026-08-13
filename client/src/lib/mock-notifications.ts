import type { LucideIcon } from "@/components/np/icon";
import {
  Award,
  Calendar,
  Info,
  PermPhoneMsg,
  ShoppingBag,
} from "@/components/np/icon";

export interface Notification {
  id: number;
  type: "appointment" | "order" | "followup" | "achievement" | "system";
  title: string;
  content: string;
  time: string;
  read: boolean;
  href: string;
  icon: LucideIcon;
}

export const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "appointment",
    title: "Lịch hẹn sắp tới",
    content: "Trần Văn An - Siêu âm Doppler Tim lúc 08:30 hôm nay",
    time: "5 phút trước",
    read: false,
    href: "/orders",
    icon: Calendar,
  },
  {
    id: 2,
    type: "order",
    title: "Đơn hàng đã duyệt",
    content: "Đơn #NP260213001 đã được duyệt - Hoa hồng 25.000₫ đã ghi nhận",
    time: "12 phút trước",
    read: false,
    href: "/orders/1",
    icon: ShoppingBag,
  },
  {
    id: 3,
    type: "followup",
    title: "Nhắc follow-up",
    content: "Lê Thị Bình đã khám 3 ngày trước, nên gọi hỏi thăm",
    time: "30 phút trước",
    read: false,
    href: "/customers/2",
    icon: PermPhoneMsg,
  },
  {
    id: 4,
    type: "achievement",
    title: "Thành tích mới",
    content: "Chúc mừng! Bạn đã đạt badge 'Doanh thu 30tr'",
    time: "1 giờ trước",
    read: false,
    href: "/ranking",
    icon: Award,
  },
  {
    id: 5,
    type: "system",
    title: "Cập nhật bảng giá",
    content: "Đã cập nhật bảng giá dịch vụ Nội soi tiêu hóa",
    time: "2 giờ trước",
    read: false,
    href: "/services",
    icon: Info,
  },
  {
    id: 6,
    type: "appointment",
    title: "Lịch hẹn ngày mai",
    content: "Nguyễn Hoàng Nam - Gói khám tổng quát lúc 09:00 ngày mai",
    time: "3 giờ trước",
    read: true,
    href: "/orders",
    icon: Calendar,
  },
  {
    id: 7,
    type: "order",
    title: "Đơn hàng hoàn tất",
    content: "Đơn #NP260212005 đã hoàn tất - Hoa hồng 75.000₫ đã ghi nhận",
    time: "5 giờ trước",
    read: true,
    href: "/orders/3",
    icon: ShoppingBag,
  },
  {
    id: 8,
    type: "followup",
    title: "Nhắc follow-up",
    content: "Phạm Văn Đức đã làm xét nghiệm 5 ngày trước, kết quả đã có",
    time: "Hôm qua",
    read: true,
    href: "/customers/4",
    icon: PermPhoneMsg,
  },
  {
    id: 9,
    type: "achievement",
    title: "Thăng tiến cấp bậc",
    content: "Bạn đã lên hạng Bạc! Hoa hồng tăng lên 5%",
    time: "2 ngày trước",
    read: true,
    href: "/ranking",
    icon: Award,
  },
  {
    id: 10,
    type: "system",
    title: "Bảo trì hệ thống",
    content: "Hệ thống sẽ bảo trì vào 22:00 - 23:00 tối nay",
    time: "2 ngày trước",
    read: true,
    href: "/services",
    icon: Info,
  },
];
