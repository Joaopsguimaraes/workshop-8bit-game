import { cn } from "@/lib/utils";

type Props = {
  initials: string;
  size?: "small" | "medium" | "large";
  className?: string;
};

const SIZES = {
  small: "size-10 text-[10px]",
  medium: "size-16 text-base",
  large: "size-28 text-2xl",
};

// Pixel avatar: the initials in a box with an 8-bit border.
export function Avatar({ initials, size = "small", className }: Props) {
  return (
    <div
      aria-label={`Avatar ${initials || "vazio"}`}
      className={cn(
        "font-pixel flex shrink-0 items-center justify-center bg-card text-primary",
        "border-foreground border-4 [box-shadow:4px_4px_0_0_#000]",
        SIZES[size],
        className,
      )}
    >
      {initials || "??"}
    </div>
  );
}
