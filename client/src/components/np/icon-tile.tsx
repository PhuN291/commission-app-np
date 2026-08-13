import type { LucideIcon } from "@/components/np/icon";

type IconTileProps = {
  icon: LucideIcon;
  size?: number;
  bg?: string;
  color?: string;
  radius?: number;
};

export function IconTile({
  icon: Icon,
  size = 36,
  bg = "var(--color-np-surface-sub)",
  color = "var(--color-np-ink)",
  radius = 10,
}: IconTileProps) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: radius,
      }}
    >
      <Icon size={Math.round(size * 0.62)} strokeWidth={2} color={color} />
    </div>
  );
}
