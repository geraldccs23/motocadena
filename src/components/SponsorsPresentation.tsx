import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Users, TrendingUp, Star } from "lucide-react";

export default function SponsorsPresentation() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollXProgress } = useScroll({ container: containerRef });

  // Parallax transforms basados en scroll horizontal
  const heroBgX = useTransform(scrollXProgress, [0, 1], [0, -100]);
  const problemBgX = useTransform(scrollXProgress, [0, 1], [50, -150]);
  const solutionBgX = useTransform(scrollXProgress, [0, 1], [100, -200]);
  const growthBgX = useTransform(scrollXProgress, [0, 1], [150, -250]);
  const sponsorBgX = useTransform(scrollXProgress, [0, 1], [200, -300]);

  const bgMoto = {
    backgroundImage: 'url("/moto-bg.jpg")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as const;

  const heroBg = {
    backgroundImage: 'url("/banner1.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as const;

  const problemBannerBg = {
    backgroundImage: 'url("/banner2.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as const;

  const solutionBannerBg = {
    backgroundImage: 'url("/banner3.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as const;

  const growthBannerBg = {
    backgroundImage: 'url("/banner4.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as const;

  const sponsorBannerBg = {
    backgroundImage: 'url("/banner5.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  } as const;

  const scrollToSlide = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * window.innerWidth, behavior: "smooth" });
  };

  // Traduce scroll vertical de la rueda del mouse a scroll horizontal
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Si el desplazamiento vertical es mayor, lo usamos para mover horizontalmente
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: "smooth" });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="h-screen w-screen bg-neutral-950 text-white overflow-hidden">
      {/* Contenedor scrollable de ancho de viewport */}
      <div
        ref={containerRef}
        className="h-screen w-screen overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth"
        style={{ touchAction: "pan-x" }}
      >
        {/* Pista interna más ancha que el contenedor para habilitar el scroll */}
        <div className="w-[500vw] h-full flex">
        {/* SLIDE 1 — HERO */}
        <section className="snap-start flex-shrink-0 w-screen h-screen relative flex items-center justify-center overflow-hidden">
          <motion.div className="absolute inset-0" style={{ x: heroBgX }}>
            <div className="w-full h-full" style={heroBg} />
          </motion.div>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-amber-500/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-amber-500/10 blur-3xl rounded-full" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 text-center max-w-4xl"
          >
            <img src="/logomotocadena.png" alt="Motocadena" className="mx-auto w-40 h-40 drop-shadow-xl" />
            <h1 className="mt-6 text-5xl md:text-6xl font-black heading-racing text-amber-500 text-glow">
              MOTOCADENA
            </h1>
            <p className="mt-2 text-xl md:text-2xl text-white/90">
              El primer servicio de mantenimiento preventivo para motocicletas en Venezuela.
            </p>
            <p className="mt-4 text-lg md:text-xl text-white/80">
              No esperamos a que te accidentes. Cuidamos tu moto antes de que algo falle.
            </p>
            <div className="mt-8">
              <button onClick={() => scrollToSlide(1)} className="btn-gold text-lg">
                Conocer más
              </button>
            </div>
          </motion.div>
        </section>

        {/* SLIDE 2 — EL PROBLEMA */}
        <section className="snap-start flex-shrink-0 w-screen h-screen relative flex items-center justify-center overflow-hidden">
          <motion.div className="absolute inset-0" style={{ x: problemBgX }}>
            <div className="w-full h-full" style={problemBannerBg} />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/60" />

          <motion.div
            initial={{ opacity: 0, x: -80, rotate: -2 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 max-w-4xl text-center p-8"
          >
            <h2 className="text-4xl md:text-5xl font-black heading-racing text-neutral-100 mb-4 text-glow">
              Todos los beneficios aparecen después del accidente.
            </h2>
            <p className="text-white/80 text-xl">
              Los motorizados enfrentan altos costos, esperas y riesgos porque nadie se anticipa al problema.
            </p>
          </motion.div>
        </section>

        {/* SLIDE 3 — LA SOLUCIÓN */}
        <section className="snap-start flex-shrink-0 w-screen h-screen relative flex items-center justify-center overflow-hidden">
          <motion.div className="absolute inset-0" style={{ x: solutionBgX }}>
            <div className="w-full h-full" style={solutionBannerBg} />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-black/60 to-black/60" />

          <motion.div
            initial={{ opacity: 0, x: 80, scale: 0.96 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10 max-w-4xl text-center p-8"
          >
            <h2 className="text-4xl md:text-5xl font-black heading-racing text-amber-500 mb-4 text-glow">
              Motocadena revoluciona el mantenimiento preventivo.
            </h2>
            <p className="text-white/85 text-xl">
              Cuidamos tu moto como si fuera nuestra, con planes adaptados, mecánicos expertos y un modelo de membresías único en Venezuela.
            </p>
          </motion.div>
        </section>

        {/* SLIDE 4 — IMPACTO Y CRECIMIENTO */}
        <section className="snap-start flex-shrink-0 w-screen h-screen relative flex items-center justify-center overflow-hidden">
          {/* Fondo ocupa todo el contenedor */}
          <motion.div className="absolute inset-0" style={{ x: growthBgX }}>
            <div className="w-full h-full" style={growthBannerBg} />
          </motion.div>
          {/* Overlay para mejorar contraste y legibilidad */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
          </div>

          <motion.div
            onViewportEnter={() => { /* inicia counters visuals vía CSS y presencia */ }}
            className="relative z-[2] container mx-auto max-w-6xl"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="card-metal p-10 text-center hover:scale-105 transition-transform bg-black/40 backdrop-blur-sm ring-1 ring-white/10 shadow-lg"
              >
                <Users className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                <AnimatedCounter to={100} suffix="" className="text-4xl font-bold" />
                <p className="text-white/70 mt-1">miembros activos</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="card-metal p-10 text-center hover:scale-105 transition-transform bg-black/40 backdrop-blur-sm ring-1 ring-white/10 shadow-lg"
              >
                <TrendingUp className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                <AnimatedCounter to={30} suffix="" className="text-4xl font-bold" />
                <p className="text-white/70 mt-1">servicios diarios promedio</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="card-metal p-10 text-center hover:scale-105 transition-transform bg-black/40 backdrop-blur-sm ring-1 ring-white/10 shadow-lg"
              >
                <Star className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                <AnimatedCounter to={2} suffix="" className="text-4xl font-bold" />
                <p className="text-white/70 mt-1">expansión: Caracas y Guarenas</p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* SLIDE 5 — OPORTUNIDAD DE PATROCINIO */}
        <section className="snap-start flex-shrink-0 w-screen h-screen relative flex items-center justify-center overflow-hidden">
          {/* Fondo ocupa todo el contenedor */}
          <motion.div className="absolute inset-0" style={{ x: sponsorBgX }}>
            <div className="w-full h-full" style={sponsorBannerBg} />
          </motion.div>
          {/* Overlay para contraste y legibilidad del texto */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-transparent to-amber-500/15" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7 }}
            className="relative z-[2] text-center max-w-4xl p-8"
          >
            <h3 className="text-4xl md:text-5xl font-black heading-racing text-amber-500 text-glow mb-4">
              Tu marca puede formar parte de la nueva era motera.
            </h3>
            <p className="text-white/85 text-xl">
              Colabora con Motocadena y obtén visibilidad en nuestro taller, uniformes, web y comunidad digital.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <a
                href="https://wa.me/584147131270?text=Estoy%20interesado%20en%20patrocinar%20Motocadena"
                target="_blank"
                rel="noreferrer"
                className="btn-gold text-lg"
              >
                Quiero ser patrocinante
              </a>
              <a href="#" className="btn-metal text-lg" title="Próximamente">
                Ver dossier PDF
              </a>
            </div>

            <img src="/logomotocadena.png" alt="Motocadena" className="mx-auto mt-10 w-28 h-28 opacity-90" />
          </motion.div>
        </section>
        </div>
      </div>
    </div>
  );
}

function AnimatedCounter({ to, className, suffix = "" }: { to: number; className?: string; suffix?: string }) {
  // Simple counter using CSS animation via steps simulated with JS
  // Keeps it lightweight and deterministic for the presentation
  const steps = 30;
  const duration = 800; // ms
  const increment = Math.max(1, Math.floor(to / steps));
  const startTime = Date.now();
  const now = Date.now();
  const elapsed = Math.min(duration, now - startTime);
  const progress = Math.round((elapsed / duration) * steps);
  const value = Math.min(to, progress * increment);
  // Note: This basic counter will render increasing numbers on re-renders.
  // For a more interactive counter tie it to onViewportEnter/setInterval.
  return <span className={className}>{value}{suffix && ` ${suffix}`}</span>;
}