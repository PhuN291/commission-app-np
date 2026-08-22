/**
 * Sinh bộ icon Solar (480 Design) thành MỘT file React duy nhất:
 *   client/src/components/np/icon.tsx
 *
 * Vì sao dựng SVG inline thay vì nạp icon font qua CDN:
 * app không có service worker, icon font sẽ trống lúc mạng yếu. SVG inline luôn hiện,
 * tree-shake được, và không thêm phụ thuộc lúc chạy (gói nguồn chỉ dùng lúc build).
 *
 * Chữ ký component giữ y hệt lucide ({size, strokeWidth, className, color, fill}) để
 * mọi wrapper và điểm gọi sẵn có không phải sửa cách render.
 * Lưu ý: bản bold-duotone là hình ĐẶC, không có nét vẽ, nên `strokeWidth` được nhận
 * nhưng không có tác dụng (giữ lại để khỏi phải đụng gần 100 điểm gọi). Đây cũng là
 * lý do KHÔNG lấy line-duotone làm mặc định: nó vẽ bằng nét nên sẽ đánh thức cùng lúc
 * mọi chỗ đang truyền strokeWidth mà lâu nay vô hại.
 *
 * GIẤY PHÉP: Solar phát hành theo CC BY 4.0, BẮT BUỘC ghi công 480 Design. Dòng ghi
 * công nằm ở chân menu Thêm (components/np/more-menu-sheet.tsx). Đừng gỡ nó đi.
 *
 * Chạy: npm run gen-icons
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

/** Kiểu dáng mặc định. Đổi được sang bất kỳ hậu tố nào Solar có: bold | linear | outline | broken. */
const STYLE_SOLID = "bold-duotone";
/** Kiểu dùng khi điểm gọi truyền fill="none". */
const STYLE_OUTLINE = "line-duotone";

const SRC = resolve(process.cwd(), "node_modules/@iconify-json/solar/icons.json");
const OUT = resolve(process.cwd(), "client/src/components/np/icon.tsx");

/**
 * Tên lucide đang dùng trong app → tên icon Solar (chưa kèm hậu tố kiểu dáng).
 *
 * Dạng chuỗi thì dùng kiểu mặc định. Dạng object thì ghi đè kiểu cho riêng icon đó.
 * Cần ghi đè vì duotone không hợp mọi vai trò: icon giao diện nhỏ như mũi tên hay dấu
 * đóng vẽ theo duotone sẽ thành khối đặc nặng, còn hộp quà thì lớp mờ rơi vào cái hộp
 * và lớp đậm rơi vào cái nơ, nên ở cỡ nhỏ chỉ còn thấy dấu hoa thị.
 */
