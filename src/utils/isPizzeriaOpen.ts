export interface OperatingHours {
  day: number;      // 0 = domingo
  open: string;     // "18:00"
  close: string;   // "23:30"
  enabled: boolean;
}

export function isPizzeriaOpen(
  operatingHours: OperatingHours[] = []
): boolean {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const today = operatingHours.find(d => d.day === currentDay);

  if (!today || !today.enabled) return false;

  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);

  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime <= closeTime;
}

export function getNextOpeningMessage(): string {
  return 'Confira nossos horários de funcionamento.';
}