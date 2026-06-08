import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/android-chrome-512x512.png";

type AppLogoProps = {
  variant?: "sidebar" | "login" | "inline";
  href?: string;
  onClick?: () => void;
  className?: string;
};

const logoSizes = {
  sidebar: 44,
  login: 72,
  inline: 32,
} as const;

export function AppLogo({
  variant = "sidebar",
  href,
  onClick,
  className,
}: AppLogoProps) {
  const isSidebar = variant === "sidebar";
  const isLogin = variant === "login";
  const size = logoSizes[variant];

  const content = (
    <div
      className={cn(
        "flex items-center gap-3",
        isSidebar &&
          "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
        isLogin && "flex-col gap-2 text-center",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0",
          isSidebar && "size-11",
          isLogin && "size-[72px]",
          variant === "inline" && "size-8"
        )}
      >
        <Image
          src={LOGO_SRC}
          alt="OIS logo"
          width={size}
          height={size}
          className="size-full object-contain"
          priority={variant !== "inline"}
        />
      </div>
      <div
        className={cn(
          "grid leading-tight",
          isSidebar && "flex-1 group-data-[collapsible=icon]:hidden",
          isLogin && "gap-0.5"
        )}
      >
        <span
          className={cn(
            "font-bold tracking-tight",
            isSidebar && "text-base text-sidebar-foreground",
            isLogin && "text-2xl text-foreground",
            variant === "inline" && "text-sm text-foreground"
          )}
        >
          OIS
        </span>
        <span
          className={cn(
            isSidebar && "text-xs text-sidebar-foreground/60",
            isLogin && "text-sm text-muted-foreground",
            variant === "inline" && "text-[0.65rem] text-muted-foreground"
          )}
        >
          Inventory Management
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
