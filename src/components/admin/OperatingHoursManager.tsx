import React, { useState } from 'react';
import { Clock, Plus, Trash2, CalendarOff } from 'lucide-react';
import { useOperatingHours } from '@/hooks/useOperatingHours';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OperatingHoursManager: React.FC = () => {
  const { hours, closures, loading, updateHour, addClosure, removeClosure, dayNames } = useOperatingHours();
  const [closureDate, setClosureDate] = useState<Date>();
  const [closureReason, setClosureReason] = useState('');

  const handleAddClosure = async () => {
    if (!closureDate) return;
    const dateStr = format(closureDate, 'yyyy-MM-dd');
    await addClosure(dateStr, closureReason || undefined);
    setClosureDate(undefined);
    setClosureReason('');
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      {/* Weekly Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Horários por Dia da Semana
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hours.map((hour) => (
            <div key={hour.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-24 font-medium text-sm">{dayNames[hour.dayOfWeek]}</div>
              <Switch
                checked={hour.isOpen}
                onCheckedChange={(checked) => updateHour(hour.id, { isOpen: checked })}
              />
              {hour.isOpen ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={hour.openTime}
                    onChange={(e) => updateHour(hour.id, { openTime: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground text-sm">até</span>
                  <Input
                    type="time"
                    value={hour.closeTime}
                    onChange={(e) => updateHour(hour.id, { closeTime: e.target.value })}
                    className="w-28"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Fechado</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Special Closures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-destructive" />
            Fechamentos Especiais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal mt-1.5", !closureDate && "text-muted-foreground")}>
                    {closureDate ? format(closureDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={closureDate}
                    onSelect={setClosureDate}
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label>Motivo (opcional)</Label>
              <Input
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder="Ex: Feriado"
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleAddClosure} disabled={!closureDate} className="gap-1">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>

          {closures.length > 0 ? (
            <div className="space-y-2">
              {closures.map((closure) => (
                <div key={closure.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <span className="font-medium">{format(new Date(closure.closureDate + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</span>
                    {closure.reason && <span className="text-sm text-muted-foreground ml-2">— {closure.reason}</span>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeClosure(closure.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma data de fechamento especial</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperatingHoursManager;
