import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import BackgroundFX from "@/components/fx/BackgroundFX";
import Home from "@/pages/Home";
import Discover from "@/pages/Discover";
import Radar from "@/pages/Radar";
import ResourceDetail from "@/pages/ResourceDetail";
import Stacks from "@/pages/Stacks";
import SaveMoney from "@/pages/SaveMoney";
import GithubIntel from "@/pages/GithubIntel";
import Deals from "@/pages/Deals";
import Submit from "@/pages/Submit";
import Admin from "@/pages/Admin";

const TITLES: Record<string, string> = {
  "/": "Free Intel — Stop Paying For What You Can Get For Free",
  "/discover": "Discover Free Resources — Free Intel",
  "/radar": "Free Radar — Live Discoveries — Free Intel",
  "/stacks": "Free Stack Builder — Free Intel",
  "/save-money": "Cost Reduction Engine — Free Intel",
  "/github-intel": "GitHub Intelligence — Free Intel",
  "/deals": "Deals & Promotions — Free Intel",
  "/submit": "Submit a Discovery — Free Intel",
  "/admin": "Operations Console — Free Intel"
};

function RouteEffects() {
  const loc = useLocation();
  useEffect(() => {
    document.title = TITLES[loc.pathname] || "Free Intel — Free Resource Intelligence Platform";
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <div className="relative min-h-screen">
        <BackgroundFX />
        <Nav />
        <main className="relative z-10 pt-14">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/radar" element={<Radar />} />
            <Route path="/resource/:slug" element={<ResourceDetail />} />
            <Route path="/stacks" element={<Stacks />} />
            <Route path="/save-money" element={<SaveMoney />} />
            <Route path="/github-intel" element={<GithubIntel />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={
              <div className="max-w-7xl mx-auto px-6 py-32 text-center">
                <div className="font-mono text-6xl font-bold grad-text mb-4">404</div>
                <p className="text-slate-400">Signal lost. This sector contains no intelligence.</p>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
