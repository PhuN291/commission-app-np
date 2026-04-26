import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  size?: number;
  /** Override background color. Default: neutral surface */
  color?: string;
  /** Override text color. Default: ink-sub */
  textColor?: string;
  className?: string;
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  size = 36,
  color,
  textColor,
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full font-semibold",
        !color && "bg-np-surface-pressed",
        !textColor && "text-np-ink-sub",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: color,
        color: textColor,
        fontSize: size * 0.36,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}
