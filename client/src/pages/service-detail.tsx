import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  BadgePercent,
  Bot,
  CheckCircle2,
  Clock,
  Hash,
  Minus,
  Package,
  Plus,
  Shield,
  ShoppingCart,
  Stethoscope,
  UserRound,
} from "lucide-react";
import {
  Badge,
  Card,
  DetailHeader,
  NPButton,
  Screen,
  SectionTitle,
  useTabNav,
} from "@/components/np";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Service } from "@shared/schema";

function fmtVND(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + "₫";
}

export interface PackageMarker {
  name: string;
  description?: string;
}

export interface ServicePackage {
  name: string;
  price: number;
  commission: number;
  description: string;
  markers: PackageMarker[];
}

export const SERVICE_PACKAGES: Record<string, ServicePackage[]> = {
  "DV-001": [
    {
      name: "Gói Cơ bản",
      price: 1500000,
      commission: 75000,
      description: "Gói tiểu phẫu cơ bản dành cho các thủ thuật da liễu đơn giản, phù hợp với nhu cầu điều trị thông thường.",
      markers: [
        { name: "Tiểu phẫu da liễu", description: "Thủ thuật ngoại khoa nhỏ trên da, xử lý các tổn thương da lành tính như nốt ruồi, u mỡ nhỏ." },
        { name: "Rạch áp xe", description: "Thủ thuật rạch và dẫn lưu ổ áp xe dưới da, giúp loại bỏ mủ và giảm nhiễm trùng." },
        { name: "Khâu vết thương nhỏ", description: "Khâu và xử lý các vết thương nhỏ dưới 5cm, đảm bảo lành thương tốt và giảm sẹo." },
        { name: "Đốt mụn cóc / mụn thịt", description: "Sử dụng phương pháp đốt điện hoặc laser để loại bỏ mụn cóc, mụn thịt trên da." },
      ],
    },
    {
      name: "Gói Nâng cao",
      price: 3500000,
      commission: 175000,
      description: "Gói tiểu phẫu nâng cao bao gồm đầy đủ các thủ thuật từ cơ bản đến phức tạp, phù hợp cho các ca cần can thiệp sâu hơn.",
      markers: [
        { name: "Tiểu phẫu da liễu", description: "Thủ thuật ngoại khoa nhỏ trên da, xử lý các tổn thương da lành tính như nốt ruồi, u mỡ nhỏ." },
        { name: "Rạch áp xe", description: "Thủ thuật rạch và dẫn lưu ổ áp xe dưới da, giúp loại bỏ mủ và giảm nhiễm trùng." },
        { name: "Khâu vết thương nhỏ", description: "Khâu và xử lý các vết thương nhỏ dưới 5cm, đảm bảo lành thương tốt và giảm sẹo." },
        { name: "Đốt mụn cóc / mụn thịt", description: "Sử dụng phương pháp đốt điện hoặc laser để loại bỏ mụn cóc, mụn thịt trên da." },
        { name: "Sinh thiết da", description: "Lấy mẫu mô da để xét nghiệm giải phẫu bệnh, giúp chẩn đoán chính xác các bệnh lý da liễu." },
        { name: "Chích rạch nang lông", description: "Thủ thuật xử lý viêm nang lông mạn tính, giúp giảm đau và ngăn ngừa tái phát." },
        { name: "Cắt bỏ u nang bã", description: "Phẫu thuật loại bỏ hoàn toàn u nang bã dưới da, ngăn ngừa nhiễm trùng và tái phát." },
      ],
    },
  ],
  "DV-002": [
    {
      name: "Nội soi Dạ dày",
      price: 2000000,
      commission: 100000,
      description: "Gói nội soi đường tiêu hóa trên, kiểm tra thực quản, dạ dày và tá tràng, kèm test HP nhanh.",
      markers: [
        { name: "Nội soi thực quản", description: "Quan sát niêm mạc thực quản để phát hiện viêm, loét, trào ngược hoặc các bất thường khác." },
        { name: "Nội soi dạ dày", description: "Kiểm tra niêm mạc dạ dày, phát hiện viêm, loét, polyp hoặc các tổn thương tiền ung thư." },
        { name: "Nội soi tá tràng", description: "Quan sát niêm mạc tá tràng để phát hiện loét, viêm hoặc các bất thường ở đoạn đầu ruột non." },
        { name: "Test HP nhanh", description: "Xét nghiệm nhanh phát hiện vi khuẩn Helicobacter pylori - nguyên nhân chính gây viêm loét dạ dày." },
        { name: "Sinh thiết mô (nếu cần)", description: "Lấy mẫu mô tại vị trí nghi ngờ để xét nghiệm giải phẫu bệnh khi có chỉ định lâm sàng." },
      ],
    },
    {
      name: "Nội soi Đại tràng",
      price: 2500000,
      commission: 125000,
      description: "Gói nội soi đường tiêu hóa dưới, kiểm tra toàn bộ đại tràng và trực tràng, có thể cắt polyp nếu phát hiện.",
      markers: [
        { name: "Nội soi trực tràng", description: "Kiểm tra niêm mạc trực tràng để phát hiện viêm, polyp, trĩ hoặc các tổn thương khác." },
        { name: "Nội soi đại tràng sigma", description: "Quan sát đoạn đại tràng sigma - vị trí thường gặp polyp và ung thư đại tràng." },
        { name: "Nội soi đại tràng xuống", description: "Kiểm tra đại tràng xuống để phát hiện các bất thường như viêm, polyp hoặc u." },
        { name: "Nội soi đại tràng ngang", description: "Quan sát niêm mạc đại tràng ngang, đánh giá tình trạng viêm hoặc tổn thương." },
        { name: "Nội soi đại tràng lên", description: "Kiểm tra đại tràng lên để tầm soát polyp và các tổn thương tiền ung thư." },
        { name: "Nội soi manh tràng", description: "Quan sát manh tràng và van hồi manh tràng, kiểm tra viêm hoặc bất thường." },
        { name: "Cắt polyp (nếu có)", description: "Cắt bỏ polyp phát hiện trong quá trình nội soi bằng vòng cắt hoặc kẹp nóng." },
      ],
    },
    {
      name: "Nội soi Toàn bộ",
      price: 4000000,
      commission: 200000,
      description: "Gói nội soi toàn diện cả đường tiêu hóa trên và dưới, phù hợp cho tầm soát định kỳ hoặc khi có triệu chứng phức tạp.",
      markers: [
        { name: "Nội soi thực quản", description: "Quan sát niêm mạc thực quản để phát hiện viêm, loét, trào ngược hoặc các bất thường khác." },
        { name: "Nội soi dạ dày", description: "Kiểm tra niêm mạc dạ dày, phát hiện viêm, loét, polyp hoặc các tổn thương tiền ung thư." },
        { name: "Nội soi tá tràng", description: "Quan sát niêm mạc tá tràng để phát hiện loét, viêm hoặc các bất thường ở đoạn đầu ruột non." },
        { name: "Test HP nhanh", description: "Xét nghiệm nhanh phát hiện vi khuẩn Helicobacter pylori - nguyên nhân chính gây viêm loét dạ dày." },
        { name: "Nội soi trực tràng", description: "Kiểm tra niêm mạc trực tràng để phát hiện viêm, polyp, trĩ hoặc các tổn thương khác." },
        { name: "Nội soi đại tràng sigma", description: "Quan sát đoạn đại tràng sigma - vị trí thường gặp polyp và ung thư đại tràng." },
        { name: "Nội soi đại tràng xuống", description: "Kiểm tra đại tràng xuống để phát hiện các bất thường như viêm, polyp hoặc u." },
        { name: "Nội soi đại tràng ngang", description: "Quan sát niêm mạc đại tràng ngang, đánh giá tình trạng viêm hoặc tổn thương." },
        { name: "Nội soi đại tràng lên", description: "Kiểm tra đại tràng lên để tầm soát polyp và các tổn thương tiền ung thư." },
        { name: "Nội soi manh tràng", description: "Quan sát manh tràng và van hồi manh tràng, kiểm tra viêm hoặc bất thường." },
        { name: "Sinh thiết mô (nếu cần)", description: "Lấy mẫu mô tại vị trí nghi ngờ để xét nghiệm giải phẫu bệnh khi có chỉ định lâm sàng." },
        { name: "Cắt polyp (nếu có)", description: "Cắt bỏ polyp phát hiện trong quá trình nội soi bằng vòng cắt hoặc kẹp nóng." },
      ],
    },
  ],
  "DV-003": [
    {
      name: "Panel 5 chất",
      price: 500000,
      commission: 25000,
      description: "Xét nghiệm nhanh 5 loại chất gây nghiện phổ biến nhất, phù hợp cho tầm soát cơ bản.",
      markers: [
        { name: "Amphetamine (AMP)", description: "Phát hiện Amphetamine - chất kích thích thần kinh trung ương, thường lạm dụng để tăng tỉnh táo." },
        { name: "Marijuana (THC)", description: "Phát hiện THC - hoạt chất chính trong cần sa, có thể lưu lại trong cơ thể nhiều tuần." },
        { name: "Morphine (MOP)", description: "Phát hiện Morphine - thuốc giảm đau gốc opioid, có tiềm năng gây nghiện cao." },
        { name: "Methamphetamine (MET)", description: "Phát hiện Methamphetamine (ma túy đá) - chất kích thích mạnh gây nghiện nghiêm trọng." },
        { name: "Cocaine (COC)", description: "Phát hiện Cocaine - chất kích thích chiết xuất từ lá coca, gây nghiện và tổn thương tim mạch." },
      ],
    },
    {
      name: "Panel 10 chất",
      price: 900000,
      commission: 45000,
      description: "Xét nghiệm toàn diện 10 loại chất gây nghiện, bao gồm cả các chất tổng hợp mới, phù hợp cho kiểm tra chuyên sâu.",
      markers: [
        { name: "Amphetamine (AMP)", description: "Phát hiện Amphetamine - chất kích thích thần kinh trung ương, thường lạm dụng để tăng tỉnh táo." },
        { name: "Marijuana (THC)", description: "Phát hiện THC - hoạt chất chính trong cần sa, có thể lưu lại trong cơ thể nhiều tuần." },
        { name: "Morphine (MOP)", description: "Phát hiện Morphine - thuốc giảm đau gốc opioid, có tiềm năng gây nghiện cao." },
        { name: "Methamphetamine (MET)", description: "Phát hiện Methamphetamine (ma túy đá) - chất kích thích mạnh gây nghiện nghiêm trọng." },
        { name: "Cocaine (COC)", description: "Phát hiện Cocaine - chất kích thích chiết xuất từ lá coca, gây nghiện và tổn thương tim mạch." },
        { name: "Benzodiazepine (BZO)", description: "Phát hiện Benzodiazepine - nhóm thuốc an thần, giảm lo âu, có thể gây lệ thuộc khi dùng lâu." },
        { name: "Ketamine (KET)", description: "Phát hiện Ketamine - thuốc gây mê bị lạm dụng như chất kích thích, gây ảo giác." },
        { name: "MDMA (Ecstasy)", description: "Phát hiện MDMA (thuốc lắc) - chất kích thích tổng hợp gây hưng phấn, nguy hiểm cho tim mạch." },
        { name: "Tramadol (TRA)", description: "Phát hiện Tramadol - thuốc giảm đau opioid tổng hợp, có nguy cơ gây nghiện khi dùng kéo dài." },
        { name: "Barbiturate (BAR)", description: "Phát hiện Barbiturate - nhóm thuốc an thần, gây ngủ, có nguy cơ quá liều cao." },
      ],
    },
  ],
  "DV-004": [
    {
      name: "Gói Nam giới",
      price: 3500000,
      commission: 175000,
      description: "Gói khám sức khỏe tổng quát dành riêng cho nam giới, bao gồm tầm soát ung thư tuyến tiền liệt.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan các thành phần máu: hồng cầu, bạch cầu, tiểu cầu, hemoglobin." },
        { name: "Đường huyết lúc đói", description: "Đo nồng độ glucose trong máu khi nhịn ăn, tầm soát đái tháo đường và tiền đái tháo đường." },
        { name: "Chức năng gan (AST, ALT)", description: "Đo men gan AST và ALT để đánh giá tình trạng tổn thương và viêm gan." },
        { name: "Chức năng thận (Creatinine, Ure)", description: "Đánh giá chức năng lọc của thận thông qua nồng độ Creatinine và Ure trong máu." },
        { name: "Mỡ máu toàn phần", description: "Đo cholesterol tổng, HDL, LDL và triglyceride để đánh giá nguy cơ tim mạch." },
        { name: "PSA (Tầm soát ung thư tuyến tiền liệt)", description: "Đo nồng độ PSA trong máu - marker tầm soát ung thư tuyến tiền liệt ở nam giới." },
        { name: "Tổng phân tích nước tiểu", description: "Phân tích các thành phần trong nước tiểu để phát hiện bệnh thận, tiểu đường, nhiễm trùng." },
        { name: "Siêu âm bụng tổng quát", description: "Siêu âm đánh giá các cơ quan trong ổ bụng: gan, mật, thận, tụy, lách." },
      ],
    },
    {
      name: "Gói Nữ giới",
      price: 4000000,
      commission: 200000,
      description: "Gói khám sức khỏe tổng quát dành riêng cho nữ giới, bao gồm tầm soát ung thư buồng trứng và sàng lọc cổ tử cung.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan các thành phần máu: hồng cầu, bạch cầu, tiểu cầu, hemoglobin." },
        { name: "Đường huyết lúc đói", description: "Đo nồng độ glucose trong máu khi nhịn ăn, tầm soát đái tháo đường và tiền đái tháo đường." },
        { name: "Chức năng gan (AST, ALT)", description: "Đo men gan AST và ALT để đánh giá tình trạng tổn thương và viêm gan." },
        { name: "Chức năng thận (Creatinine, Ure)", description: "Đánh giá chức năng lọc của thận thông qua nồng độ Creatinine và Ure trong máu." },
        { name: "Mỡ máu toàn phần", description: "Đo cholesterol tổng, HDL, LDL và triglyceride để đánh giá nguy cơ tim mạch." },
        { name: "CA 125 (Tầm soát ung thư buồng trứng)", description: "Đo CA 125 - marker tầm soát ung thư buồng trứng, cũng tăng trong lạc nội mạc tử cung." },
        { name: "Pap smear", description: "Xét nghiệm tế bào cổ tử cung để tầm soát ung thư cổ tử cung và các tổn thương tiền ung thư." },
        { name: "Siêu âm bụng tổng quát", description: "Siêu âm đánh giá các cơ quan trong ổ bụng: gan, mật, thận, tụy, lách." },
        { name: "Siêu âm tuyến vú", description: "Siêu âm tuyến vú để tầm soát khối u, nang, và các bất thường tuyến vú." },
      ],
    },
  ],
  "DV-005": [
    {
      name: "Panel Lupus Cơ bản",
      price: 1800000,
      commission: 90000,
      description: "Panel xét nghiệm cơ bản để sàng lọc và theo dõi bệnh lupus ban đỏ hệ thống (SLE).",
      markers: [
        { name: "ANA (Kháng thể kháng nhân)", description: "Xét nghiệm sàng lọc tự miễn, phát hiện kháng thể chống lại nhân tế bào, dương tính trong hầu hết bệnh nhân lupus." },
        { name: "Anti-dsDNA", description: "Kháng thể đặc hiệu cho lupus, mức độ tương quan với hoạt tính bệnh và tổn thương thận." },
        { name: "Bổ thể C3", description: "Đo nồng độ bổ thể C3 trong máu, giảm khi bệnh lupus hoạt động mạnh." },
        { name: "Bổ thể C4", description: "Đo nồng độ bổ thể C4, giúp đánh giá mức độ hoạt động của bệnh tự miễn." },
        { name: "Công thức máu toàn phần", description: "Đánh giá các thành phần máu, phát hiện thiếu máu, giảm bạch cầu hoặc tiểu cầu do lupus." },
      ],
    },
    {
      name: "Panel Lupus Mở rộng",
      price: 3500000,
      commission: 175000,
      description: "Panel xét nghiệm toàn diện cho lupus, bao gồm các kháng thể đặc hiệu và chỉ số viêm, phù hợp cho chẩn đoán và theo dõi chuyên sâu.",
      markers: [
        { name: "ANA (Kháng thể kháng nhân)", description: "Xét nghiệm sàng lọc tự miễn, phát hiện kháng thể chống lại nhân tế bào." },
        { name: "Anti-dsDNA", description: "Kháng thể đặc hiệu cho lupus, tương quan với hoạt tính bệnh và tổn thương thận." },
        { name: "Bổ thể C3", description: "Đo nồng độ bổ thể C3, giảm khi bệnh lupus hoạt động mạnh." },
        { name: "Bổ thể C4", description: "Đo nồng độ bổ thể C4, giúp đánh giá mức độ hoạt động của bệnh tự miễn." },
        { name: "Công thức máu toàn phần", description: "Đánh giá các thành phần máu, phát hiện thiếu máu, giảm bạch cầu hoặc tiểu cầu." },
        { name: "Anti-Smith", description: "Kháng thể đặc hiệu cao cho lupus, giúp xác nhận chẩn đoán dù độ nhạy không cao." },
        { name: "Anti-RNP", description: "Kháng thể liên quan đến bệnh mô liên kết hỗn hợp, thường đi kèm với lupus." },
        { name: "Anti-SSA (Ro)", description: "Kháng thể liên quan đến lupus da và lupus sơ sinh, cần theo dõi trong thai kỳ." },
        { name: "Anti-SSB (La)", description: "Kháng thể thường đi kèm Anti-SSA, liên quan đến hội chứng Sjögren và lupus." },
        { name: "Tốc độ lắng máu (ESR)", description: "Chỉ số viêm không đặc hiệu, tăng khi có viêm nhiễm hoặc bệnh tự miễn hoạt động." },
        { name: "CRP hs", description: "Protein phản ứng C siêu nhạy, đánh giá mức độ viêm trong cơ thể." },
      ],
    },
  ],
  "DV-006": [
    {
      name: "Panel TORCH Cơ bản",
      price: 1200000,
      commission: 60000,
      description: "Panel xét nghiệm cơ bản TORCH cho phụ nữ mang thai hoặc chuẩn bị mang thai, phát hiện 4 tác nhân nhiễm trùng chính.",
      markers: [
        { name: "Toxoplasma IgG/IgM", description: "Phát hiện nhiễm ký sinh trùng Toxoplasma gondii, có thể gây dị tật bẩm sinh ở thai nhi." },
        { name: "Rubella IgG/IgM", description: "Kiểm tra miễn dịch với Rubella (sởi Đức), virus gây dị tật nghiêm trọng cho thai nhi." },
        { name: "CMV IgG/IgM", description: "Phát hiện nhiễm Cytomegalovirus, có thể gây điếc và chậm phát triển ở trẻ sơ sinh." },
        { name: "HSV-2 IgG/IgM", description: "Phát hiện Herpes simplex virus type 2, có nguy cơ lây truyền cho trẻ khi sinh." },
      ],
    },
    {
      name: "Panel TORCH Mở rộng",
      price: 2800000,
      commission: 140000,
      description: "Panel xét nghiệm TORCH toàn diện kèm sàng lọc các bệnh lây truyền qua đường máu, phù hợp cho khám tiền hôn nhân và tiền sản.",
      markers: [
        { name: "Toxoplasma IgG/IgM", description: "Phát hiện nhiễm ký sinh trùng Toxoplasma gondii, có thể gây dị tật bẩm sinh ở thai nhi." },
        { name: "Rubella IgG/IgM", description: "Kiểm tra miễn dịch với Rubella (sởi Đức), virus gây dị tật nghiêm trọng cho thai nhi." },
        { name: "CMV IgG/IgM", description: "Phát hiện nhiễm Cytomegalovirus, có thể gây điếc và chậm phát triển ở trẻ sơ sinh." },
        { name: "HSV-1 IgG/IgM", description: "Phát hiện Herpes simplex virus type 1, thường gây mụn rộp ở miệng, có thể lây cho trẻ." },
        { name: "HSV-2 IgG/IgM", description: "Phát hiện Herpes simplex virus type 2, có nguy cơ lây truyền cho trẻ khi sinh." },
        { name: "Parvovirus B19 IgG/IgM", description: "Phát hiện nhiễm Parvovirus B19, có thể gây thiếu máu thai nhi và phù thai." },
        { name: "Syphilis (RPR/TPHA)", description: "Tầm soát giang mai - bệnh lây truyền qua đường tình dục, có thể lây từ mẹ sang con." },
        { name: "HIV Ag/Ab", description: "Xét nghiệm phát hiện kháng nguyên và kháng thể HIV, quan trọng trong dự phòng lây truyền mẹ-con." },
        { name: "HBsAg", description: "Tầm soát viêm gan B, virus có nguy cơ lây truyền cao từ mẹ sang con khi sinh." },
        { name: "Anti-HCV", description: "Tầm soát viêm gan C, cần phát hiện sớm để có kế hoạch theo dõi thai kỳ phù hợp." },
      ],
    },
  ],
  "DV-007": [
    {
      name: "Gói Đồng",
      price: 1500000,
      commission: 75000,
      description: "Gói tầm soát tim mạch cơ bản với ECG, siêu âm tim và xét nghiệm mỡ máu, phù hợp cho kiểm tra định kỳ.",
      markers: [
        { name: "Điện tâm đồ (ECG)", description: "Ghi lại hoạt động điện của tim, phát hiện rối loạn nhịp tim, thiếu máu cơ tim." },
        { name: "Siêu âm tim 2D", description: "Đánh giá cấu trúc và chức năng tim, phát hiện bệnh van tim, giãn buồng tim." },
        { name: "Cholesterol toàn phần", description: "Đo tổng lượng cholesterol trong máu, chỉ số cơ bản đánh giá nguy cơ xơ vữa động mạch." },
        { name: "Triglyceride", description: "Đo nồng độ chất béo trung tính, tăng cao làm tăng nguy cơ bệnh tim mạch và viêm tụy." },
        { name: "Đường huyết lúc đói", description: "Đo glucose máu lúc đói, đái tháo đường là yếu tố nguy cơ chính của bệnh tim mạch." },
      ],
    },
    {
      name: "Gói Bạc",
      price: 3000000,
      commission: 150000,
      description: "Gói tầm soát tim mạch nâng cao với siêu âm Doppler, xét nghiệm mỡ máu chi tiết và chỉ số viêm CRP.",
      markers: [
        { name: "Điện tâm đồ (ECG)", description: "Ghi lại hoạt động điện của tim, phát hiện rối loạn nhịp tim, thiếu máu cơ tim." },
        { name: "Siêu âm tim 2D", description: "Đánh giá cấu trúc và chức năng tim, phát hiện bệnh van tim, giãn buồng tim." },
        { name: "Siêu âm Doppler tim", description: "Đánh giá dòng chảy máu qua các van tim, phát hiện hở van, hẹp van và tăng áp phổi." },
        { name: "Cholesterol toàn phần", description: "Đo tổng lượng cholesterol trong máu, chỉ số cơ bản đánh giá nguy cơ xơ vữa động mạch." },
        { name: "HDL-C", description: "Cholesterol tốt - bảo vệ mạch máu khỏi xơ vữa, mức cao là có lợi cho sức khỏe." },
        { name: "LDL-C", description: "Cholesterol xấu - tích tụ trong thành mạch gây xơ vữa, cần duy trì ở mức thấp." },
        { name: "Triglyceride", description: "Đo nồng độ chất béo trung tính, tăng cao làm tăng nguy cơ bệnh tim mạch." },
        { name: "Đường huyết lúc đói", description: "Đo glucose máu lúc đói, tầm soát đái tháo đường - yếu tố nguy cơ tim mạch." },
        { name: "HbA1c", description: "Đánh giá đường huyết trung bình 3 tháng, phản ánh kiểm soát đường huyết dài hạn." },
        { name: "CRP hs (nguy cơ tim mạch)", description: "Protein phản ứng C siêu nhạy, đánh giá nguy cơ viêm mạch máu và biến cố tim mạch." },
      ],
    },
    {
      name: "Gói Kim cương",
      price: 7000000,
      commission: 350000,
      description: "Gói tầm soát tim mạch toàn diện nhất với đầy đủ siêu âm Doppler, Holter ECG 24h và các marker tim mạch chuyên sâu.",
      markers: [
        { name: "Điện tâm đồ (ECG)", description: "Ghi lại hoạt động điện của tim, phát hiện rối loạn nhịp tim, thiếu máu cơ tim." },
        { name: "Siêu âm tim 2D", description: "Đánh giá cấu trúc và chức năng tim, phát hiện bệnh van tim, giãn buồng tim." },
        { name: "Siêu âm Doppler tim", description: "Đánh giá dòng chảy máu qua các van tim, phát hiện hở van, hẹp van." },
        { name: "Siêu âm Doppler mạch cảnh", description: "Đánh giá mạch máu cổ, phát hiện xơ vữa và hẹp động mạch cảnh - nguy cơ đột quỵ." },
        { name: "Siêu âm Doppler mạch chi dưới", description: "Kiểm tra lưu thông máu ở chân, phát hiện huyết khối tĩnh mạch sâu và suy tĩnh mạch." },
        { name: "Holter ECG 24h", description: "Theo dõi liên tục nhịp tim 24 giờ, phát hiện rối loạn nhịp thoáng qua không thấy trên ECG thường." },
        { name: "Cholesterol toàn phần", description: "Đo tổng lượng cholesterol trong máu, đánh giá nguy cơ xơ vữa động mạch." },
        { name: "HDL-C", description: "Cholesterol tốt - bảo vệ mạch máu khỏi xơ vữa." },
        { name: "LDL-C", description: "Cholesterol xấu - tích tụ trong thành mạch gây xơ vữa." },
        { name: "Triglyceride", description: "Chất béo trung tính, tăng cao làm tăng nguy cơ bệnh tim mạch." },
        { name: "Lipoprotein(a)", description: "Yếu tố nguy cơ tim mạch di truyền, tăng cao làm tăng nguy cơ nhồi máu cơ tim." },
        { name: "Đường huyết lúc đói", description: "Tầm soát đái tháo đường - yếu tố nguy cơ chính của bệnh tim mạch." },
        { name: "HbA1c", description: "Đánh giá đường huyết trung bình 3 tháng, phản ánh kiểm soát đường huyết dài hạn." },
        { name: "CRP hs (nguy cơ tim mạch)", description: "Đánh giá nguy cơ viêm mạch máu và biến cố tim mạch." },
        { name: "BNP / NT-proBNP", description: "Marker suy tim, tăng khi tim bị quá tải áp lực hoặc thể tích, hỗ trợ chẩn đoán suy tim." },
        { name: "Troponin T hs", description: "Marker tổn thương cơ tim siêu nhạy, phát hiện sớm nhồi máu cơ tim cấp." },
        { name: "Homocysteine", description: "Acid amin tăng cao gây tổn thương mạch máu, là yếu tố nguy cơ độc lập của bệnh tim mạch." },
        { name: "Chỉ số ABI (mạch ngoại biên)", description: "So sánh huyết áp cổ chân và cánh tay, đánh giá bệnh động mạch ngoại biên." },
      ],
    },
  ],
  "DV-008": [
    {
      name: "Gói Bạc",
      price: 2500000,
      commission: 125000,
      description: "Gói khám sức khỏe định kỳ cơ bản với các xét nghiệm máu thiết yếu, siêu âm bụng và X-quang ngực.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan các thành phần máu: hồng cầu, bạch cầu, tiểu cầu." },
        { name: "Đường huyết lúc đói", description: "Tầm soát đái tháo đường và tiền đái tháo đường." },
        { name: "Chức năng gan (AST, ALT)", description: "Đo men gan để đánh giá tình trạng tổn thương và viêm gan." },
        { name: "Chức năng thận (Creatinine, Ure)", description: "Đánh giá chức năng lọc của thận." },
        { name: "Mỡ máu cơ bản", description: "Đo cholesterol tổng và triglyceride, đánh giá nguy cơ tim mạch cơ bản." },
        { name: "Tổng phân tích nước tiểu", description: "Phân tích nước tiểu phát hiện bệnh thận, tiểu đường, nhiễm trùng." },
        { name: "Siêu âm bụng tổng quát", description: "Siêu âm đánh giá gan, mật, thận, tụy, lách." },
        { name: "X-quang ngực thẳng", description: "Chụp X-quang phổi để phát hiện viêm phổi, lao, u phổi và bệnh lý tim mạch." },
      ],
    },
    {
      name: "Gói Vàng",
      price: 4500000,
      commission: 225000,
      description: "Gói khám nâng cao với xét nghiệm chuyên sâu hơn, bao gồm tuyến giáp, siêu âm tuyến giáp và ECG.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan các thành phần máu." },
        { name: "Đường huyết lúc đói", description: "Tầm soát đái tháo đường." },
        { name: "HbA1c", description: "Đánh giá đường huyết trung bình 3 tháng." },
        { name: "Chức năng gan (AST, ALT, GGT)", description: "Đo men gan chi tiết hơn bao gồm GGT - liên quan đến bệnh gan do rượu." },
        { name: "Chức năng thận (Creatinine, Ure, eGFR)", description: "Đánh giá chức năng thận toàn diện với ước tính mức lọc cầu thận." },
        { name: "Mỡ máu toàn phần", description: "Đo đầy đủ cholesterol tổng, HDL, LDL, triglyceride." },
        { name: "Acid Uric", description: "Đo nồng độ acid uric máu, tăng cao gây bệnh gout và sỏi thận." },
        { name: "TSH (Tuyến giáp)", description: "Đánh giá chức năng tuyến giáp, phát hiện cường giáp hoặc suy giáp." },
        { name: "Tổng phân tích nước tiểu", description: "Phân tích nước tiểu phát hiện bệnh lý thận và đường tiết niệu." },
        { name: "Siêu âm bụng tổng quát", description: "Siêu âm đánh giá các cơ quan trong ổ bụng." },
        { name: "Siêu âm tuyến giáp", description: "Siêu âm đánh giá cấu trúc tuyến giáp, phát hiện nhân giáp, u giáp." },
        { name: "Điện tâm đồ (ECG)", description: "Ghi lại hoạt động điện của tim, phát hiện rối loạn nhịp tim." },
        { name: "X-quang ngực thẳng", description: "Chụp X-quang phổi phát hiện các bệnh lý phổi và tim mạch." },
      ],
    },
    {
      name: "Gói Kim cương",
      price: 8000000,
      commission: 400000,
      description: "Gói khám sức khỏe toàn diện nhất bao gồm tầm soát ung thư, siêu âm tim, nội soi dạ dày và đầy đủ xét nghiệm chuyên sâu.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan các thành phần máu." },
        { name: "Đường huyết lúc đói", description: "Tầm soát đái tháo đường." },
        { name: "HbA1c", description: "Đánh giá đường huyết trung bình 3 tháng." },
        { name: "Chức năng gan (AST, ALT, GGT, Bilirubin)", description: "Đánh giá toàn diện chức năng gan bao gồm cả chức năng bài tiết mật." },
        { name: "Chức năng thận (Creatinine, Ure, eGFR)", description: "Đánh giá chức năng thận toàn diện." },
        { name: "Mỡ máu toàn phần", description: "Đo đầy đủ profile lipid máu." },
        { name: "Acid Uric", description: "Tầm soát bệnh gout và nguy cơ sỏi thận." },
        { name: "TSH, FT4 (Tuyến giáp)", description: "Đánh giá chi tiết chức năng tuyến giáp với cả TSH và FT4." },
        { name: "CEA (Tầm soát ung thư đại tràng)", description: "Marker tầm soát ung thư đại trực tràng, cũng tăng trong một số ung thư khác." },
        { name: "AFP (Tầm soát ung thư gan)", description: "Marker tầm soát ung thư gan nguyên phát (ung thư biểu mô tế bào gan)." },
        { name: "CA 19-9 (Tầm soát ung thư tụy)", description: "Marker tầm soát ung thư tụy và ung thư đường mật." },
        { name: "Tổng phân tích nước tiểu", description: "Phân tích nước tiểu phát hiện bệnh lý." },
        { name: "Siêu âm bụng tổng quát", description: "Siêu âm đánh giá các cơ quan trong ổ bụng." },
        { name: "Siêu âm tuyến giáp", description: "Phát hiện nhân giáp, u giáp." },
        { name: "Siêu âm tim", description: "Đánh giá cấu trúc và chức năng tim." },
        { name: "Điện tâm đồ (ECG)", description: "Phát hiện rối loạn nhịp tim và thiếu máu cơ tim." },
        { name: "X-quang ngực thẳng", description: "Phát hiện bệnh lý phổi và tim mạch." },
        { name: "Nội soi dạ dày", description: "Kiểm tra trực tiếp niêm mạc dạ dày, phát hiện viêm, loét, polyp." },
      ],
    },
  ],
  "DV-009": [
    {
      name: "Gói Cơ bản",
      price: 800000,
      commission: 40000,
      description: "Gói kiểm tra chức năng gan cơ bản với các men gan chính và tầm soát viêm gan B.",
      markers: [
        { name: "AST (SGOT)", description: "Men gan AST - tăng khi có tổn thương tế bào gan, cũng có thể tăng trong bệnh lý cơ và tim." },
        { name: "ALT (SGPT)", description: "Men gan ALT - đặc hiệu cho gan hơn AST, tăng khi có viêm gan hoặc tổn thương gan." },
        { name: "GGT", description: "Enzyme GGT tăng cao trong bệnh gan do rượu, tắc mật và xơ gan." },
        { name: "Bilirubin toàn phần", description: "Đo tổng bilirubin, tăng cao gây vàng da, phản ánh chức năng bài tiết của gan." },
        { name: "HBsAg (Viêm gan B)", description: "Kháng nguyên bề mặt viêm gan B, dương tính khi đang nhiễm hoặc mang virus viêm gan B." },
      ],
    },
    {
      name: "Gói Nâng cao",
      price: 2200000,
      commission: 110000,
      description: "Gói đánh giá chức năng gan toàn diện bao gồm siêu âm gan mật, tầm soát viêm gan B, C và marker ung thư gan.",
      markers: [
        { name: "AST (SGOT)", description: "Men gan AST - tăng khi có tổn thương tế bào gan." },
        { name: "ALT (SGPT)", description: "Men gan ALT - đặc hiệu cho gan, tăng khi có viêm hoặc tổn thương gan." },
        { name: "GGT", description: "Enzyme GGT tăng trong bệnh gan do rượu, tắc mật." },
        { name: "Bilirubin toàn phần", description: "Đo tổng bilirubin, phản ánh chức năng bài tiết gan." },
        { name: "Bilirubin trực tiếp", description: "Bilirubin đã qua chuyển hóa tại gan, tăng khi có tắc mật hoặc bệnh gan nội tại." },
        { name: "Albumin", description: "Protein do gan tổng hợp, giảm khi chức năng gan suy giảm hoặc bệnh gan mạn tính." },
        { name: "Protein toàn phần", description: "Đánh giá tổng protein huyết tương, phản ánh chức năng tổng hợp của gan." },
        { name: "HBsAg (Viêm gan B)", description: "Tầm soát nhiễm virus viêm gan B." },
        { name: "Anti-HCV (Viêm gan C)", description: "Tầm soát nhiễm virus viêm gan C, cần điều trị sớm để ngăn xơ gan." },
        { name: "AFP (Tầm soát ung thư gan)", description: "Marker tầm soát ung thư gan, đặc biệt quan trọng với người viêm gan mạn." },
        { name: "Siêu âm gan mật", description: "Siêu âm đánh giá cấu trúc gan, mật, phát hiện gan nhiễm mỡ, sỏi mật, u gan." },
      ],
    },
  ],
  "DV-010": [
    {
      name: "Gói Nam",
      price: 2500000,
      commission: 125000,
      description: "Gói xét nghiệm tiền hôn nhân dành cho nam giới, bao gồm xét nghiệm máu, bệnh lây truyền và tinh dịch đồ.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan sức khỏe qua các thành phần máu." },
        { name: "Nhóm máu ABO + Rh", description: "Xác định nhóm máu, quan trọng cho dự phòng bất đồng nhóm máu mẹ-con." },
        { name: "Đường huyết lúc đói", description: "Tầm soát đái tháo đường trước khi lập gia đình." },
        { name: "Chức năng gan (AST, ALT)", description: "Đánh giá tình trạng gan trước hôn nhân." },
        { name: "Chức năng thận (Creatinine)", description: "Đánh giá chức năng lọc của thận." },
        { name: "HBsAg (Viêm gan B)", description: "Tầm soát viêm gan B - có thể lây truyền cho vợ/chồng và con." },
        { name: "Anti-HCV (Viêm gan C)", description: "Tầm soát viêm gan C trước hôn nhân." },
        { name: "HIV Ag/Ab", description: "Tầm soát HIV trước hôn nhân, quan trọng cho dự phòng lây nhiễm." },
        { name: "Syphilis (RPR)", description: "Tầm soát giang mai - bệnh lây truyền qua đường tình dục và từ mẹ sang con." },
        { name: "Tinh dịch đồ", description: "Đánh giá chất lượng tinh trùng: số lượng, hình dạng, khả năng di động." },
      ],
    },
    {
      name: "Gói Nữ",
      price: 3000000,
      commission: 150000,
      description: "Gói xét nghiệm tiền hôn nhân dành cho nữ giới, bao gồm sàng lọc bệnh lây truyền, tuyến giáp và siêu âm phụ khoa.",
      markers: [
        { name: "Công thức máu toàn phần", description: "Đánh giá tổng quan sức khỏe, phát hiện thiếu máu thường gặp ở nữ." },
        { name: "Nhóm máu ABO + Rh", description: "Xác định nhóm máu, quan trọng cho dự phòng bất đồng nhóm máu Rh mẹ-con." },
        { name: "Đường huyết lúc đói", description: "Tầm soát đái tháo đường trước khi mang thai." },
        { name: "Chức năng gan (AST, ALT)", description: "Đánh giá tình trạng gan trước hôn nhân." },
        { name: "Chức năng thận (Creatinine)", description: "Đánh giá chức năng lọc của thận." },
        { name: "HBsAg (Viêm gan B)", description: "Tầm soát viêm gan B - quan trọng vì có thể lây từ mẹ sang con khi sinh." },
        { name: "Anti-HCV (Viêm gan C)", description: "Tầm soát viêm gan C trước hôn nhân." },
        { name: "HIV Ag/Ab", description: "Tầm soát HIV, quan trọng cho dự phòng lây truyền mẹ-con." },
        { name: "Syphilis (RPR)", description: "Tầm soát giang mai - có thể gây dị tật bẩm sinh ở thai nhi." },
        { name: "Rubella IgG", description: "Kiểm tra miễn dịch với Rubella, cần tiêm vắc-xin nếu chưa có miễn dịch trước khi mang thai." },
        { name: "TSH (Tuyến giáp)", description: "Đánh giá chức năng tuyến giáp, rối loạn giáp ảnh hưởng đến khả năng thụ thai và thai kỳ." },
        { name: "Siêu âm phụ khoa", description: "Siêu âm đánh giá tử cung, buồng trứng, phát hiện u xơ, nang buồng trứng." },
      ],
    },
  ],
};

