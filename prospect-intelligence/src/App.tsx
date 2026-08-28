import { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import BackgroundFX from "@/components/fx/BackgroundFX";
import FindThem from "@/pages/FindThem";
import IntelligenceDeck from "@/pages/IntelligenceDeck";
import ActionCenter from "@/pages/ActionCenter";
import Home from "@/pages/Home";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="font-mono text-4xl font-bold text-red-neon mb-4">ERROR</div>
          <p className="text-slate-400 text-sm mb-4">Something went wrong.</p>
          <pre className="text-xs text-slate-600 bg-slate-900 p-4 rounded text-left overflow-auto max-h-48">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="btn-neon mt-6"
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedRoutes() {
  const loc = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={loc} key={loc.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/find" element={<FindThem />} />
        <Route path="/deck" element={<IntelligenceDeck />} />
        <Route path="/action" element={<ActionCenter />} />
        <Route
          path="*"
          element={
            <div className="max-w-7xl mx-auto px-6 py-32 text-center">
              <div className="font-mono text-6xl font-bold grad-text mb-4">404</div>
              <p className="text-slate-400">Signal lost. This sector contains no intelligence.</p>
            </div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <BackgroundFX />
        <Nav />
        <main className="relative z-10 pt-14">
          <ErrorBoundary>
            <AnimatedRoutes />
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
