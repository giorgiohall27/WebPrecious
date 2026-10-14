type DateInput = string | number | Date;

const toDate = (value: DateInput) => value instanceof Date ? value : new Date(value);
const twoDigits = (value: number) => String(value).padStart(2, '0');

export const formatDate = (value: DateInput) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDateTime = (value: DateInput) => {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${formatDate(date)}, ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
};

export const parseDayMonthYear = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) return null;
  return date;
};
