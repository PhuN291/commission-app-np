/**
 * Sinh bộ icon Material Symbols (Google) thành MỘT file React duy nhất:
 *   client/src/components/np/icon.tsx
 *
 * Vì sao dựng SVG inline thay vì nạp icon font qua CDN:
 * app không có service worker, icon font sẽ trống lúc mạng yếu. SVG inline luôn hiện,
 * tree-shake được, và không thêm phụ thuộc lúc chạy (gói nguồn chỉ dùng lúc build).
 *
 * Chữ ký component giữ y hệt lucide ({size, strokeWidth, className, color, fill}) để
 * mọi wrapper và điểm gọi sẵn có không phải sửa cách render.
 * Lưu ý: glyph Material là hình ĐẶC, không có nét vẽ, nên `strokeWidth` được nhận
 * nhưng không có tác dụng (giữ lại để khỏi phải đụng 127 điểm gọi).
 *
 * Chạy: npx tsx script/gen-icons.ts
 * Đổi kiểu dáng hoặc độ đậm: sửa STYLE / WEIGHT bên dưới rồi chạy lại.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

/** rounded hợp nhất với vẻ hiện tại (lucide bo tròn đầu nét). Đổi được: outlined | sharp. */
const STYLE = "rounded";
/** Độ đậm nét. Đổi được: 100..700 (phải cài gói @material-symbols/svg-<WEIGHT> tương ứng). */
const WEIGHT = 400;
/** Polaris (Shopify) dùng icon ĐẶC. true = mặc định dùng bản -fill. */
const FILL_DEFAULT = true;

const SRC = resolve(process.cwd(), `node_modules/@material-symbols/svg-${WEIGHT}/${STYLE}`);
const OUT = resolve(process.cwd(), "client/src/components/np/icon.tsx");

