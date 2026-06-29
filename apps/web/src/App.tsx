import Background from "./components/Background";
import Header from "./components/Header";
import Hero from "./components/Hero";
import SkillGrid from "./components/SkillGrid";
import PublishPanel from "./components/PublishPanel";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="grain relative min-h-screen bg-void">
      <Background />
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <SkillGrid />
          <PublishPanel />
        </main>
        <Footer />
      </div>
    </div>
  );
}
