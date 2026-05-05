
export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    // 0 = Sunday, 6 = Saturday
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      added++;
    }
  }
  return result;
};

export const parseTimeframe = (timeframe: string): { min: number; max: number } => {
  const defaultRange = { min: 7, max: 10 };
  if (!timeframe) return defaultRange;

  const match = timeframe.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = match[2] ? parseInt(match[2], 10) : min;
    return { min, max };
  }
  return defaultRange;
};

export const getDeliveryTargetDate = (orderDate: string | Date, timeframe: string): Date => {
  const date = new Date(orderDate);
  const { max } = parseTimeframe(timeframe);
  return addBusinessDays(date, max);
};

export const getTimeRemaining = (targetDate: Date) => {
  const total = targetDate.getTime() - new Date().getTime();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds };
};
