export function dateLabel(value?: string) {
  if (!value) return 'Not recorded';
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
export function timestampLabel(value?: string) {
  return value
    ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    : 'Not recorded';
}
export function ageFromDob(dob: string) {
  const now = new Date();
  const [year, month, day] = dob.split('-').map(Number);
  return (
    now.getFullYear() -
    year -
    (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0)
  );
}
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
export function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}
