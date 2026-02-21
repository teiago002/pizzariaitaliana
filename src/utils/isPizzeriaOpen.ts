export function isPizzeriaOpen(operatingHours: any[]) {
  const now = new Date();
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayConfig = operatingHours.find(
    (d) => d.day === today && d.isOpen
  );

  if (!dayConfig) return false;

  const openMinutes =
    dayConfig.openHour * 60 + dayConfig.openMinute;
  const closeMinutes =
    dayConfig.closeHour * 60 + dayConfig.closeMinute;

  return (
    currentMinutes >= openMinutes &&
    currentMinutes <= closeMinutes
  );
}