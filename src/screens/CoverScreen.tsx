import { 
  LayoutDashboard, 
  LineChart, 
  Users, 
  GraduationCap, 
  BarChart3, 
  Wallet, 
  FileText, 
  FolderOpen,
  ArrowRight,
  Bot
} from 'lucide-react';
import { useEffect, useRef } from 'react';

const MODULES = [
  { id: 'dashboard', icon: LayoutDashboard, title: 'Tablero', desc: 'Resumen financiero general e indicadores clave.' },
  { id: 'historical', icon: LineChart, title: 'Histórico', desc: 'Evolución de ingresos y gastos en periodos anteriores.' },
  { id: 'nomina', icon: Users, title: 'Nómina', desc: 'Análisis de personal, salarios y prestaciones.' },
  { id: 'posgrados', icon: GraduationCap, title: 'Posgrados', desc: 'Matrículas, flexibilización y programas.' },
  { id: 'predictive', icon: BarChart3, title: 'Proyección', desc: 'Modelos predictivos y tendencias futuras.' },
  { id: 'budget', icon: Wallet, title: 'Alertas', desc: 'Control de ejecución presupuestal y anomalías.' },
  { id: 'reports', icon: FileText, title: 'Reportes', desc: 'Informes detallados listos para exportar.' },
  { id: 'repository', icon: FolderOpen, title: 'Repositorio', desc: 'Archivos y documentos financieros.' },
  { id: 'assistant', icon: Bot, title: 'Asistente IA', desc: 'Asistente virtual RAG para consultas del proyecto.' },
];

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: Particle[] = [];
    let animationFrameId: number;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    let mouse = { x: -1000, y: -1000, radius: 150 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    window.addEventListener('resize', () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      init();
    });

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        if (this.x > w || this.x < 0) this.directionX = -this.directionX;
        if (this.y > h || this.y < 0) this.directionY = -this.directionY;

        // Interaction
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius + this.size) {
           if (mouse.x < this.x && this.x < w - this.size * 10) this.x += 10;
           if (mouse.x > this.x && this.x > this.size * 10) this.x -= 10;
           if (mouse.y < this.y && this.y < h - this.size * 10) this.y += 10;
           if (mouse.y > this.y && this.y > this.size * 10) this.y -= 10;
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particlesArray = [];
      let numberOfParticles = (h * w) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 3) + 1;
        let x = (Math.random() * ((w - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((h - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * 2) - 1;
        let directionY = (Math.random() * 2) - 1;
        let color = '#ffcc29';
        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
      }
    }

    function connect() {
      if (!ctx) return;
      let opacityValue = 1;
      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + 
                         ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
          if (distance < (w / 7) * (h / 7)) {
            opacityValue = 1 - (distance / 20000);
            ctx.strokeStyle = `rgba(255, 204, 41, ${opacityValue * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      if (!ctx) return;
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
      }
      connect();
    }

    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-auto z-0" 
      style={{ background: 'linear-gradient(to bottom, #0a0f1c, #1a2a4c)' }}
    />
  );
}

export function CoverScreen({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="min-h-screen bg-[#0a0f1c] bg-cover bg-center flex flex-col relative overflow-hidden" 
         >
      
      <ParticleBackground />

      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-container/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] rounded-full bg-primary-container/5 blur-[100px] pointer-events-none"></div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col z-10 pointer-events-none">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-6 mt-8 mb-20 animate-fade-in-up">
          <img 
             src="https://raw.githubusercontent.com/fabiancho0724/VAFI-Reporte-Financiero/7601e17bbde30e0381cc947ff62d9345b0ec3853/uptc-blanco%20(1).png" 
             alt="UPTC Logo" 
             className="w-40 object-contain opacity-90 drop-shadow-2xl pointer-events-auto"
          />
          <div className="pointer-events-auto">
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-white mb-4 drop-shadow-lg">
              Consolidado y Proyección <span className="text-primary-container">Financiera</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-3xl mx-auto font-light leading-relaxed drop-shadow-lg text-white/90">
              Plataforma integral para el análisis, seguimiento predictivo y visualización 
              de datos presupuestales de la Universidad Pedagógica y Tecnológica de Colombia.
            </p>
          </div>
          
          <button 
            onClick={() => onNavigate('dashboard')}
            className="pointer-events-auto mt-6 px-10 py-4 bg-primary-container text-on-primary-container rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 hover:bg-[#e6b825] hover:shadow-[0_0_30px_rgba(255,204,41,0.4)] transition-all duration-300"
          >
            Ingresar al Tablero
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up animation-delay-300 pointer-events-auto">
           {MODULES.map((mod, idx) => (
             <div 
               key={mod.id} 
               onClick={() => onNavigate(mod.id)}
               className="group relative backdrop-blur-sm bg-white/5 border border-white/10 p-6 rounded-[24px] cursor-pointer overflow-hidden transition-all duration-300 hover:bg-white/10 hover:border-primary-container/50 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
             >
                <div className="absolute top-0 left-0 w-1 p-0 h-0 bg-primary-container transition-all duration-300 group-hover:h-full"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary-container/10 rounded-2xl text-primary-container group-hover:scale-110 group-hover:bg-primary-container group-hover:text-black transition-all">
                    <mod.icon size={24} />
                  </div>
                  <ArrowRight size={20} className="text-white/20 group-hover:text-primary-container -translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{mod.title}</h3>
                <p className="text-sm text-on-surface-variant font-light group-hover:text-white/90 transition-colors">
                  {mod.desc}
                </p>
             </div>
           ))}
        </div>

        <footer className="mt-20 text-center text-[#94a3b8] font-mono text-sm py-4 border-t border-white/10 w-full pointer-events-auto drop-shadow-md">
            ©Fabián L. Cely – VAFI – Universidad Pedagógica y Tecnológica de Colombia
        </footer>
      </div>

    </div>
  );
}
