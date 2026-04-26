import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Send, Sparkles } from "lucide-react";
import { DetailHeader, Screen, TabBar, useTabNav } from "@/components/np";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  role: "user" | "bot";
  content: string;
  timestamp: string;
}

const QUICK_CHIPS = [
  "So sánh gói khám Vàng và Kim cương",
  "Nội soi có đau không?",
  "Quy trình đặt lịch khám tại nhà",
  "Dịch vụ nào có bảo hiểm?",
];

function getTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// TODO: Replace with Dify API call
function matchResponse(input: string): string {
  const q = input.toLowerCase();

  if (q.includes("so sánh") && q.includes("vàng") && q.includes("kim cương")) {
    return `So sánh gói khám Vàng và Kim cương:

[Gói Vàng - 4.500.000 đ]
- 13 chỉ số xét nghiệm
- Bao gồm: xét nghiệm máu chi tiết, mỡ máu toàn phần, tuyến giáp (TSH), siêu âm bụng + tuyến giáp, ECG, X-quang ngực
- Phù hợp: Khám sức khỏe định kỳ nâng cao
- Hoa hồng: 225.000 đ

[Gói Kim cương - 8.000.000 đ]
- 17 chỉ số xét nghiệm + nội soi dạ dày
- Bao gồm: Tất cả của gói Vàng + tầm soát ung thư (CEA, AFP, CA 19-9), siêu âm tim, HbA1c, nội soi dạ dày
- Phù hợp: Khám toàn diện, tầm soát ung thư cho người trên 40 tuổi
- Hoa hồng: 400.000 đ

Gợi ý: Nếu khách hàng trên 40 tuổi hoặc có tiền sử gia đình mắc ung thư, nên tư vấn gói Kim cương vì bao gồm đầy đủ tầm soát ung thư và nội soi.`;
  }

  if (q.includes("nội soi") && (q.includes("đau") || q.includes("có đau"))) {
    return `Thông tin về nội soi tiêu hóa tại NP Clinic:

[Về cảm giác đau]
Nội soi tại NP Clinic được thực hiện với gây mê nhẹ (sedation), bệnh nhân sẽ ngủ trong suốt quá trình nội soi nên KHÔNG CẢM THẤY ĐAU.

[Quy trình]
1. Khám và tư vấn trước nội soi
2. Nhịn ăn tối thiểu 6-8 tiếng trước thủ thuật
3. Gây mê nhẹ qua đường tĩnh mạch
4. Thực hiện nội soi (15-30 phút)
5. Theo dõi sau thủ thuật (30-60 phút)
6. Nhận kết quả và tư vấn

[Các gói nội soi]
- Nội soi Dạ dày: 2.000.000 đ (HH: 100.000 đ)
- Nội soi Đại tràng: 2.500.000 đ (HH: 125.000 đ)
- Nội soi Toàn bộ: 4.000.000 đ (HH: 200.000 đ)

Lưu ý khi tư vấn: Nhấn mạnh rằng bệnh nhân được gây mê, không đau, và có bác sĩ chuyên khoa tiêu hóa trực tiếp thực hiện.`;
  }

  if (q.includes("đặt lịch") && q.includes("tại nhà")) {
    return `Quy trình đặt lịch khám tại nhà:

[Bước 1] Tiếp nhận yêu cầu
- Khách hàng liên hệ qua hotline hoặc nhân viên tư vấn
- Thu thập thông tin: họ tên, SĐT, địa chỉ, dịch vụ cần khám

[Bước 2] Xác nhận lịch hẹn
- Kiểm tra lịch bác sĩ/kỹ thuật viên
- Xác nhận thời gian và địa chỉ với khách
- Tạo đơn hàng trên hệ thống với ghi chú "Khám tại nhà"

[Bước 3] Thực hiện
- Ekip xuất phát mang theo dụng cụ xét nghiệm
- Lấy mẫu tại nhà khách hàng
- Mẫu được vận chuyển về phòng xét nghiệm

[Bước 4] Trả kết quả
- Kết quả gửi qua email hoặc app trong 24-48h
- Bác sĩ gọi điện tư vấn kết quả nếu cần

[Dịch vụ hỗ trợ tại nhà]
- Xét nghiệm chất gây nghiện: từ 200.000 đ
- Kiểm tra chức năng Gan: từ 350.000 đ
- Phí đi lại: 100.000 - 200.000 đ tùy khu vực

Phụ thu 50% ngoài giờ hành chính (sau 17h30 và cuối tuần).`;
  }

  if (q.includes("bảo hiểm") || q.includes("bao hiem")) {
    return `Thông tin bảo hiểm tại NP Clinic:

[Dịch vụ được bảo hiểm hỗ trợ]
- Gói khám tổng quát (DV-008): Hỗ trợ bảo hiểm sức khỏe nhóm
- Khám sức khỏe Nam/Nữ giới (DV-004): Một số hạng mục được bảo hiểm chi trả
- Nội soi tiêu hóa (DV-002): Bảo hiểm chi trả khi có chỉ định bác sĩ

[Bảo hiểm chấp nhận]
- Bảo Việt
- Bảo Minh
- PVI
- Liberty
- Các bảo hiểm sức khỏe doanh nghiệp

[Quy trình thanh toán bảo hiểm]
1. Khách hàng cung cấp thẻ bảo hiểm
2. Nhân viên kiểm tra quyền lợi trên hệ thống
3. Bảo lãnh viện phí trực tiếp (nếu có)
4. Hoặc: khách thanh toán trước, NP cung cấp hồ sơ để khách tự yêu cầu hoàn trả

Lưu ý: Hoa hồng vẫn tính trên giá niêm yết gốc của dịch vụ, không ảnh hưởng bởi bảo hiểm.`;
  }

  if (q.includes("tư vấn") && q.includes("dịch vụ")) {
    const serviceMatch = input.match(/dịch vụ\s+(.+)/i);
    const serviceName = serviceMatch ? serviceMatch[1].trim() : "";
    return `Thông tin tư vấn về dịch vụ ${serviceName || "tại NP Clinic"}:

Bạn có thể tham khảo các thông tin sau để tư vấn cho khách hàng:

[Quy trình tư vấn]
1. Hỏi nhu cầu và tình trạng sức khỏe hiện tại của khách
2. Giới thiệu dịch vụ phù hợp và các gói có sẵn
3. Giải thích chi tiết các chỉ số xét nghiệm/thủ thuật
4. Thông báo giá và chương trình khuyến mãi (nếu có)
5. Hỗ trợ đặt lịch hẹn

[Mẹo tư vấn hiệu quả]
- Luôn hỏi tiền sử bệnh và mục đích khám
- Đề xuất gói phù hợp nhất, không nhất thiết phải gói đắt nhất
- Nhấn mạnh giá trị thay vì giá cả
- Thông báo khuyến mãi tháng 3/2026 nếu có

Để xem chi tiết từng gói dịch vụ, bạn có thể vào trang Dịch vụ trên hệ thống.`;
  }

  if (q.includes("hoa hồng") && (q.includes("tính") || q.includes("bao nhiêu") || q.includes("thế nào"))) {
    return `Hoa hồng tại NP Clinic được tính như sau:

[Cơ chế hoa hồng]
- Mức hoa hồng cơ bản: 5% giá trị đơn hàng
- Hoa hồng được tính ngay khi đơn hàng được tạo
- Thanh toán thực tế khi đơn hàng chuyển trạng thái "Hoàn tất"

[Mức hoa hồng theo cấp bậc]
- Đồng (0-20tr doanh thu): 3%
- Bạc (20-50tr): 5%
- Vàng (50-100tr): 6%
- Kim cương (trên 100tr): 8%

[Thưởng lên hạng]
- Lên Bạc: thưởng 300.000 đ
- Lên Vàng: thưởng 500.000 đ
- Lên Kim cương: thưởng 1.000.000 đ

Mức hoa hồng cao hơn áp dụng cho gói dịch vụ cao cấp (Vàng, Kim cương).`;
  }

  if (q.includes("khuyến mãi") || q.includes("giảm giá") || q.includes("ưu đãi")) {
    return `Các chương trình khuyến mãi đang chạy tại NP Clinic:

[Khuyến mãi tháng 3/2026]

1. Giảm 20% Gói khám tổng quát
   Áp dụng: 01/03 - 31/03/2026
   Điều kiện: Đặt lịch trước 3 ngày
   Giá sau giảm: 2.800.000 đ (thay vì 3.500.000 đ)

2. Combo Nội soi + Xét nghiệm giảm 500.000 đ
   Áp dụng: 01/03 - 15/03/2026
   Giá combo: 2.200.000 đ (thay vì 2.700.000 đ)

3. Miễn phí Xét nghiệm chức năng Gan khi đăng ký Tầm soát Tim mạch
   Áp dụng: Cả tháng 3/2026
   Tiết kiệm: 350.000 đ

4. Giảm 15% Khám Tiền hôn nhân cho cặp đôi
   Áp dụng: 01/03 - 31/03/2026
   Giá sau giảm: 3.400.000 đ/cặp (thay vì 4.000.000 đ)

Hãy thông báo khuyến mãi cho khách hàng khi tư vấn để tăng tỷ lệ chốt đơn!`;
  }

  return "Tôi sẽ tìm thông tin này trong tài liệu nội bộ và phản hồi bạn ngay. Hiện tại bạn có thể liên hệ quản lý trực tiếp nếu cần gấp.";
}

