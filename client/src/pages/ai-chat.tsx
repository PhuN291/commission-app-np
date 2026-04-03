import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Bot, Send, Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/app-header";

interface ChatMessage {
  id: number;
  role: "user" | "bot";
  content: string;
  timestamp: string;
}

const quickChips = [
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

[Gói Vàng - 4.500.000 d]
- 13 chỉ số xét nghiệm
- Bao gồm: xét nghiệm máu chi tiết, mỡ máu toàn phần, tuyến giáp (TSH), siêu âm bụng + tuyến giáp, ECG, X-quang ngực
- Phù hợp: Khám sức khỏe định kỳ nâng cao
- Hoa hồng: 225.000 d

[Gói Kim cương - 8.000.000 d]
- 17 chỉ số xét nghiệm + nội soi dạ dày
- Bao gồm: Tất cả của gói Vàng + tầm soát ung thư (CEA, AFP, CA 19-9), siêu âm tim, HbA1c, nội soi dạ dày
- Phù hợp: Khám toàn diện, tầm soát ung thư cho người trên 40 tuổi
- Hoa hồng: 400.000 d

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
- Nội soi Dạ dày: 2.000.000 d (HH: 100.000 d)
- Nội soi Đại tràng: 2.500.000 d (HH: 125.000 d)
- Nội soi Toàn bộ: 4.000.000 d (HH: 200.000 d)

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
- Xét nghiệm chất gây nghiện: từ 200.000 d
- Kiểm tra chức năng Gan: từ 350.000 d
- Phí đi lại: 100.000 - 200.000 d tùy khu vực

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

  if (q.includes("dịch vụ") && (q.includes("danh sách") || q.includes("xem") || q.includes("tìm") || q.includes("có gì"))) {
    return `Danh sách dịch vụ hiện có tại NP Clinic:

[Danh sách dịch vụ]

Ma DV-001 | Thu thuat y khoa | 350.000 d
Ma DV-002 | Noi soi tieu hoa | 2.500.000 d
Ma DV-003 | Xet nghiem chat gay nghien | 200.000 d
Ma DV-004 | Kham suc khoe Nam/Nu gioi | 800.000 d
Ma DV-005 | Chan doan Lupus | 600.000 d
Ma DV-006 | Sang loc lay nhiem Me-Thai nhi | 1.500.000 d
Ma DV-007 | Tam soat Tim mach chuyen sau | 4.500.000 d
Ma DV-008 | Goi kham tong quat | 3.500.000 d
Ma DV-009 | Kiem tra chuc nang Gan | 350.000 d
Ma DV-010 | Kham Tien hon nhan | 2.000.000 d

Moi dich vu deu co nhieu goi voi cac muc gia khac nhau. Ban muon tim hieu chi tiet dich vu nao?`;
  }

  if (q.includes("hoa hồng") && (q.includes("tính") || q.includes("dịch vụ") || q.includes("bao nhiêu") || q.includes("thế nào"))) {
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
- Lên Bạc: thưởng 300.000 d
- Lên Vàng: thưởng 500.000 d
- Lên Kim cương: thưởng 1.000.000 d

Mức hoa hồng cao hơn áp dụng cho gói dịch vụ cao cấp (Vàng, Kim cương).`;
  }

  if (q.includes("khuyến mãi") || q.includes("giảm giá") || q.includes("ưu đãi")) {
    return `Các chương trình khuyến mãi đang chạy tại NP Clinic:

[Khuyến mãi tháng 3/2026]

1. Giảm 20% Gói khám tổng quát
   Áp dụng: 01/03 - 31/03/2026
   Điều kiện: Đặt lịch trước 3 ngày
   Giá sau giảm: 2.800.000 d (thay vì 3.500.000 d)

2. Combo Nội soi + Xét nghiệm giảm 500.000 d
   Áp dụng: 01/03 - 15/03/2026
   Giá combo: 2.200.000 d (thay vì 2.700.000 d)

3. Miễn phí Xét nghiệm chức năng Gan khi đăng ký Tầm soát Tim mạch
   Áp dụng: Cả tháng 3/2026
   Tiết kiệm: 350.000 d

4. Giảm 15% Khám Tiền hôn nhân cho cặp đôi
   Áp dụng: 01/03 - 31/03/2026
   Giá sau giảm: 3.400.000 d/cặp (thay vì 4.000.000 d)

Hãy thông báo khuyến mãi cho khách hàng khi tư vấn để tăng tỷ lệ chốt đơn!`;
  }

  if (q.includes("thống kê") && q.includes("hoa hồng") || (q.includes("hoa hồng") && q.includes("tháng"))) {
    return `Thống kê hoa hồng tháng 3/2026 của bạn:

[Tổng quan hoa hồng]
- Hoa hồng ước tính: 1.750.000 d
- Hoa hồng đã xác nhận: 1.042.500 d
- Hoa hồng chờ xử lý: 707.500 d

[Chi tiết đơn hàng]
- Tổng đơn hàng: 8 đơn
- Đơn hoàn tất: 4 đơn
- Đơn đang xử lý: 3 đơn
- Đơn đã hủy: 1 đơn

[Doanh số]
- Tổng doanh số: 35.000.000 d
- Mục tiêu tháng: 50.000.000 d
- Tiến độ: 70%

Bạn đang xếp hạng #3 trong bảng xếp hạng nhân viên. Cố gắng thêm 15.000.000 d nữa để đạt mục tiêu!`;
  }

  if (q.includes("chấm công") || q.includes("điểm danh")) {
    return `Quy trình chấm công tại NP Clinic:

[Giờ làm việc]
- Buổi sáng: 07:30 - 12:00
- Buổi chiều: 13:00 - 17:30
- Thứ 7: 07:30 - 12:00 (luân phiên)
- Chủ nhật: Nghỉ

[Cách chấm công]
1. Mở app NP Clinic trên điện thoại
2. Vào mục "Chấm công" > Bấm "Check-in" khi đến
3. Bấm "Check-out" khi về
4. Hệ thống ghi nhận vị trí GPS và thời gian

[Quy định]
- Đi trễ 15 phút: Trừ 50.000 d/lần
- Đi trễ 30 phút trở lên: Tính nửa ngày nghỉ
- Nghỉ không phép: Trừ 200.000 d/ngày
- Tối đa 2 lần đi trễ/tháng không bị trừ lương

Liên hệ phòng Nhân sự nếu có thắc mắc về chấm công.`;
  }

  if (q.includes("kpi") || (q.includes("chỉ tiêu") && q.includes("tháng")) || q.includes("mục tiêu")) {
    return `KPIs tháng 3/2026 của bạn (Chuyên viên Tư vấn):

[Chỉ tiêu doanh số]
- Mục tiêu: 50.000.000 d
- Đạt được: 35.000.000 d (70%)
- Còn thiếu: 15.000.000 d

[Chỉ tiêu đơn hàng]
- Mục tiêu: 15 đơn/tháng
- Đạt được: 8 đơn (53%)
- Tỷ lệ chốt: 87.5% (7/8 đơn thành công)

[Chỉ tiêu khách hàng mới]
- Mục tiêu: 10 khách mới/tháng
- Đạt được: 6 khách (60%)

[Mốc thưởng KPI]
- Mốc 1 (da dat): 20.000.000 d -> Thưởng 500.000 d
- Mốc 2 (da dat): 30.000.000 d -> Thưởng 1.000.000 d
- Mốc 3 (dang tien toi): 40.000.000 d -> Thưởng 2.000.000 d
- Mốc 4: 50.000.000 d -> Thưởng 5.000.000 d

Bạn đã đạt Mốc 2. Cần thêm 5.000.000 d để đạt Mốc 3 và nhận thưởng 2.000.000 d!`;
  }

  return "Tôi sẽ tìm thông tin này trong tài liệu nội bộ và phản hồi bạn ngay. Hiện tại bạn có thể liên hệ quản lý trực tiếp nếu cần gấp.";
}

