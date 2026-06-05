import { Switch } from "@/components/ui/switch";
import type { VolumeUnit } from "@/lib/volume-units";

export function VolumeUnitToggle({
  volumeUnit,
  onChange,
}: {
  volumeUnit: VolumeUnit;
  onChange: (unit: VolumeUnit) => void;
}) {
  return (
    <div className="flex min-h-11 shrink-0 items-center gap-2 px-1">
      <span
        className={
          volumeUnit === "litre"
            ? "text-sm font-medium"
            : "text-sm text-muted-foreground"
        }
      >
        L
      </span>
      <Switch
        checked={volumeUnit === "ml"}
        onCheckedChange={(checked) => onChange(checked ? "ml" : "litre")}
        aria-label="Toggle between litres and millilitres"
      />
      <span
        className={
          volumeUnit === "ml"
            ? "text-sm font-medium"
            : "text-sm text-muted-foreground"
        }
      >
        mL
      </span>
    </div>
  );
}