function formatBotMessage(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const processed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    if (processed.trim().startsWith("[") && processed.trim().endsWith("]")) {
      const title = processed.trim().slice(1, -1);
      return (
        <p key={i} className="mb-0.5 mt-2 text-[13px] font-bold text-np-ink first:mt-0">
          {title}
        </p>
      );
    }
    if (processed.trim() === "") return <div key={i} className="h-1.5" />;
    return (
      <p
        key={i}
        className="text-[14px] leading-relaxed text-np-ink-sub"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  });
}

export default function AiChat() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const serviceParam = new URLSearchParams(searchString).get("service");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "bot",
      content: `Xin chào! Tôi là Trợ lý Nguyên Phương — hệ thống hỗ trợ đào tạo nội bộ của NP Clinic.

Tôi có thể giúp bạn tra cứu nhanh thông tin về dịch vụ, hoa hồng, khuyến mãi, quy trình làm việc và KPIs.

Hãy chọn một chủ đề bên dưới hoặc gõ câu hỏi của bạn.`,
      timestamp: getTimeString(),
    },
  ]);
  const [input, setInput] = useState(() =>
    serviceParam ? `Tôi cần tư vấn về dịch vụ ${serviceParam}` : "",
  );
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current && serviceParam) inputRef.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      timestamp: getTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "bot",
        content: matchResponse(trimmed),
        timestamp: getTimeString(),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const canSend = input.trim().length > 0 && !isTyping;

  return (
    <Screen noChrome>
      <DetailHeader
        title="Trợ lý AI"
        subtitle="Trợ lý đào tạo nội bộ · Beta"
        onBack={() => navigate("/")}
        trailing={<div />}
      />

      {/* Messages area */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-np-surface-sub px-4 py-4">
        {messages.map((msg) => (
          <MessageRow key={msg.id} msg={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-np-border bg-white">
        {/* Quick chips */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-1 pt-2.5">
          {QUICK_CHIPS.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInput(chip);
                inputRef.current?.focus();
              }}
              className="flex-shrink-0 whitespace-nowrap rounded-full border border-np-border-strong bg-white px-3 py-1.5 text-[12px] font-medium text-np-text-sub transition-colors hover:border-np-brand-ink hover:text-np-brand-ink"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input + Send */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về dịch vụ, hoa hồng, quy trình..."
            className="h-11 flex-1 rounded-full border border-np-border-strong bg-np-surface-sub px-4 text-[14px] text-np-ink outline-none transition-all placeholder:text-np-text-muted focus:border-np-brand-ink focus:bg-white focus:ring-1 focus:ring-np-brand-ink"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Gửi"
            className={cn(
              "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all",
              canSend
                ? "bg-np-brand-ink text-white hover:bg-np-brand-hover"
                : "cursor-not-allowed bg-np-surface-pressed text-np-text-muted",
            )}
          >
            <Send size={18} strokeWidth={2.25} />
          </button>
        </form>

        <p className="pb-2 pt-0.5 text-center text-[10px] text-np-text-muted">
          Được hỗ trợ bởi AI Wiki nội bộ · Dữ liệu cập nhật 01/03/2026
        </p>

        {/* Spacer for tab bar */}
        <div className="h-[64px]" />
      </div>

      <TabBar active={active} onTab={onTab} />
    </Screen>
  );
}

function MessageRow({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-np-brand-ink">
          <Sparkles size={14} strokeWidth={2.25} className="text-white" />
        </div>
      )}
      <div className="max-w-[78%]">
        <div
          className={cn(
            "px-3.5 py-2.5",
            isUser
              ? "rounded-np-card rounded-tr-sm bg-np-brand-ink text-white"
              : "rounded-np-card rounded-tl-sm border border-np-border bg-white",
          )}
        >
          {isUser ? (
            <p className="text-[14px] leading-relaxed">{msg.content}</p>
          ) : (
            <div className="space-y-0.5">{formatBotMessage(msg.content)}</div>
          )}
        </div>
        <p
          className={cn(
            "mt-1 text-[11px] text-np-text-muted",
            isUser ? "text-right" : "text-left pl-1",
          )}
        >
          {msg.timestamp}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 justify-start">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-np-brand-ink">
        <Sparkles size={14} strokeWidth={2.25} className="text-white" />
      </div>
      <div className="rounded-np-card rounded-tl-sm border border-np-border bg-white px-3.5 py-3">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-np-text-muted [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-np-text-muted [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-np-text-muted [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
