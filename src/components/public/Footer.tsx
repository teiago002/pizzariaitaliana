import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Instagram, Facebook } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';

export const Footer: React.FC = () => {
  const { settings } = useStore();

  return (
    <footer className="bg-foreground text-background py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-lg">
                🍕
              </div>
              <h3 className="font-display text-xl font-bold">{settings.name}</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Sabor autêntico italiano desde 2020. Ingredientes frescos e receitas tradicionais.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4">Contato</h4>
            <div className="space-y-3 text-sm">
              <a 
                href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-background transition-colors"
              >
                <Phone className="w-4 h-4 text-secondary" />
                {settings.whatsapp}
              </a>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>{settings.address}</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4">Links</h4>
            <div className="space-y-2 text-sm">
              <Link to="/cardapio" className="block text-muted-foreground hover:text-background transition-colors">
                Cardápio
              </Link>
              <Link to="/carrinho" className="block text-muted-foreground hover:text-background transition-colors">
                Meu Carrinho
              </Link>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="text-muted-foreground hover:text-background transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-background transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-8 pt-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
