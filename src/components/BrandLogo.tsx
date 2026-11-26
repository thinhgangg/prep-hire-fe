import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  light?: boolean;
  showWordmark?: boolean;
  className?: string;
};

export function BrandLogo({
  size = "md",
  light = false,
  showWordmark = true,
  className,
}: BrandLogoProps) {
  const iconBox =
    size === "sm"
      ? "h-7 w-7 rounded-[8px]"
      : size === "lg"
        ? "h-9 w-9 rounded-[10px]"
        : "h-8 w-8 rounded-[9px]"; // 32x32px exact spec for sidebar md

  const textSize =
    size === "sm"
      ? "text-[16px]"
      : size === "lg"
        ? "text-[20px]"
        : "text-[18px]"; // 18px exact spec for sidebar md

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 select-none tracking-tight",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center shrink-0",
          iconBox,
          light
            ? "bg-white text-zinc-950"
            : "bg-zinc-950 text-white border border-zinc-800",
        )}
      >
        <svg
          width={size === "sm" ? 16 : size === "lg" ? 20 : 18}
          height={size === "sm" ? 16 : size === "lg" ? 20 : 18}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6.5 4.5H13.25C16.29 4.5 18.5 6.51 18.5 9.25C18.5 11.99 16.29 14 13.25 14H9.75V19.5H6.5V4.5ZM9.75 7.4V11.1H13.05C14.35 11.1 15.2 10.35 15.2 9.25C15.2 8.15 14.35 7.4 13.05 7.4H9.75Z"
            fill="currentColor"
          />
          <circle cx="17.25" cy="17.75" r="2.25" fill="#10b981" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-[-0.02em] leading-none",
            textSize,
            light ? "text-white" : "text-zinc-950",
          )}
        >
          PrepHire{" "}
          <span
            className={cn(
              "font-semibold",
              light ? "text-emerald-400" : "text-emerald-600",
            )}
          >
            AI
          </span>
        </span>
      )}
    </span>
  );
}
