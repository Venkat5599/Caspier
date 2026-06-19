import Background from "./components/Background";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Allocation from "./components/Allocation";
import AgentConsole from "./components/AgentConsole";
import Performance from "./components/Performance";
import InflationCalc from "./components/InflationCalc";
import Partners from "./components/Partners";
import AlphaBeta from "./components/AlphaBeta";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="grain relative min-h-screen bg-void">
      <Background />
      <Nav />
      <main className="relative">
        <Hero />
        <Allocation />
        <AgentConsole />
        <Performance />
        <InflationCalc />
        <Partners />
        <AlphaBeta />
        <Footer />
      </main>
    </div>
  );
}