type MapValue = string | { solar: string; style?: string };
const MAP: Record<string, MapValue> = {
  AlertCircle: "danger-circle",
  AlertTriangle: "danger-triangle",
  ArrowDownRight: "arrow-right-down",
  ArrowLeft: { solar: "arrow-left", style: "linear" },
  ArrowRight: { solar: "arrow-right", style: "linear" },
  ArrowUpRight: "arrow-right-up",
  /** Mục Phụ trách, dòng "Chỉ định": bảng kẹp có dấu tích, đọc ra "giao cho ai". */
  AssignmentInd: "clipboard-check",
  /** Chọn giờ hẹn. */
  AvTimer: "stopwatch",
  Award: "medal-star",
  BadgePercent: "sale",
  BarChart3: "chart",
  Bell: "bell",
  /** Riêng cho nút thông báo ở thanh đầu app. */
  BellAlert: "bell-bing",
  Building2: "buildings",
  Calendar: "calendar",
  /** Ô chọn ngày hẹn: lịch có dấu cộng. */
  CalendarAddOn: "calendar-add",
  CalendarCheck: "calendar-mark",
  CalendarDays: "calendar-date",
  /** Chip "Cuối tuần". */
  CalendarMonth: "calendar",
  CancelScheduleSend: "close-circle",
  /** Nhắn Zalo. */
  Chat: "chat-round",
  Check: { solar: "check-circle", style: "linear" },
  CheckCircle: "check-circle",
  CheckCircle2: "check-circle",
  ChevronDown: { solar: "alt-arrow-down", style: "linear" },
  ChevronLeft: { solar: "alt-arrow-left", style: "linear" },
  ChevronRight: { solar: "alt-arrow-right", style: "linear" },
  ChevronUp: { solar: "alt-arrow-up", style: "linear" },
  Circle: { solar: "record", style: "linear" },
  ClipboardList: "clipboard-list",
  Clock: "clock-circle",
  /** Khách hàng: sổ danh bạ, phân biệt với user dùng cho nhân sự. */
  ContactsProduct: "notebook",
  /** Truy thu: soi lại đơn kỳ trước, không phải mũi tên hoàn tác. */
  ContentPasteSearch: "clipboard-check",
  Copy: "copy",
  /** Nhãn khách VIP. */
  Crown: "crown",
  Download: "download",
  /** Nút sửa ghi chú: bút trên khung giấy, đứng riêng dễ nhận hơn cây bút trơn. */
  EditSquare: "pen-new-square",
  /** Thành tích: cúp có sao, đọc ra "đã đạt" rõ hơn cái cúp trơn. */
  EditorChoice: "cup-star",
  /** Chip "Tuần sau". */
  EventUpcoming: "calendar-date",
  ExternalLink: "square-arrow-right-up",
  EyeOff: "eye-closed",
  FileSpreadsheet: "document-text",
  FileText: "document-text",
  Gift: { solar: "gift", style: "bold" },
  GripVertical: { solar: "menu-dots", style: "linear" },
  Hash: "hashtag",
  History: "history",
  /** Trang chủ của app phòng khám. */
  HomeHealth: "home-smile",
  Info: "info-circle",
  Layers: "layers",
  Loader2: { solar: "refresh", style: "linear" },
  LogIn: "login",
  LogOut: "logout",
  Mail: "letter",
  MapPin: "map-point",
  Medal: "medal-ribbons-star",
  Menu: "hamburger-menu",
  /** Icon dịch vụ dùng chung toàn app. */
  MedicalServices: "medical-kit",
  MessageSquare: "chat-square",
  Minus: { solar: "minus-circle", style: "linear" },
  MoreHorizontal: { solar: "menu-dots", style: "linear" },
  Package: "box",
  PanelLeftIcon: { solar: "sidebar-minimalistic", style: "linear" },
  /** Icon gọi dùng chung toàn app. */
  PermPhoneMsg: "phone-calling",
  Play: "play",
  Plus: "add-circle",
  PlusCircle: "add-circle",
  Receipt: "bill-list",
  /** Tab Hoa hồng: hộp quà, đọc ra "phần thưởng" rõ hơn cái ví. */
  Redeem: { solar: "gift", style: "bold" },
  /** Nút trợ lý AI ở thanh đầu app. Solar không có robot, cpu-bolt là gần nhất. */
  Robot: "cpu-bolt",
  Save: "diskette",
  /** Solar viết thiếu chữ i, "magnifer" mới là tên đúng trong gói. */
  Search: "magnifer",
  Settings: "settings",
  Shield: "shield-check",
  ShieldAlert: "shield-warning",
  ShoppingBag: "bag",
  ShoppingCart: "cart-large",
  SlidersHorizontal: "tuning",
  Smartphone: "smartphone",
  Sparkles: "stars",
  /** Mục Phụ trách, dòng "Thực hiện": ống nghe, người trực tiếp làm dịch vụ. */
  Stethoscope: "stethoscope",
  StickyNote: "notes",
  /** Mục Phụ trách, dòng "Tư vấn": người đeo tai nghe, đúng nghĩa tư vấn viên. */
  SupportAgent: "headphones-round",
  Ticket: "ticket",
  /** Chip "Hôm nay". */
  Today: "calendar-date",
  TrendingDown: "graph-down",
  TrendingUp: "graph-up",
  UserCog: "user-id",
  UserPlus: "user-plus",
  UserRound: "user-rounded",
  UserX: "user-block",
  Users: "users-group-rounded",
  /** Dấu tích trạng thái dùng chung: đã đạt, đã duyệt, đã xong. */
  Verified: "verified-check",
  /** Chip "Ngày mai": mặt trời mọc. */
  WbTwilight: "sunrise",
  X: { solar: "close-circle", style: "linear" },
  XCircle: "close-circle",
};

/** Các tên lucide có hậu tố Icon dùng chung glyph với tên gốc (shadcn hay import kiểu này). */
const ALIASES: Record<string, string> = {
  ChevronDownIcon: "ChevronDown",
  ChevronLeftIcon: "ChevronLeft",
  ChevronRightIcon: "ChevronRight",
  Loader2Icon: "Loader2",
};

type IconifyJson = {
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
  aliases?: Record<string, { parent: string; rotate?: number; hFlip?: boolean; vFlip?: boolean }>;
};

const data: IconifyJson = JSON.parse(readFileSync(SRC, "utf-8"));

/**
 * Lấy thân SVG của một icon, đi theo alias nếu cần.
 *
 * Alias có kèm xoay hoặc lật thì DỪNG hẳn thay vì lặng lẽ bỏ qua phép biến hình:
 * icon sẽ hiện sai hướng mà không có gì báo.
 */
function layBody(ten: string): string | null {
  const truc = data.icons[ten];
  if (truc) return truc.body;
  const alias = data.aliases?.[ten];
  if (!alias) return null;
  if (alias.rotate || alias.hFlip || alias.vFlip) {
    throw new Error(`Alias "${ten}" có phép xoay/lật, bộ sinh chưa xử lý. Dùng thẳng "${alias.parent}".`);
  }
  return layBody(alias.parent);
}

/** Tên thuộc tính SVG dạng gạch nối → dạng camel của React. */
function doiTenThuocTinh(body: string): string {
  return body.replace(/(\s)([a-zA-Z][a-zA-Z0-9-]*)=/g, (_, khoang: string, ten: string) =>
    khoang + ten.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase()) + "=",
  );
}