function formatBotMessage(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const processed = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    if (processed.trim().startsWith("[") && processed.trim().endsWith("]")) {
      const title = processed.trim().slice(1, -1);
      return (
        <p key={i} className="text-[13px] font-bold text-[#1a1c1d] mt-2 mb-0.5">{title}</p>
      );
    }

    if (processed.trim() === "") return <div key={i} className="h-1.5" />;

    return (
      <p key={i} className="text-[13px] leading-relaxed text-[#303030]" dangerouslySetInnerHTML={{ __html: processed }} />
    );
  }).filter(Boolean);
}

export default function AiChat() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const serviceParam = params.get("service");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "bot",
      content: `Xin chào! Tôi là Trợ lý Nguyên Phương -- hệ thống hỗ trợ đào tạo nội bộ của NP Clinic.

Tôi có thể giúp bạn tra cứu nhanh thông tin về dịch vụ, hoa hồng, khuyến mãi, quy trình làm việc và KPIs.

Hãy chọn một chủ đề bên dưới hoặc gõ câu hỏi của bạn.`,
      timestamp: getTimeString(),
    },
  ]);
  const [input, setInput] = useState(() => {
    if (serviceParam) return `Tôi cần tư vấn về dịch vụ ${serviceParam}`;
    return "";
  });
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current && serviceParam) {
      inputRef.current.focus();
    }
  }, []);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text.trim(),
      timestamp: getTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // TODO: Replace with Dify API call
    setTimeout(() => {
      const response = matchResponse(text);
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "bot",
        content: response,
        timestamp: getTimeString(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botMsg]);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleChipClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#1a1c1d] text-[#1a1c1d] font-sans flex flex-col">
      <AppHeader userName="Nguyễn Thị Mai" activePage="ai-chat" />

      <main className="flex-1 flex flex-col bg-[#f6f6f7] rounded-t-2xl overflow-hidden max-w-4xl mx-auto w-full">
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-[#d2d5d8] flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-[#8c9196] hover:text-[#1a1c1d] hover:bg-[#f6f6f7] transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-[#008060] flex items-center justify-center shrink-0">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#1a1c1d]" data-testid="text-ai-title">Trợ lý AI Nguyên Phương</h1>
              <span className="text-[10px] font-bold text-[#8c9196] bg-[#f6f6f7] px-1.5 py-0.5 rounded uppercase tracking-wider">Beta</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#008060]"></div>
              <span className="text-[11px] text-[#8c9196]">Luôn sẵn sàng hỗ trợ</span>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
          style={{ height: "calc(100vh - 56px - 60px - 130px)", minHeight: 0 }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "bot" && (
                <div className="h-7 w-7 rounded-full bg-[#008060] flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%]`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[#008060] text-white rounded-br-md"
                      : "bg-white border border-[#e3e3e3] shadow-sm rounded-bl-md"
                  }`}
                  data-testid={`chat-message-${msg.id}`}
                >
                  {msg.role === "bot" ? (
                    <div className="space-y-0.5">{formatBotMessage(msg.content)}</div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
                <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-right" : "text-left"} text-[#8c9196]`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5 justify-start">
              <div className="h-7 w-7 rounded-full bg-[#008060] flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-white border border-[#e3e3e3] shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-[#8c9196] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 rounded-full bg-[#8c9196] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 rounded-full bg-[#8c9196] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                  <span className="text-xs text-[#8c9196]">AI đang trả lời...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-[#d2d5d8]">
          <div className="px-4 sm:px-6 pt-2 pb-1">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {quickChips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(chip)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#d2d5d8] text-[#4a4d50] hover:border-[#008060] hover:text-[#008060] transition-colors font-medium whitespace-nowrap shrink-0"
                  data-testid={`chip-${i}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 sm:px-6 py-2">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về dịch vụ, quy trình, bảng giá..."
                className="flex-1 h-11 px-4 rounded-xl bg-[#f6f6f7] border border-[#d2d5d8] text-sm outline-none focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-all placeholder:text-[#8c9196]"
                disabled={isTyping}
                data-testid="input-chat"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="h-11 w-11 rounded-xl bg-[#008060] hover:bg-[#006e52] text-white shrink-0 p-0"
                data-testid="button-send"
              >
                <Send className="h-4.5 w-4.5" />
              </Button>
            </form>
          </div>
          <p className="text-[10px] text-[#8c9196] text-center pb-3 px-4">
            Được hỗ trợ bởi AI Wiki nội bộ · Dữ liệu cập nhật lần cuối: 01/03/2026
          </p>
        </div>
      </main>
    </div>
  );
}
