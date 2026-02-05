import type { ReactNode } from "react";

interface ActivityItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  time: string;
}

export function ActivityItem({ icon, title, description, time }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
        {icon}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <span className="text-muted-foreground text-xs">{time}</span>
    </div>
  );
}
