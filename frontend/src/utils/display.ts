let displayPreferences = {
  timeZone: "Asia/Kolkata",
  dateFormat: "DD MMM YYYY",
};

export function configureDisplay(preferences?: {
  timeZone?: string;
  dateFormat?: string;
}) {
  displayPreferences = {
    timeZone: preferences?.timeZone ?? "Asia/Kolkata",
    dateFormat: preferences?.dateFormat ?? "DD MMM YYYY",
  };
}

export function dateLabel(value?: string) {
  if (!value) return "Not recorded";

  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);

  if (displayPreferences.dateFormat === "YYYY-MM-DD")
    return date.toLocaleDateString("en-CA", {
      timeZone: displayPreferences.timeZone,
    });

  if (displayPreferences.dateFormat === "MM/DD/YYYY")
    return date.toLocaleDateString("en-US", {
      timeZone: displayPreferences.timeZone,
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  return date.toLocaleDateString("en-GB", {
    timeZone: displayPreferences.timeZone,

    day: "2-digit",

    month: "short",

    year: "numeric",
  });
}

export function timestampLabel(value?: string) {
  return value ? `${dateLabel(value)}, ${timeLabel(value)}` : "Not recorded";
}
export function ageFromDob(dob: string) {
  const now = new Date();

  const [year, month, day] = dob.split("-").map(Number);

  return (
    now.getFullYear() -
    year -
    (now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
      ? 1
      : 0)
  );
}

export function initials(name: string) {
  return name

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0])

    .join("")

    .toUpperCase();
}

export function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

export function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    timeZone: displayPreferences.timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}
