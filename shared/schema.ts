import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Chuyên viên Tư vấn"),
  department: text("department").notNull().default("Phòng Kinh Doanh"),
  avatar: text("avatar"),
  targetRevenue: integer("target_revenue").notNull().default(50000000),
  currentRevenue: integer("current_revenue").notNull().default(0),
  commissionRate: integer("commission_rate").notNull().default(5),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull().default(0),
  commissionRange: text("commission_range").notNull(),
  requiresDoctor: boolean("requires_doctor").notNull().default(true),
  duration: text("duration").notNull(),
  insurance: text("insurance").notNull().default("Có hỗ trợ"),
  category: text("category"),
  diseaseType: text("disease_type"),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  patientName: text("patient_name").notNull(),
  phone: text("phone").notNull(),
  serviceId: integer("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  time: text("time").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("Đang chờ"),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  serviceName: text("service_name").notNull(),
  patientName: text("patient_name").notNull(),
  date: text("date").notNull(),
  value: integer("value").notNull(),
  commission: integer("commission").notNull(),
  status: text("status").notNull().default("Đang chờ"),
  userId: integer("user_id").notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  patientName: text("patient_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  serviceName: text("service_name").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceCategory: text("service_category"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  commission: integer("commission").notNull().default(0),
  appointmentStatus: text("appointment_status").notNull().default("pending"),
  visitStatus: text("visit_status"),
  notes: text("notes"),
  appointmentDate: text("appointment_date"),
  appointmentTime: text("appointment_time"),
  examType: text("exam_type"),
  vatCompanyName: text("vat_company_name"),
  vatTaxCode: text("vat_tax_code"),
  vatCompanyAddress: text("vat_company_address"),
  vatEmail: text("vat_email"),
  createdAt: text("created_at").notNull(),
  userId: integer("user_id").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const statusLogs = pgTable("status_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  tier: text("tier").notNull(), // "appointment" | "visit"
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  timestamp: text("timestamp").notNull(),
  note: text("note"),
});

export const insertStatusLogSchema = createInsertSchema(statusLogs).omit({ id: true });
export type InsertStatusLog = z.infer<typeof insertStatusLogSchema>;
export type StatusLog = typeof statusLogs.$inferSelect;

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  location: text("location"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  revenue: integer("revenue").notNull().default(0),
  commission: integer("commission").notNull().default(0),
  rank: integer("rank").notNull().default(0),
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({ id: true });
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;
