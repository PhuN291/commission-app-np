import { useState } from "react";
import { Calendar, Check, Phone, Stethoscope } from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  Chev,
  Chips,
  IconTile,
  NPButton,
  NPProgress,
  OrderStatusBadges,
  PageHeader,
  Row,
  Screen,
  SearchField,
  SectionTitle,
} from "@/components/np";

export default function NpPlayground() {
  const [chip, setChip] = useState("all");
  const [search, setSearch] = useState("");

  return (
    <Screen activeTab="dashboard" notifCount={3}>
      <PageHeader title="NP Playground" subtitle="Verify tokens + primitives" />

      <SectionTitle>Buttons</SectionTitle>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <NPButton tone="primary">Primary</NPButton>
          <NPButton tone="primary">Dark</NPButton>
          <NPButton tone="ghost">Ghost</NPButton>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <NPButton size="sm">Small</NPButton>
          <NPButton size="md">Medium</NPButton>
          <NPButton size="lg">Large</NPButton>
          <NPButton icon={Check}>With icon</NPButton>
        </div>
      </Card>

      <SectionTitle>Badges</SectionTitle>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="attention">Attention</Badge>
          <Badge tone="critical">Critical</Badge>
        </div>
        <div className="mt-3">
          <OrderStatusBadges appointmentStatus="pending" visitStatus="in_progress" />
        </div>
        <div className="mt-2">
          <OrderStatusBadges appointmentStatus="confirmed" visitStatus="completed" />
        </div>
        <div className="mt-2">
          <OrderStatusBadges appointmentStatus="no_show" />
        </div>
        <div className="mt-2">
          <OrderStatusBadges appointmentStatus="rescheduled" visitStatus="arrived" />
        </div>
      </Card>

      <SectionTitle>Chips</SectionTitle>
      <Chips
        items={[
          { key: "all", label: "Tất cả", count: 24 },
          { key: "pending", label: "Chờ", count: 5 },
          { key: "done", label: "Xong", count: 19 },
          { key: "cancel", label: "Hủy", count: 2 },
        ]}
        active={chip}
        onChange={setChip}
      />

      <SectionTitle>Search</SectionTitle>
      <SearchField value={search} onChange={setSearch} placeholder="Tìm đơn hàng..." />

      <SectionTitle>Rows</SectionTitle>
      <Card className="overflow-hidden p-0">
        <Row
          leading={<Avatar name="Nguyễn Thị Mai" />}
          title="Nguyễn Thị Mai"
          subtitle="Chuyên viên · Hồ Chí Minh"
          trailing={<Chev />}
          onClick={() => {}}
        />
        <Row
          leading={<IconTile icon={Stethoscope} />}
          title="Nội soi tiêu hóa"
          subtitle="DV-002 · 2.500.000₫"
          trailing={<Chev />}
          onClick={() => {}}
        />
        <Row
          leading={<IconTile icon={Phone} />}
          title="Gọi bệnh nhân"
          subtitle="0901234567"
          meta={
            <div className="mt-1">
              <Badge tone="attention">Chờ xác nhận</Badge>
            </div>
          }
          last
        />
      </Card>

      <SectionTitle>Progress</SectionTitle>
      <div className="mx-4 space-y-3">
        <NPProgress value={25} />
        <NPProgress value={70} />
        <NPProgress value={100} />
      </div>

      <SectionTitle>Icon tiles</SectionTitle>
      <Card className="p-4">
        <div className="flex gap-3">
          <IconTile icon={Calendar} />
          <IconTile icon={Phone} />
          <IconTile icon={Check} />
          <IconTile icon={Stethoscope} />
        </div>
      </Card>

      <SectionTitle>Typography</SectionTitle>
      <Card className="p-4">
        <div className="space-y-2">
          <div className="text-np-display">Display 32</div>
          <div className="text-np-title">Title 20</div>
          <div className="text-np-heading">Heading 17</div>
          <div className="text-np-subheading uppercase text-np-text-sub">Subheading 13</div>
          <div className="text-np-body">Body 15 — quick brown fox</div>
          <div className="text-np-body-bold">BodyBold 15</div>
          <div className="text-np-sub text-np-text-muted">Sub 13 muted</div>
          <div className="text-np-caption text-np-text-muted">Caption 12</div>
        </div>
      </Card>

      <div className="h-6" />
    </Screen>
  );
}
