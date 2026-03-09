import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  step?: number;
  min?: number;
  disabled?: boolean;
  error?: string;
}

export function NumberInput({ id, value, onChange, placeholder, step = 1, min = 0, disabled, error }: Props) {
  const decrement = () => onChange(String(Math.max(min, (Number(value) || 0) - step)));
  const increment = () => onChange(String((Number(value) || 0) + step));

  return (
    <div className={cn(
      "flex overflow-hidden rounded-lg border",
      error ? "border-destructive" : disabled ? "border-muted" : "border-border",
      disabled && "opacity-35"
    )}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={decrement}
        className="h-auto w-9 shrink-0 rounded-none border-none bg-secondary text-lg text-muted-foreground hover:bg-secondary/80"
        aria-label="Уменьшить значение"
      >
        −
      </Button>
      <Input
        id={id}
        type="number"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 rounded-none border-none bg-background text-center text-sm text-foreground shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={increment}
        className="h-auto w-9 shrink-0 rounded-none border-none bg-secondary text-lg text-muted-foreground hover:bg-secondary/80"
        aria-label="Увеличить значение"
      >
        +
      </Button>
    </div>
  );
}