export default function ServiceDetail() {
  const { active, onTab } = useTabNav();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const serviceId = parseInt(params.id || "0");
  const [expandedMarkers, setExpandedMarkers] = useState<Record<string, boolean>>({});
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [selectedPackageIdx, setSelectedPackageIdx] = useState<number | null>(null);

  const { data: allServices = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const service = allServices.find((s) => s.id === serviceId);
  const packages = service ? SERVICE_PACKAGES[service.code] || [] : [];

  const toggleMarker = (pkgIdx: number, mIdx: number) => {
    const key = `${pkgIdx}-${mIdx}`;
    setExpandedMarkers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateOrder = () => {
    if (packages.length > 0) {
      setSelectedPackageIdx(null);
      setPackageDialogOpen(true);
    } else if (service) {
      navigate(`/orders/new?serviceId=${service.id}`);
    }
  };

  const confirmPackageAndNavigate = () => {
    if (selectedPackageIdx !== null && service) {
      navigate(`/orders/new?serviceId=${service.id}&packageIdx=${selectedPackageIdx}`);
    }
  };

  if (isLoading) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Dịch vụ" onBack={() => navigate("/services")} />
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-np-brand-ink border-t-transparent" />
        </div>
      </Screen>
    );
  }

  if (!service) {
    return (
      <Screen activeTab={active} onTab={onTab} noHeader>
        <DetailHeader title="Dịch vụ" onBack={() => navigate("/services")} />
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <p className="text-np-text-muted">Không tìm thấy dịch vụ</p>
          <button
            type="button"
            onClick={() => navigate("/services")}
            className="mt-3 text-[14px] font-medium text-np-brand-ink hover:underline"
          >
            Quay lại danh sách
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen activeTab={active} onTab={onTab} noHeader>
      <DetailHeader title={service.title} onBack={() => navigate("/services")} />

      <div className="bg-np-surface-sub pb-24">
        {/* Hero */}
        <div className="bg-white px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-np-card bg-np-surface-sub">
              <Stethoscope size={24} strokeWidth={2.2} className="text-np-text-sub" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-bold text-np-ink">{service.title}</h2>
                <span className="flex items-center gap-1 rounded bg-np-surface-sub px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.6px] text-np-text-muted">
                  <Hash size={10} /> {service.code}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-np-text-sub">
                {service.description}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-np-surface-sub px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-np-text-muted">
                <Package size={12} strokeWidth={2.25} /> Giá dịch vụ
              </div>
              <div className="mt-1 text-[15px] font-bold text-np-ink">{fmtVND(service.price)}</div>
            </div>
            <div className="rounded-lg bg-np-brand-soft px-3 py-2.5">
              <div className="flex items-center gap-1 text-[11px] text-np-brand-ink">
                <BadgePercent size={12} strokeWidth={2.25} /> Hoa hồng
              </div>
              <div className="mt-1 text-[15px] font-bold text-np-brand-ink">
                {service.commissionRange}₫
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <SectionTitle>Thông tin chi tiết</SectionTitle>
        <Card className="space-y-3 p-4">
          <InfoLine
            icon={<UserRound size={15} strokeWidth={2.25} />}
            label="Chỉ định"
            trailing={
              <Badge tone={service.requiresDoctor ? "attention" : "neutral"}>
                {service.requiresDoctor ? "Bác sĩ" : "Kỹ thuật viên"}
              </Badge>
            }
          />
          <InfoLine
            icon={<Clock size={15} strokeWidth={2.25} />}
            label="Thời gian"
            trailing={<span className="text-[13px] font-bold text-np-ink">{service.duration}</span>}
          />
          <InfoLine
            icon={<Shield size={15} strokeWidth={2.25} />}
            label="Bảo hiểm"
            trailing={
              <Badge tone={service.insurance === "Có hỗ trợ" ? "success" : "critical"}>
                {service.insurance}
              </Badge>
            }
          />
        </Card>

        {/* Packages */}
        {packages.length > 0 && (
          <>
            <SectionTitle>Các gói dịch vụ ({packages.length} gói)</SectionTitle>
            <div className="space-y-3 px-0">
              {packages.map((pkg, pkgIdx) => (
                <Card key={pkgIdx} className="overflow-hidden p-0">
                  <div className="bg-np-surface-sub px-4 py-3.5">
                    <h4 className="text-[14px] font-bold text-np-ink">
                      {pkg.name} ({pkg.markers.length} chỉ số)
                    </h4>
                    <p className="mt-1 text-[12px] leading-relaxed text-np-text-sub">
                      {pkg.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-1 text-[12px]">
                        <Package size={12} strokeWidth={2.25} className="text-np-text-muted" />
                        <span className="text-np-text-muted">Giá:</span>
                        <span className="font-bold text-np-ink">{fmtVND(pkg.price)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[12px]">
                        <BadgePercent size={12} strokeWidth={2.25} className="text-np-brand-ink" />
                        <span className="text-np-brand-ink">HH:</span>
                        <span className="font-bold text-np-brand-ink">{fmtVND(pkg.commission)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {pkg.markers.map((marker, mIdx) => {
                      const isExpanded = expandedMarkers[`${pkgIdx}-${mIdx}`];
                      return (
                        <div
                          key={mIdx}
                          className={
                            mIdx === pkg.markers.length - 1
                              ? ""
                              : "border-b border-np-surface-pressed"
                          }
                        >
                          <button
                            type="button"
                            onClick={() => marker.description && toggleMarker(pkgIdx, mIdx)}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                              marker.description
                                ? "cursor-pointer hover:bg-np-surface-sub"
                                : "cursor-default"
                            }`}
                          >
                            {marker.description && isExpanded ? (
                              <Minus size={16} className="flex-shrink-0 text-np-brand-ink" />
                            ) : (
                              <Plus size={16} className="flex-shrink-0 text-np-brand-ink" />
                            )}
                            <span className="text-[14px] text-np-ink">{marker.name}</span>
                          </button>
                          {isExpanded && marker.description && (
                            <div className="px-4 pb-3 pl-11">
                              <p className="text-[12px] leading-relaxed text-np-text-sub">
                                {marker.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="h-5" />
      </div>

      {/* Sticky CTA */}
      <div className="absolute bottom-[64px] left-0 right-0 z-20 border-t border-np-border bg-white p-3">
        <NPButton
          tone="primary"
          size="lg"
          className="w-full justify-center"
          icon={ShoppingCart}
          onClick={handleCreateOrder}
        >
          Tạo đơn hàng
        </NPButton>
      </div>

      {/* FAB Hỏi AI */}
      <button
        type="button"
        onClick={() => navigate(`/ai-chat?service=${encodeURIComponent(service.title)}`)}
        className="absolute bottom-[132px] right-4 z-20 flex items-center gap-2 rounded-full bg-np-brand-ink px-4 py-3 text-white shadow-lg transition-colors hover:bg-np-brand-hover"
      >
        <Bot size={20} strokeWidth={2.25} />
        <span className="text-[14px] font-bold">Hỏi AI</span>
      </button>

      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="overflow-hidden rounded-np-card p-0 sm:max-w-md">
          <DialogHeader className="px-5 pb-0 pt-5">
            <DialogTitle className="text-[16px] font-bold text-np-ink">Chọn gói dịch vụ</DialogTitle>
            <p className="mt-1 text-[12px] text-np-text-muted">Vui lòng chọn gói để tạo đơn hàng</p>
          </DialogHeader>
          <div className="mt-4 max-h-[50vh] overflow-y-auto border-t border-np-border">
            {packages.map((pkg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPackageIdx(idx)}
                className={`w-full border-b border-np-surface-pressed px-5 py-4 text-left transition-colors last:border-0 ${
                  selectedPackageIdx === idx ? "bg-np-brand-soft" : "hover:bg-np-surface-sub"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      selectedPackageIdx === idx
                        ? "border-np-brand-ink bg-np-brand-ink"
                        : "border-np-border-strong"
                    }`}
                  >
                    {selectedPackageIdx === idx && (
                      <CheckCircle2 size={14} className="text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-np-ink">{pkg.name}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-np-text-sub">
                      {pkg.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[12px]">
                      <span>
                        <span className="text-np-text-muted">Giá: </span>
                        <span className="font-bold text-np-ink">{fmtVND(pkg.price)}</span>
                      </span>
                      <span>
                        <span className="text-np-brand-ink">HH: </span>
                        <span className="font-bold text-np-brand-ink">{fmtVND(pkg.commission)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-np-border bg-white px-5 py-4">
            <NPButton
              tone="primary"
              className="flex-1 justify-center"
              disabled={selectedPackageIdx === null}
              onClick={confirmPackageAndNavigate}
            >
              Tạo đơn hàng
            </NPButton>
            <NPButton tone="ghost" onClick={() => setPackageDialogOpen(false)}>
              Huỷ
            </NPButton>
          </div>
        </DialogContent>
      </Dialog>
    </Screen>
  );
}

function InfoLine({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[12px] text-np-text-muted">
        {icon}
        <span>{label}</span>
      </div>
      {trailing}
    </div>
  );
}
