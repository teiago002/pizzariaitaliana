interface OperatingHours {
  day: number;       // 0 (domingo) até 6 (sábado)
  open: string;      // "18:00"
  close: string;     // "23:00"
  enabled: boolean;
}

export function isPizzeriaOpen(
  operatingHours: OperatingHours[] = []
): boolean {
  if (!Array.isArray(operatingHours) || operatingHours.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const today = operatingHours.find(
    (d) => d.day === currentDay && d.enabled
  );

  if (!today) return false;

  const [openH, openM] = today.open.split(':').map(Number);
  const [closeH, closeM] = today.close.split(':').map(Number);

  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime <= closeTime;
}

export function getNextOpeningMessage(
  operatingHours: OperatingHours[] = []
): string {
  if (!operatingHours.length) {
    return 'Confira nossos horários de funcionamento.';
  }

  return 'Estamos fechados no momento. Confira nossos horários de funcionamento.';
}