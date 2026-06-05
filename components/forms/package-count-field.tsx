import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PackageCountField({
  id = "packageCount",
  name = "packageCount",
  label = "Packages",
  description = "Number of boxes, pouches, or sachets",
  value,
  onChange,
  required = true,
}: {
  id?: string;
  name?: string;
  label?: string;
  description?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <Input
        id={id}
        name={name}
        type="number"
        step="1"
        min="1"
        required={required}
        className="min-h-11"
        placeholder="12"
        {...(value !== undefined ? { value } : {})}
        {...(onChange ? { onChange: (e) => onChange(e.target.value) } : {})}
      />
    </div>
  );
}
