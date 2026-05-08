import { motion } from 'framer-motion';
import { FileSearch, Sparkles, Zap, ShieldCheck, ArrowRight, LayoutDashboard, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '/logo.svg';

interface LandingPageProps {
  onGetStarted: () => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Nexus AI" className="w-8 h-8" />
            <span className="font-semibold text-lg tracking-tight">Nexus AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onGetStarted} className="hidden sm:inline-flex">Entrar</Button>
            <Button onClick={onGetStarted} className="shadow-lg shadow-primary/20 transition-all hover:scale-105">
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
              <Sparkles className="w-4 h-4" />
              <span>A revolução na análise de editais</span>
            </motion.div>
            
            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
              Transforme editais complexos em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">insights acionáveis</span>
            </motion.h1>
            
            <motion.p variants={fadeIn} className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              O Nexus AI automatiza a extração e a análise de critérios de editais de fomento, combinando inteligência artificial avançada com a expertise de profissionais do mercado.
            </motion.p>
            
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={onGetStarted} className="w-full sm:w-auto h-14 px-8 text-base shadow-xl shadow-primary/25 transition-all hover:scale-105">
                Acessar Plataforma <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base bg-background/50 backdrop-blur-sm hover:bg-secondary/50">
                Ver Funcionamento
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Inteligência que acelera negócios</h2>
            <p className="text-lg text-muted-foreground">Abandone a leitura exaustiva. Deixe nossa IA mapear os requisitos e preparar sua equipe para propostas vencedoras.</p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: FileSearch,
                title: "Extração Automática",
                description: "Faça upload do seu PDF e nossa IA identifica instantaneamente critérios de elegibilidade, prazos e obrigações."
              },
              {
                icon: BrainCircuit,
                title: "Análise por Personas",
                description: "Avalie o edital sob a ótica de um Auditor, um Consultor de Inovação ou um Especialista Orçamentário."
              },
              {
                icon: ShieldCheck,
                title: "Decisões Seguras",
                description: "Reduza o risco de desclassificação garantindo que todos os requisitos técnicos e jurídicos sejam mapeados."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={fadeIn}
                className="group p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-primary/10"></div>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 border border-primary/20">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center"
          >
            <div className="p-10 md:p-16 md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Workflow simplificado para times de alta performance</h2>
              <ul className="space-y-6">
                {[
                  "Gerencie múltiplos editais em um único painel.",
                  "Exporte relatórios estruturados em PDF.",
                  "Trabalhe colaborativamente com tags dinâmicas."
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-1 bg-primary/20 p-1 rounded-full text-primary">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-lg text-muted-foreground">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:w-1/2 bg-secondary/50 p-8 w-full h-full min-h-[400px] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50"></div>
              {/* Abstract Representation of UI */}
              <div className="relative w-full max-w-sm space-y-4">
                <div className="w-full h-12 bg-background rounded-lg border border-border shadow-sm flex items-center px-4">
                  <div className="w-4 h-4 rounded-full bg-primary/40 mr-3"></div>
                  <div className="h-2 w-32 bg-muted rounded"></div>
                </div>
                <div className="w-full h-32 bg-background rounded-lg border border-border shadow-sm p-4 space-y-3">
                   <div className="h-3 w-1/2 bg-muted rounded"></div>
                   <div className="h-2 w-full bg-muted/50 rounded"></div>
                   <div className="h-2 w-full bg-muted/50 rounded"></div>
                   <div className="h-2 w-3/4 bg-muted/50 rounded"></div>
                </div>
                <div className="w-4/5 h-24 bg-background rounded-lg border border-border shadow-sm p-4 space-y-3 opacity-80">
                   <div className="h-3 w-1/3 bg-muted rounded"></div>
                   <div className="h-2 w-full bg-muted/50 rounded"></div>
                   <div className="h-2 w-2/3 bg-muted/50 rounded"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-primary"></div>
        <div className="absolute inset-0 -z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-6 text-center text-primary-foreground">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Pronto para elevar o nível das suas análises?</h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Junte-se às equipes que já otimizaram horas de trabalho na desconstrução de editais complexos.
            </p>
            <Button size="lg" variant="secondary" onClick={onGetStarted} className="h-14 px-10 text-lg font-semibold shadow-2xl transition-all hover:scale-105 text-primary">
              Criar Conta Gratuitamente
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Nexus AI" className="w-6 h-6 grayscale opacity-50" />
            <span className="font-medium">Nexus AI © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}