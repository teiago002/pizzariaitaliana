export function isPizzeriaOpen(operatingHours: any[] = []): boolean {
  if (!Array.isArray(operatingHours) || operatingHours.length === 0) {
    return false;
  }

  const now = new Date();
  
  // Pega o dia da semana local (0-6)
  const currentDay = now.getDay();
  
  // Pega a hora e minuto local formatados com 2 dígitos (ex: "15:59")
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  const today = operatingHours.find(h => {
    const day = h.dayOfWeek !== undefined ? h.dayOfWeek : h.day;
    const active = h.isOpen !== undefined ? h.isOpen : h.enabled;
    return day === currentDay && active === true;
  });

  if (!today) return false;

  const open = today.openTime || today.open;
  const close = today.closeTime || today.close;

  if (!open || !close) return false;

  // Log para você debug no console do navegador, deixei para testar depois se ainda tiver problema
  // console.log(`Agora: ${currentTime} | Abre: ${open} | Fecha: ${close}`);
  return currentTime >= open && currentTime <= close;
}

export function getNextOpeningMessage() {
  return 'Estamos fechados no momento. Confira nossos horários de funcionamento.';
}