/**
 * Gắn tiền tố vào mọi id trong thân icon.
 *
 * Cả trăm icon nằm chung một file và cùng có mặt trong một trang, nên hai icon dùng
 * chung một id (Solar hay đặt "a", "b") sẽ khiến mask của icon này ăn vào icon kia.
 * Hiện chỉ magnifer-line-duotone dùng id, nhưng xử lý chung để đổi bảng tên sau này
 * không dẫm phải.
 */
function ngănCachId(body: string, tienTo: string): string {
  return body
    .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${tienTo}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${tienTo}-${id})`);
}

function chuanBi(ten: string, tienTo: string): string {
  const body = layBody(ten);
  if (!body) throw new Error(`Không có icon "${ten}" trong gói @iconify-json/solar.`);
  return doiTenThuocTinh(ngănCachId(body, tienTo));
}

function main() {
  const thieu: string[] = [];
  const glyphs: { name: string; solar: string; solid: string; outline: string }[] = [];

  for (const [lucideName, giaTri] of Object.entries(MAP)) {
    const solarName = typeof giaTri === "string" ? giaTri : giaTri.solar;
    const kieu = (typeof giaTri === "string" ? undefined : giaTri.style) ?? STYLE_SOLID;
    try {
      glyphs.push({
        name: lucideName,
        solar: kieu === STYLE_SOLID ? solarName : `${solarName} (${kieu})`,
        solid: chuanBi(`${solarName}-${kieu}`, `np-${lucideName}-s`),
        outline: chuanBi(`${solarName}-${STYLE_OUTLINE}`, `np-${lucideName}-o`),
      });
    } catch (e) {
      thieu.push(`${lucideName} -> ${solarName}: ${(e as Error).message}`);
    }
  }

  if (thieu.length > 0) {
    console.error("Lỗi khi lấy icon từ gói nguồn:");
    for (const m of thieu) console.error("  " + m);
    process.exit(1);
  }

  const khung = `${data.width ?? 24} ${data.height ?? 24}`;

  const header = `/* eslint-disable */
/**
 * TỆP SINH TỰ ĐỘNG, ĐỪNG SỬA TAY.
 * Sinh bởi: script/gen-icons.ts  (npm run gen-icons)
 *
 * Nguồn: bộ biểu tượng Solar của 480 Design, kiểu ${STYLE_SOLID}.
 * Giấy phép CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), BẮT BUỘC ghi
 * công. Dòng ghi công đặt ở chân menu Thêm, đừng gỡ.
 *
 * Chữ ký giữ giống lucide để mọi wrapper và điểm gọi cũ dùng được nguyên trạng.
 * \`strokeWidth\` được nhận nhưng KHÔNG có tác dụng: bản ${STYLE_SOLID} là hình đặc,
 * không phải nét vẽ.
 */
import type { ReactElement, ReactNode, SVGProps } from "react";

export type NPIconProps = {
  size?: number | string;
  /** Không có tác dụng với bản ${STYLE_SOLID}. Giữ để tương thích cách gọi cũ. */
  strokeWidth?: number | string;
  className?: string;
  color?: string;
  fill?: string;
} & Omit<SVGProps<SVGSVGElement>, "size" | "strokeWidth" | "color" | "fill">;

/** Thay cho type LucideIcon trước đây. */
export type NPIcon = (props: NPIconProps) => ReactElement;
export type LucideIcon = NPIcon;

/**
 * solid = ${STYLE_SOLID} (mặc định), outline = ${STYLE_OUTLINE}.
 * Truyền fill="none" để ép về bản viền (dùng cho trạng thái tắt, ví dụ nhãn VIP).
 *
 * Màu: Solar đặt fill="currentColor" ngay trong thân icon và làm lớp phụ mờ bằng
 * opacity, nên mọi cách tô màu sẵn có (class text-np-*, prop color, style color) đều
 * ăn nguyên trạng. Prop \`color\` đổ xuống thuộc tính color của thẻ svg chứ không phải
 * fill, để currentColor bên trong thân icon giải ra đúng màu đó.
 */
function make(solid: ReactNode, outline: ReactNode) {
  return function Icon({ size = 24, strokeWidth: _sw, color, fill, ...rest }: NPIconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 ${khung}"
        aria-hidden="true"
        {...rest}
        style={color ? { color, ...rest.style } : rest.style}
      >
        {fill === "none" ? outline : solid}
      </svg>
    );
  };
}
`;

  const body = glyphs
    .map(
      (g) =>
        // Bọc fragment vì một số icon Solar có nhiều thẻ ở gốc, không nằm trong <g>.
        `\n/** Solar: ${g.solar} */\nexport const ${g.name} = make(<>${g.solid}</>, <>${g.outline}</>);`,
    )
    .join("\n");

  const aliasBody = Object.entries(ALIASES)
    .map(([alias, target]) => `\nexport const ${alias} = ${target};`)
    .join("");

  writeFileSync(OUT, header + body + "\n" + aliasBody + "\n", "utf-8");
  console.log(`✓ Sinh ${glyphs.length} icon + ${Object.keys(ALIASES).length} alias → ${OUT}`);
}

main();