/** Tên lucide đang dùng trong app → tên glyph Material tương ứng. */
const MAP: Record<string, string> = {
  Activity: "receipt_long",
  AlertCircle: "error",
  AlertTriangle: "warning",
  ArrowDownRight: "south_east",
  ArrowLeft: "arrow_back",
  ArrowRight: "arrow_forward",
  ArrowUpRight: "north_east",
  Award: "workspace_premium",
  BadgePercent: "percent",
  Ban: "block",
  BarChart3: "bar_chart",
  Bell: "notifications",
  /** Riêng cho nút thông báo ở thanh đầu app. */
  BellAlert: "notifications_active",
  Building2: "domain",
  Calendar: "calendar_today",
  CalendarCheck: "calendar_check",
  CancelScheduleSend: "cancel_schedule_send",
  CalendarDays: "event",
  /** Nhắn Zalo. */
  Chat: "chat",
  Check: "check",
  /** Khách hàng: sổ danh bạ, phân biệt với person dùng cho nhân sự. */
  ContactsProduct: "contacts_product",
  /** Truy thu: soi lại đơn kỳ trước, không phải mũi tên hoàn tác. */
  ContentPasteSearch: "content_paste_search",
  /** Nhãn khách VIP. */
  Crown: "crown",
  /** Ô chọn ngày hẹn: lịch có dấu cộng. */
  CalendarAddOn: "calendar_add_on",
  /** Chọn giờ hẹn. */
  AvTimer: "av_timer",
  /** Chip "Hôm nay" ở lịch chọn ngày. */
  Today: "today",
  /** Chip "Ngày mai": mặt trời mọc. */
  WbTwilight: "wb_twilight",
  /** Chip "Cuối tuần". */
  CalendarMonth: "calendar_month",
  /** Chip "Tuần sau": lịch có mũi tên tới. */
  EventUpcoming: "event_upcoming",
  Copy: "content_copy",
  CheckCircle: "check_circle",
  CheckCircle2: "check_circle",
  ChevronDown: "keyboard_arrow_down",
  ChevronLeft: "chevron_left",
  ChevronRight: "chevron_right",
  ChevronUp: "keyboard_arrow_up",
  Circle: "circle",
  ClipboardList: "pending_actions",
  Clock: "schedule",
  Coins: "universal_currency_alt",
  DollarSign: "payments",
  Download: "download",
  ExternalLink: "open_in_new",
  /** Nút sửa ghi chú: bút trên khung giấy, đứng riêng dễ nhận hơn cây bút trơn. */
  EditSquare: "edit_square",
  /** Thành tích: cúp trên khung huy hiệu, đọc ra "đã đạt" rõ hơn cái cúp trơn. */
  EditorChoice: "editor_choice",
  EyeOff: "event_busy",
  FileSpreadsheet: "table",
  FileText: "description",
  Gift: "redeem",
  GripVertical: "drag_indicator",
  Hash: "tag",
  History: "history",
  /** Trang chủ của app phòng khám: nhà kèm dấu y tế, không phải ngôi nhà trơn. */
  HomeHealth: "home_health",
  Info: "info",
  Layers: "info",
  Loader2: "progress_activity",
  LogIn: "how_to_reg",
  LogOut: "logout",
  Mail: "mail",
  MapPin: "location_on",
  Medal: "award_star",
  Menu: "menu",
  /** Icon dịch vụ dùng chung toàn app. */
  MedicalServices: "medical_services",
  MessageSquare: "sms",
  Minus: "remove",
  MoreHorizontal: "more_horiz",
  Package: "clinical_notes",
  PanelLeftIcon: "left_panel_open",
  Percent: "percent",
  /** Icon gọi dùng chung toàn app. Riêng "chưa bắt máy" vẫn là PhoneMissed. */
  PermPhoneMsg: "perm_phone_msg",
  PhoneMissed: "phone_missed",
  Play: "play_arrow",
  Plus: "add",
  PlusCircle: "add_circle",
  Receipt: "receipt_long",
  /** Tab Hoa hồng: hộp quà thắt nơ, đọc ra "phần thưởng" rõ hơn cái ví. */
  Redeem: "redeem",
  RefreshCw: "refresh",
  Repeat: "repeat",
  /** Nút trợ lý AI ở thanh đầu app. */
  Robot: "smart_toy",
  RotateCcw: "currency_exchange",
  Save: "save",
  Search: "search",
  Settings: "settings",
  Shield: "health_and_safety",
  ShieldAlert: "gpp_maybe",
  ShoppingBag: "clinical_notes",
  ShoppingCart: "note_add",
  SlidersHorizontal: "tune",
  Smartphone: "mobile",
  Sparkles: "stars_2",
  Star: "star",
  StickyNote: "sticky_note_2",
  Ticket: "confirmation_number",
  TrendingDown: "trending_down",
  TrendingUp: "trending_up",
  UserCog: "badge",
  UserPlus: "person_add",
  UserRound: "person",
  /** Mục Phụ trách, dòng "Chỉ định": thẻ tên có người, đọc ra "giao cho ai". */
  AssignmentInd: "assignment_ind",
  /** Mục Phụ trách, dòng "Thực hiện": ống nghe, người trực tiếp làm dịch vụ. */
  Stethoscope: "stethoscope",
  /** Mục Phụ trách, dòng "Tư vấn": người đeo tai nghe, đúng nghĩa tư vấn viên. */
  SupportAgent: "support_agent",
  /** Dấu tích trạng thái dùng chung: đã đạt, đã duyệt, đã xong. */
  Verified: "verified",
  UserX: "person_off",
  Users: "group",
  X: "close",
  XCircle: "cancel",
};

/** Các tên lucide có hậu tố Icon dùng chung glyph với tên gốc (shadcn hay import kiểu này). */
const ALIASES: Record<string, string> = {
  ChevronDownIcon: "ChevronDown",
  ChevronLeftIcon: "ChevronLeft",
  ChevronRightIcon: "ChevronRight",
  Loader2Icon: "Loader2",
};

/** Lấy nội dung trong <path d="..."/> của file SVG Material. */
function extractPaths(file: string): string[] {
  const svg = readFileSync(file, "utf-8");
  return Array.from(svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)).map((m) => m[1]);
}

