"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchFilterInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={className ?? "relative min-w-0"}
    >
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 bg-card pl-9"
      />
    </form>
  );
}
