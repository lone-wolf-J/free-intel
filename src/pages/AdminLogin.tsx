import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      navigate("/admin");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-xl p-8 border border-slate-700/50">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-white mb-1 tracking-wide">ADMIN ACCESS</h1>
          <p className="text-xs text-center text-slate-500 mb-6 font-mono">Authenticate to manage operations</p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded text-cyan-400 text-sm font-mono tracking-wider transition-colors disabled:opacity-40"
            >
              {loading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4 font-mono">Session expires in 24 hours</p>
      </div>
    </div>
  );
}
