interface OperatingHours {
  day: number;      // 0 = domingo
  open: string;     // "18:00"
  close: string;   // "23:30"
  enabled: boolean;
}

export function getNextOpeningMessage(hours: OperatingHours[]): string {
  const now = new Date();
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const sorted = [...hours].filter(h => h.enabled);

  // 1️⃣ Ainda abre hoje?
  const todaySchedule = sorted.find(h => h.day === today);
  if (todaySchedule) {
    const [h, m] = todaySchedule.open.split(':').map(Number);
    const openMinutes = h * 60 + m;

    if (currentMinutes < openMinutes) {
      return `Abrimos hoje às ${todaySchedule.open}`;
    }
  }

  // 2️⃣ Próximo dia disponível
  for (let i = 1; i <= 7; i++) {
    const nextDay = (today + i) % 7;
    const next = sorted.find(h => h.day === nextDay);
    if (next) {
      const days = [
        'domingo',
        'segunda',
        'terça',
        'quarta',
        'quinta',
        'sexta',
        'sábado',
      ];
      return `Abrimos ${days[nextDay]} às ${next.open}`;
    }
  }

  return 'Confira nossos horários de funcionamento';
}