function main() {
  const missing: string[] = [];
  const glyphs: { name: string; material: string; paths: string[]; filled: string[] | null }[] = [];

  for (const [lucideName, materialName] of Object.entries(MAP)) {
    const file = `${SRC}/${materialName}.svg`;
    if (!existsSync(file)) {
      missing.push(`${lucideName} -> ${materialName}`);
      continue;
    }
    const fillFile = `${SRC}/${materialName}-fill.svg`;
    glyphs.push({
      name: lucideName,
      material: materialName,
      paths: extractPaths(file),
      filled: existsSync(fillFile) ? extractPaths(fillFile) : null,
    });
  }

  if (missing.length > 0) {
    console.error("Thiếu glyph trong gói nguồn:");
    for (const m of missing) console.error("  " + m);
    process.exit(1);
  }

  const header = `/* eslint-disable */
/**
 * TỆP SINH TỰ ĐỘNG, ĐỪNG SỬA TAY.
 * Sinh bởi: script/gen-icons.ts  (npx tsx script/gen-icons.ts)
 * Nguồn: Material Symbols (Google), kiểu ${STYLE}, độ đậm ${WEIGHT}.
 *
 * Chữ ký giữ giống lucide để mọi wrapper và điểm gọi cũ dùng được nguyên trạng.
 * \`strokeWidth\` được nhận nhưng KHÔNG có tác dụng: glyph Material là hình đặc,
 * không phải nét vẽ. Muốn đổi độ đậm thì đổi WEIGHT trong script rồi chạy lại.
 */
import type { ReactElement, SVGProps } from "react";

export type NPIconProps = {
  size?: number | string;
  /** Không có tác dụng với glyph Material. Giữ để tương thích cách gọi cũ. */
  strokeWidth?: number | string;
  className?: string;
  color?: string;
  fill?: string;
} & Omit<SVGProps<SVGSVGElement>, "size" | "strokeWidth" | "color" | "fill">;

/** Thay cho type LucideIcon trước đây. */
export type NPIcon = (props: NPIconProps) => ReactElement;
export type LucideIcon = NPIcon;

/**
 * outline = bản viền, filled = bản đặc (Material có sẵn biến thể -fill).
 * Mặc định dùng bản ${FILL_DEFAULT ? "đặc" : "viền"} theo cấu hình FILL_DEFAULT.
 * Truyền fill="none" để ép về bản viền (dùng cho trạng thái tắt, ví dụ nút VIP),
 * truyền fill="currentColor" để ép về bản đặc.
 */
const DEFAULT_FILLED = ${FILL_DEFAULT};

function make(outline: string[], filled?: string[]) {
  return function Icon({ size = 24, strokeWidth: _sw, color, fill, ...rest }: NPIconProps) {
    const solid = fill === "none" ? false : DEFAULT_FILLED || !!fill;
    const d = solid && filled ? filled : outline;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 -960 960 960"
        fill={color ?? "currentColor"}
        aria-hidden="true"
        {...rest}
      >
        {d.map((p, i) => (
          <path key={i} d={p} />
        ))}
      </svg>
    );
  };
}
`;

  const body = glyphs
    .map(
      (g) =>
        `\n/** Material: ${g.material} */\nexport const ${g.name} = make([${g.paths
          .map((p) => JSON.stringify(p))
          .join(", ")}]${
          g.filled ? `, [${g.filled.map((p) => JSON.stringify(p)).join(", ")}]` : ""
        });`,
    )
    .join("\n");

  const aliasBody = Object.entries(ALIASES)
    .map(([alias, target]) => `\nexport const ${alias} = ${target};`)
    .join("");

  writeFileSync(OUT, header + body + "\n" + aliasBody + "\n", "utf-8");
  console.log(`✓ Sinh ${glyphs.length} icon + ${Object.keys(ALIASES).length} alias → ${OUT}`);
}

main();
