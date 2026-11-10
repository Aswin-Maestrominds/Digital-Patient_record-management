import { LucideIcon } from "lucide-react";

export function MetricCards({
  items,
}: {
  items: {
    label: string;
    value?: number | string;
    description: string;
    icon?: LucideIcon;
  }[];
}) {
  return (
    <div
      className={`grid sm:grid-cols-2 ${items.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"} gap-4`}
    >
      {items.map((item) => (
        <div className="panel metric-card" key={item.label}>
          <div className="flex justify-between items-center text-[13px] text-slate-500">
            {item.label}
            {item.icon && (
              <item.icon
                size={19}
                className="text-blue-500"
                strokeWidth={1.5}
              />
            )}
          </div>
          <strong>
            {typeof item.value === "number"
              ? item.value.toLocaleString()
              : (item.value ?? "-")}
          </strong>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
}
