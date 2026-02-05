interface QuickStatProps {
  label: string;
  value: number;
  subtext: string;
}

export function QuickStat({ label, value, subtext }: QuickStatProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-muted-foreground text-xs">{subtext}</p>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
