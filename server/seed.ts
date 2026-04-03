import { storage } from "./storage";

export async function seedDatabase() {
  try {
    const existingUsers = await storage.getAllUsers();
    if (existingUsers.length > 0) {
      return;
    }

    await storage.createService({ code: "DV-001", title: "Thủ thuật y khoa", description: "Thực hiện các thủ thuật can thiệp lâm sàng nhanh chóng theo chỉ định của bác sĩ.", price: 350000, commissionRange: "50.000 - 200.000", requiresDoctor: true, duration: "15-30 phút", insurance: "Có hỗ trợ", category: "Thủ thuật", diseaseType: "Tổng quát" });
    await storage.createService({ code: "DV-002", title: "Nội soi tiêu hóa", description: "Thực hiện nội soi dạ dày, đại tràng bằng công nghệ hiện đại, không đau, phát hiện sớm ung thư.", price: 2500000, commissionRange: "150.000 - 500.000", requiresDoctor: true, duration: "45-60 phút", insurance: "Có hỗ trợ", category: "Nội soi", diseaseType: "Tiêu hóa" });
    await storage.createService({ code: "DV-003", title: "Xét nghiệm chất gây nghiện", description: "Kiểm tra nhanh và chính xác sự hiện diện của các chất kích thích trong cơ thể.", price: 200000, commissionRange: "30.000 - 100.000", requiresDoctor: false, duration: "10-20 phút", insurance: "Không hỗ trợ", category: "Xét nghiệm", diseaseType: "Chất kích thích" });
    await storage.createService({ code: "DV-004", title: "Khám sức khỏe Nam/Nữ giới", description: "Gói khám sức khỏe chuyên biệt được thiết kế riêng cho các đặc điểm sinh lý của Nam giới và Nữ giới.", price: 800000, commissionRange: "100.000 - 300.000", requiresDoctor: true, duration: "30-45 phút", insurance: "Có hỗ trợ", category: "Khám tổng quát", diseaseType: "Tổng quát" });
    await storage.createService({ code: "DV-005", title: "Chẩn đoán Lupus", description: "Xét nghiệm chuyên biệt chẩn đoán bệnh tự miễn Lupus ban đỏ hệ thống và các bệnh lý liên quan.", price: 600000, commissionRange: "80.000 - 250.000", requiresDoctor: true, duration: "20-30 phút", insurance: "Có hỗ trợ", category: "Chẩn đoán", diseaseType: "Miễn dịch" });
    await storage.createService({ code: "DV-006", title: "Sàng lọc lây nhiễm từ Mẹ sang Thai nhi", description: "Kiểm tra các tác nhân gây bệnh truyền nhiễm có thể lây sang bé trong quá trình mang thai.", price: 1500000, commissionRange: "120.000 - 400.000", requiresDoctor: true, duration: "15-25 phút", insurance: "Có hỗ trợ", category: "Sàng lọc", diseaseType: "Sinh sản" });
    await storage.createService({ code: "DV-007", title: "Tầm soát Tim mạch chuyên sâu", description: "Đánh giá chức năng tim, mạch máu và tầm soát nguy cơ đột quỵ, xơ vữa động mạch bằng kỹ thuật hiện đại.", price: 4500000, commissionRange: "200.000 - 600.000", requiresDoctor: true, duration: "60-90 phút", insurance: "Có hỗ trợ", category: "Tầm soát", diseaseType: "Tim mạch" });
    await storage.createService({ code: "DV-008", title: "Gói khám tổng quát", description: "Tổng hợp các gói khám Bạc, Vàng, Kim cương giúp tầm soát sức khỏe toàn diện từ cơ bản đến cao cấp.", price: 3500000, commissionRange: "300.000 - 1.500.000", requiresDoctor: false, duration: "120-180 phút", insurance: "Có hỗ trợ", category: "Khám tổng quát", diseaseType: "Tổng quát" });
    await storage.createService({ code: "DV-009", title: "Kiểm tra chức năng Gan", description: "Xét nghiệm virus viêm gan và đánh giá men gan, chức năng giải độc gan định kỳ.", price: 350000, commissionRange: "40.000 - 150.000", requiresDoctor: true, duration: "15-20 phút", insurance: "Có hỗ trợ", category: "Xét nghiệm", diseaseType: "Gan" });
    await storage.createService({ code: "DV-010", title: "Khám Tiền hôn nhân", description: "Kiểm tra sức khỏe sinh sản và di truyền cho các cặp đôi trước khi xây dựng tổ ấm.", price: 2000000, commissionRange: "150.000 - 450.000", requiresDoctor: false, duration: "60-90 phút", insurance: "Không hỗ trợ", category: "Khám tổng quát", diseaseType: "Sinh sản" });

    const mainUser = await storage.createUser({
      username: "mai",
      password: "password123",
      name: "Nguyễn Thị Mai",
      role: "Chuyên viên Tư vấn",
      department: "Phòng Kinh Doanh",
      targetRevenue: 50000000,
      currentRevenue: 35000000,
      commissionRate: 5,
    });

    await storage.createAppointment({ code: "#NP260226001", patientName: "Trần Văn An", phone: "0901234567", serviceId: 7, serviceName: "Siêu âm Doppler Tim", time: "08:30", date: "26/02/2026", status: "Hoàn tất" });
    await storage.createAppointment({ code: "#NP260226002", patientName: "Lê Thị Bình", phone: "0912345678", serviceId: 8, serviceName: "Xét nghiệm Tổng quát", time: "09:15", date: "26/02/2026", status: "Đang chờ" });
    await storage.createAppointment({ code: "#NP260226003", patientName: "Phạm Hồng Chương", phone: "0923456789", serviceId: 4, serviceName: "Khám Nội tổng quát", time: "10:00", date: "26/02/2026", status: "Đang chờ" });
    await storage.createAppointment({ code: "#NP260226004", patientName: "Nguyễn Thị Diệu", phone: "0934567890", serviceId: 2, serviceName: "Nội soi dạ dày", time: "14:30", date: "26/02/2026", status: "Đã hủy" });
    await storage.createAppointment({ code: "#NP260226005", patientName: "Hoàng Văn Em", phone: "0945678901", serviceId: 9, serviceName: "Chụp X-Quang phổi", time: "15:45", date: "26/02/2026", status: "Đang chờ" });

    await storage.createTransaction({ code: "XN-0982", serviceName: "Xét nghiệm Tổng quát", patientName: "Trần Văn A", date: "22/02/2026 10:15", value: 1200000, commission: 60000, status: "Hoàn tất", userId: mainUser.id });
    await storage.createTransaction({ code: "SA-0981", serviceName: "Siêu âm Doppler Tim", patientName: "Lê Thị B", date: "22/02/2026 09:30", value: 500000, commission: 25000, status: "Hoàn tất", userId: mainUser.id });
    await storage.createTransaction({ code: "KS-0980", serviceName: "Khám Sức khỏe Định kỳ", patientName: "Phạm Văn C", date: "21/02/2026 16:45", value: 2500000, commission: 125000, status: "Đang chờ", userId: mainUser.id });
    await storage.createTransaction({ code: "XN-0979", serviceName: "Xét nghiệm NIPT", patientName: "Hoàng Đình D", date: "21/02/2026 14:20", value: 6500000, commission: 325000, status: "Hoàn tất", userId: mainUser.id });

    // Order 1: arrived + visit completed
    await storage.createOrder({ code: "#NP260213001", patientName: "Trần Văn An", phone: "0901234567", email: "tranvanan@gmail.com", serviceName: "Siêu âm Doppler Tim", serviceCode: "DV-007", serviceCategory: "Tim mạch", quantity: 1, unitPrice: 500000, totalPrice: 500000, commission: 25000, appointmentStatus: "arrived", visitStatus: "completed", notes: "", appointmentDate: "26/02/2026", appointmentTime: "08:30", examType: "Khám tại phòng khám", createdAt: "13/02/2026 08:30", userId: mainUser.id });
    // Order 2: arrived + visit completed
    await storage.createOrder({ code: "#NP260213002", patientName: "Lê Thị Bình", phone: "0912345678", email: "lethibinh@gmail.com", serviceName: "Xét nghiệm Tổng quát", serviceCode: "DV-008", serviceCategory: "Xét nghiệm", quantity: 1, unitPrice: 1200000, totalPrice: 1200000, commission: 60000, appointmentStatus: "arrived", visitStatus: "completed", notes: "Khách VIP", appointmentDate: "26/02/2026", appointmentTime: "09:15", examType: "Lấy mẫu tại nhà", createdAt: "13/02/2026 09:15", userId: mainUser.id });
    // Order 3: pending (mới tạo)
    await storage.createOrder({ code: "#NP260213003", patientName: "Phạm Hồng Chương", phone: "0923456789", serviceName: "Khám sức khỏe Nam/Nữ giới", serviceCode: "DV-004", serviceCategory: "Khám tổng quát", quantity: 1, unitPrice: 800000, totalPrice: 800000, commission: 40000, appointmentStatus: "pending", appointmentDate: "28/02/2026", appointmentTime: "10:00", examType: "Khám tại phòng khám", createdAt: "13/02/2026 10:00", userId: mainUser.id });
    // Order 4: cancelled
    await storage.createOrder({ code: "#NP260214001", patientName: "Nguyễn Thị Diệu", phone: "0934567890", email: "nguyendieu@gmail.com", serviceName: "Nội soi tiêu hóa", serviceCode: "DV-002", serviceCategory: "Nội soi", quantity: 1, unitPrice: 2500000, totalPrice: 2500000, commission: 125000, appointmentStatus: "cancelled", notes: "Khách hủy do bận", createdAt: "14/02/2026 14:30", userId: mainUser.id });
    // Order 5: arrived + visit in_progress
    await storage.createOrder({ code: "#NP260214002", patientName: "Hoàng Văn Em", phone: "0945678901", serviceName: "Gói khám tổng quát", serviceCode: "DV-008", serviceCategory: "Khám tổng quát", quantity: 2, unitPrice: 3500000, totalPrice: 7000000, commission: 350000, appointmentStatus: "arrived", visitStatus: "in_progress", appointmentDate: "20/02/2026", appointmentTime: "15:45", examType: "Khám tại phòng khám", createdAt: "14/02/2026 15:45", userId: mainUser.id });
    // Order 6: confirmed
    await storage.createOrder({ code: "#NP260215001", patientName: "Vũ Minh Phúc", phone: "0956789012", email: "vuminhphuc@gmail.com", serviceName: "Tầm soát Tim mạch chuyên sâu", serviceCode: "DV-007", serviceCategory: "Tim mạch", quantity: 1, unitPrice: 4500000, totalPrice: 4500000, commission: 225000, appointmentStatus: "confirmed", appointmentDate: "01/03/2026", appointmentTime: "09:00", examType: "Khám tại phòng khám", createdAt: "15/02/2026 09:00", userId: mainUser.id });
    // Order 7: reminded
    await storage.createOrder({ code: "#NP260220001", patientName: "Đặng Thu Hương", phone: "0967890123", email: "danghuong@gmail.com", serviceName: "Khám Tiền hôn nhân", serviceCode: "DV-010", serviceCategory: "Khám tổng quát", quantity: 2, unitPrice: 2000000, totalPrice: 4000000, commission: 200000, appointmentStatus: "reminded", appointmentDate: "22/02/2026", appointmentTime: "10:30", examType: "Khám tại phòng khám", createdAt: "20/02/2026 10:30", userId: mainUser.id });
    // Order 8: no_show
    await storage.createOrder({ code: "#NP260225001", patientName: "Bùi Quang Hải", phone: "0978901234", serviceName: "Kiểm tra chức năng Gan", serviceCode: "DV-009", serviceCategory: "Xét nghiệm", quantity: 1, unitPrice: 350000, totalPrice: 350000, commission: 17500, appointmentStatus: "no_show", notes: "Khám lần đầu", examType: "Lấy mẫu tại nhà", createdAt: "25/02/2026 08:00", userId: mainUser.id });

    // Seed status logs for orders that went through multiple steps
    await storage.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "13/02/2026 09:00", note: null });
    await storage.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "25/02/2026 18:00", note: "Đã gọi nhắc lịch" });
    await storage.createStatusLog({ orderId: 1, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "26/02/2026 08:25", note: null });
    await storage.createStatusLog({ orderId: 1, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "26/02/2026 08:35", note: null });
    await storage.createStatusLog({ orderId: 1, tier: "visit", fromStatus: "in_progress", toStatus: "completed", timestamp: "26/02/2026 09:10", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "14/02/2026 10:00", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "25/02/2026 17:00", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "26/02/2026 09:10", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "26/02/2026 09:20", note: null });
    await storage.createStatusLog({ orderId: 2, tier: "visit", fromStatus: "in_progress", toStatus: "completed", timestamp: "26/02/2026 10:00", note: null });
    await storage.createStatusLog({ orderId: 4, tier: "appointment", fromStatus: "pending", toStatus: "cancelled", timestamp: "14/02/2026 15:00", note: "Khách hủy do bận" });
    await storage.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "15/02/2026 08:00", note: null });
    await storage.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "19/02/2026 16:00", note: null });
    await storage.createStatusLog({ orderId: 5, tier: "appointment", fromStatus: "reminded", toStatus: "arrived", timestamp: "20/02/2026 15:40", note: null });
    await storage.createStatusLog({ orderId: 5, tier: "visit", fromStatus: "arrived", toStatus: "in_progress", timestamp: "20/02/2026 15:50", note: null });
    await storage.createStatusLog({ orderId: 6, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "16/02/2026 10:00", note: null });
    await storage.createStatusLog({ orderId: 7, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "20/02/2026 11:00", note: null });
    await storage.createStatusLog({ orderId: 7, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "21/02/2026 18:00", note: "Đã nhắn tin Zalo" });
    await storage.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "pending", toStatus: "confirmed", timestamp: "25/02/2026 09:00", note: null });
    await storage.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "confirmed", toStatus: "reminded", timestamp: "10/03/2026 17:00", note: null });
    await storage.createStatusLog({ orderId: 8, tier: "appointment", fromStatus: "reminded", toStatus: "no_show", timestamp: "11/03/2026 10:00", note: "Không liên lạc được" });

    await storage.createCustomer({ name: "Trần Văn An", phone: "0901234567", email: "tranvanan@gmail.com", address: "123 Nguyễn Huệ, Quận 1", location: "TP. Hồ Chí Minh", createdAt: "01/01/2026" });
    await storage.createCustomer({ name: "Lê Thị Bình", phone: "0912345678", email: "lethibinh@gmail.com", address: "456 Lê Lợi, Quận 3", location: "TP. Hồ Chí Minh", createdAt: "05/01/2026" });
    await storage.createCustomer({ name: "Phạm Hồng Chương", phone: "0923456789", address: "789 Trần Hưng Đạo, Quận 5", location: "TP. Hồ Chí Minh", createdAt: "10/01/2026" });
    await storage.createCustomer({ name: "Nguyễn Thị Diệu", phone: "0934567890", email: "nguyendieu@gmail.com", address: "12 Hoàng Diệu, Hải Châu", location: "Đà Nẵng", createdAt: "12/01/2026" });
    await storage.createCustomer({ name: "Hoàng Văn Em", phone: "0945678901", address: "34 Nguyễn Trãi, Ba Đình", location: "Hà Nội", createdAt: "15/01/2026" });
    await storage.createCustomer({ name: "Vũ Minh Phúc", phone: "0956789012", email: "vuminhphuc@gmail.com", address: "56 Lý Thường Kiệt, Tân Bình", location: "TP. Hồ Chí Minh", createdAt: "20/01/2026" });
    await storage.createCustomer({ name: "Đặng Thu Hương", phone: "0967890123", email: "danghuong@gmail.com", address: "78 Pasteur, Quận 1", location: "TP. Hồ Chí Minh", createdAt: "25/01/2026" });
    await storage.createCustomer({ name: "Bùi Quang Hải", phone: "0978901234", address: "90 Hai Bà Trưng, Hoàn Kiếm", location: "Hà Nội", createdAt: "01/02/2026" });

    await storage.createStaffMember({ name: "Trần Hữu Đạt", role: "BS. Trưởng Khoa", revenue: 85000000, commission: 4250000, rank: 1 });
    await storage.createStaffMember({ name: "Lê Hoàng Yến", role: "CV. Tư vấn", revenue: 42000000, commission: 2100000, rank: 2 });
    await storage.createStaffMember({ name: "Nguyễn Thị Mai", role: "CV. Tư vấn", revenue: 35000000, commission: 1750000, rank: 3 });
    await storage.createStaffMember({ name: "Phạm Quốc Bảo", role: "BS. Chuyên khoa", revenue: 28000000, commission: 1400000, rank: 4 });
    await storage.createStaffMember({ name: "Võ Thanh Tâm", role: "CV. Tư vấn", revenue: 22000000, commission: 1100000, rank: 5 });
    await storage.createStaffMember({ name: "Đỗ Ngọc Hân", role: "ĐD. Trưởng", revenue: 18000000, commission: 900000, rank: 6 });
    await storage.createStaffMember({ name: "Lý Minh Tuấn", role: "CV. Tư vấn", revenue: 15000000, commission: 750000, rank: 7 });
    await storage.createStaffMember({ name: "Huỳnh Thị Lan", role: "ĐD. Chăm sóc", revenue: 12000000, commission: 600000, rank: 8 });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
