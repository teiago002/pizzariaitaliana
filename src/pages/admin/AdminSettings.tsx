import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Store, Palette, MapPin, Phone, Upload, CreditCard, Loader2, Clock } from 'lucide-react';
import OperatingHoursManager from '@/components/admin/OperatingHoursManager';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const AdminSettings: React.FC = () => {
  const { settings, loading, updateSettings, uploadLogo } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadLogo(file);
    if (url) {
      setFormData(prev => ({ ...prev, logo: url }));
    }
    setIsUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Configure as informações da pizzaria</p>
      </div>

      <div className="grid gap-6">
        {/* Store Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Informações da Loja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Pizzaria</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-4 mt-1.5">
                {formData.logo && (
                  <img src={formData.logo} alt="Logo" className="w-16 h-16 object-contain rounded" />
                )}
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{isUploading ? 'Enviando...' : 'Upload Logo'}</span>
                  </div>
                  <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </Label>
              </div>
            </div>

        {/* PIX Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-secondary" />
              Configurações do PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pixKey">Chave PIX (CPF/CNPJ/Email/Telefone)</Label>
              <Input
                id="pixKey"
                value={formData.pixKey || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                placeholder="Sua chave PIX"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="pixName">Nome do Recebedor</Label>
              <Input
                id="pixName"
                value={formData.pixName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pixName: e.target.value }))}
                placeholder="Nome que aparece no PIX"
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-secondary" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="(00) 00000-0000"
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Cores do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cor Principal</Label>
                <div className="flex gap-2 mt-1.5">
                  <input type="color" value={formData.primaryColor} onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))} className="w-12 h-10 rounded cursor-pointer" />
                  <Input value={formData.primaryColor} onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor Secundária</Label>
                <div className="flex gap-2 mt-1.5">
                  <input type="color" value={formData.secondaryColor} onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))} className="w-12 h-10 rounded cursor-pointer" />
                  <Input value={formData.secondaryColor} onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor de Destaque</Label>
                <div className="flex gap-2 mt-1.5">
                  <input type="color" value={formData.accentColor} onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))} className="w-12 h-10 rounded cursor-pointer" />
                  <Input value={formData.accentColor} onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <OperatingHoursManager />

        <Button size="lg" onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;