import React from 'react';
import { Shield, Zap, LogIn } from 'lucide-react';
import BookingSection from './BookingSection';
import OrderStatusSection from './OrderStatusSection';
import ServicesSection from './ServicesSection';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Card, { CardContent } from './ui/Card';
import LoyaltySection from './loyalty/LoyaltySection';

interface PublicWebsiteProps {
  onNavigateToPanel: () => void;
  onNavigateToSponsors?: () => void;
}

const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  onNavigateToPanel,
}) => {
  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-amber-500 selection:text-black">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/60 border-b border-zinc-800">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center p-2 shadow-lg shadow-amber-500/20">
              <img src="/logomotocadena.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black heading-racing tracking-tighter text-white">MOTOCADENA</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Performance Workshop</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
            <a href="#servicios" className="text-zinc-400 hover:text-amber-500 transition-colors">Servicios</a>
            <a href="#membresias" className="text-zinc-400 hover:text-amber-500 transition-colors">Membresías</a>
            <a href="#lealtad" className="text-zinc-400 hover:text-amber-500 transition-colors">Lealtad</a>
            <a href="#consulta" className="text-zinc-400 hover:text-amber-500 transition-colors">Consulta</a>
            <Button variant="outline" size="sm" onClick={onNavigateToPanel} className="gap-2">
              <LogIn className="w-3.5 h-3.5" />
              ACCESO STAFF
            </Button>
          </nav>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={onNavigateToPanel}>
            <LogIn className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <Badge variant="warning" className="mb-6 px-4 py-1.5 text-[10px] tracking-[0.3em]">MANTENIMIENTO DE ALTA GAMA</Badge>
          <h2 className="text-6xl md:text-8xl font-black heading-racing text-white mb-8 tracking-tighter leading-none">
            TU MOTO EN <br />
            <span className="text-amber-500 text-glow">OTRO NIVEL</span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-medium">
            Taller especializado en reparación y mantenimiento de motocicletas.
            Servicio profesional con tecnología de vanguardia y pasión por la velocidad.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto px-10 h-14 text-sm font-black tracking-widest" onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' })}>
              AGENDAR SERVICIO
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-10 h-14 text-sm font-black tracking-widest" onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })}>
              VER CATÁLOGO
            </Button>
          </div>
        </div>
      </section>

      {/* Partners / Insurance Section */}
      <section className="py-24 bg-zinc-950/80 border-y border-zinc-900 overflow-hidden relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-500" />
                <h3 className="text-2xl font-bold text-white tracking-tight">Aliados en Seguridad</h3>
              </div>
              <h4 className="text-4xl font-black text-white leading-tight">Seguros Pirámide</h4>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Protege tu patrimonio con la mejor cobertura del mercado. Empezamos con RCV para motos y tenemos alcance a todos los tipos de seguros.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" onClick={() => window.open('https://wa.link/77k8xp', '_blank')}>COTIZAR RCV MOTO</Button>
                <Button variant="outline" onClick={() => window.open('https://wa.link/77k8xp', '_blank')}>OTROS SEGUROS</Button>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-amber-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center justify-center bg-zinc-900 border border-zinc-800 p-12 rounded-3xl aspect-video lg:aspect-auto lg:h-[300px]">
                <img src="/piramide.png" alt="Piramide Logo" className="w-48 h-48 object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modular Sections */}
      <ServicesSection />

      <div id="agendar">
        <BookingSection />
      </div>

      <OrderStatusSection />

      <LoyaltySection />

      {/* Memberships Section */}
      <section id="membresias" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black heading-racing text-amber-500 mb-4">MEMBRESÍAS <span className="text-white">MOTOCADENA</span></h2>
            <p className="text-zinc-400">Cuida tu inversión todo el año con nuestros planes de mantenimiento preventivo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Mensual', price: '$20', freq: 'mes', items: ['2 servicios básicos', '10% descuento MO extra', 'Prioridad de atención'] },
              { name: 'Trimestral', price: '$40', freq: 'trimestre', items: ['6 servicios básicos', '15% descuento MO extra', 'Historial digital'] },
              { name: 'Semestral', price: '$80', freq: 'semestre', items: ['12 servicios básicos', '20% descuento MO extra', 'Asesoría técnica'] },
              { name: 'Anual', price: '$120', freq: 'año', items: ['24 servicios básicos', '25% descuento MO extra', 'Sorteos exclusivos'] },
            ].map((plan, i) => (
              <Card key={i} className="hover:border-amber-500/50 transition-all group">
                <CardContent className="p-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black text-white group-hover:text-amber-500 transition-colors">{plan.price}</span>
                    <span className="text-xs text-zinc-500">/{plan.freq}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-zinc-400">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full text-[10px] h-10 tracking-widest font-black" onClick={() => window.open('https://wa.me/584147131270?text=Hola%20Motocadena,%20quiero%20activarme%20como%20miembro', '_blank')}>
                    RESERVAR AHORA
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-zinc-950 border-t border-zinc-900">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logomotocadena.png" alt="Logo" className="w-10 h-10" />
                <h1 className="text-2xl font-black text-white italic">MOTOCADENA</h1>
              </div>
              <p className="text-zinc-500 max-w-xs leading-relaxed text-sm">
                Pasión por las dos ruedas, compromiso absoluto con tu seguridad y el rendimiento de tu moto.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-6">Ubicación</h4>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Parcelamiento El Carmelo, Galpon 1, Entrando por la Bomba de la Cocada <br />
                Zona Industrial Las Flores, Guatire.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white mb-6">Contacto</h4>
              <p className="text-zinc-500 text-sm leading-relaxed">
                WhatsApp: +58 414 713 1270 <br />
                Instagram: @motocadena
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between gap-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">© 2024 MOTOCADENA. TODOS LOS DERECHOS RESERVADOS.</p>
            <div className="flex gap-6">
              <a href="#" className="text-[10px] text-zinc-600 hover:text-white transition-colors uppercase tracking-widest font-bold">Privacidad</a>
              <a href="#" className="text-[10px] text-zinc-600 hover:text-white transition-colors uppercase tracking-widest font-bold">Términos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicWebsite;
