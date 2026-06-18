import React, { useState, useEffect } from "react";
import {
  Key,
  Terminal,
  LayoutDashboard,
  CreditCard,
  Lock,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Database,
  Cpu,
  Coins,
  LogOut,
  AlertCircle,
  Sparkles,
  Activity,
  ArrowRight,
  User as UserIcon,
  Eye,
  EyeOff,
  Copy,
  Check
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { User, ApiKey, ApiLog, Payment, DashboardStats } from "./types";

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("ai_platform_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App global navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "keys" | "playground" | "billing">("dashboard");

  // Platform State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [keysList, setKeysList] = useState<ApiKey[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // New Key input form
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Playground controller state
  const [selectedKey, setSelectedKey] = useState("");
  const [playgroundModel, setPlaygroundModel] = useState("gemini-3.5-flash");
  const [playgroundPrompt, setPlaygroundPrompt] = useState(
    "Explique-moi l'importance des cles d'API securisees en une phrase."
  );
  const [playgroundTemp, setPlaygroundTemp] = useState(0.7);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<any>(null);
  const [playgroundError, setPlaygroundError] = useState("");

  // Billing checkout form state
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingSuccess, setBillingSuccess] = useState("");

  // Demo status controls
  const [apiKeyVisible, setApiKeyVisible] = useState<{ [key: string]: boolean }>({});

  // Trigger content loading when authenticated
  useEffect(() => {
    if (currentUser) {
      loadDashboardStats();
      loadApiKeys();
    }
  }, [currentUser]);

  // Authorization helper headers
  const getAuthHeaders = () => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentUser?.id}`
    };
  };

  // Fetch Stats from backend API
  const loadDashboardStats = async () => {
    if (!currentUser) return;
    setLoadingStats(true);
    try {
      const response = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
        // Sync user properties from backend (such as refreshed credits or sub level)
        if (currentUser.credits !== data.creditsRemaining || currentUser.subscription !== data.subscriptionStatus) {
          const updatedUser: User = {
            ...currentUser,
            credits: data.creditsRemaining,
            subscription: data.subscriptionStatus
          };
          setCurrentUser(updatedUser);
          localStorage.setItem("ai_platform_user", JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      console.error("Erreur de chargement des statistiques", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch API Keys
  const loadApiKeys = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch("/api/api-keys", {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (response.ok) {
        setKeysList(data.keys);
        // Pre-select first active key in Playground if none selected
        const activeKeys = data.keys.filter((k: ApiKey) => k.status === "active");
        if (activeKeys.length > 0 && !selectedKey) {
          setSelectedKey(activeKeys[0].id);
        }
      }
    } catch (err) {
      console.error("Erreur de chargement des cles d'API", err);
    }
  };

  // Auth Action: Register
  const handleRegisterInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!authEmail || !authPassword) {
      setAuthError("Veuillez saisir votre email et mot de passe.");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthSuccess("Compte cree ! Vous pouvez maintenant vous connecter.");
        setAuthMode("login");
        // retain variables for convenience
      } else {
        setAuthError(data.error || "Une erreur est survenue lors de l'inscription.");
      }
    } catch (err) {
      setAuthError("Impossible de contacter le serveur d'authentification.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth Action: Login
  const handleLoginInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!authEmail || !authPassword) {
      setAuthError("Veuillez saisir vos identifiants.");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        const loggedUser: User = data.user;
        setCurrentUser(loggedUser);
        localStorage.setItem("ai_platform_user", JSON.stringify(loggedUser));
      } else {
        setAuthError(data.error || "Adresse email ou mot de passe incorrect.");
      }
    } catch (err) {
      setAuthError("Impossible de contacter le serveur d'authentification.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Pre-seed Demo login click
  const triggerDemoLogin = async () => {
    setAuthEmail("developpeur@aiplatform.com");
    setAuthPassword("demo123");
    setAuthError("");
    setAuthLoading(true);
    // Directly submit mock
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "developpeur@aiplatform.com", password: "demo123" })
      });
      const data = await res.json();
      if (res.ok) {
        const loggedUser: User = data.user;
        setCurrentUser(loggedUser);
        localStorage.setItem("ai_platform_user", JSON.stringify(loggedUser));
      } else {
        // Automatically attempt to reseed if base credential got deleted
        await fetch("/api/system/reset-demo", { method: "POST" });
        // Retry
        const retryRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "developpeur@aiplatform.com", password: "demo123" })
        });
        const retryData = await retryRes.json();
        if (retryRes.ok) {
          setCurrentUser(retryData.user);
          localStorage.setItem("ai_platform_user", JSON.stringify(retryData.user));
        }
      }
    } catch {
      setAuthError("Erreur d'initialisation de la session de demonstration.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout action
  const triggerLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("ai_platform_user");
    setStats(null);
    setKeysList([]);
    setSelectedKey("");
    setPlaygroundResult(null);
    setPlaygroundError("");
  };

  // Create Key action
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();
      if (res.ok) {
        setNewKeyName("");
        loadApiKeys();
        loadDashboardStats();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingKey(false);
    }
  };

  // Revoke Key action
  const handleRevokeApiKey = async (keyId: string) => {
    const confirmation = window.confirm("Etes-vous sur de vouloir revoquer definitivement cette cle API ?");
    if (!confirmation) return;
    try {
      const res = await fetch("/api/api-keys/revoke", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ keyId })
      });
      if (res.ok) {
        loadApiKeys();
        loadDashboardStats();
        if (selectedKey === keyId) {
          setSelectedKey("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Playground Test Run call
  const handleTestPlayground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey) {
      setPlaygroundError("Veuillez creer ou selectionner une cle d'API active.");
      return;
    }
    setPlaygroundLoading(true);
    setPlaygroundResult(null);
    setPlaygroundError("");

    try {
      const res = await fetch("/api/playground/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": selectedKey
        },
        body: JSON.stringify({
          prompt: playgroundPrompt,
          model: playgroundModel,
          temperature: playgroundTemp
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPlaygroundResult(data);
        // Refresh credit state and charts automatically
        loadDashboardStats();
      } else {
        setPlaygroundError(data.error || "Echec de l'appel a l'API.");
        setPlaygroundResult(data);
      }
    } catch (err) {
      setPlaygroundError("Impossible de joindre la passerelle API d'IA.");
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Payment Subscription Action
  const handleUpgradePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillingError("");
    setBillingSuccess("");
    if (!cardNumber || !cardExpiry || !cardCvc || !cardHolder) {
      setBillingError("Veuillez remplir tous les champs du paiement securise.");
      return;
    }
    setBillingLoading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plan: "Abonnement Premium Developpeur",
          cardNumber,
          expiry: cardExpiry,
          cvc: cardCvc,
          amount: 29.0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingSuccess(data.message);
        // Update local user details with Premium values
        const updatedUser: User = data.user;
        setCurrentUser(updatedUser);
        localStorage.setItem("ai_platform_user", JSON.stringify(updatedUser));
        loadDashboardStats();
        // Clear payment fields
        setCardNumber("");
        setCardExpiry("");
        setCardCvc("");
        setCardHolder("");
      } else {
        setBillingError(data.error || "La transaction a echoue.");
      }
    } catch (err) {
      setBillingError("Erreur de connexion avec le processeur Stripe.");
    } finally {
      setBillingLoading(false);
    }
  };

  // Reset Database to default (helpful for evaluations)
  const handleResetDb = async () => {
    if (window.confirm("Reinitialiser et recharger les donnees de demonstration ? Une session fraiche avec identifiants par defaut sera generee.")) {
      try {
        const res = await fetch("/api/system/reset-demo", { method: "POST" });
        if (res.ok) {
          triggerLogout();
          alert("Base SQL simulee videe et reinjectee avec succes !");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Clipboard copy API helper helper
  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedKeyId(txt);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleKeyVisibility = (id: string) => {
    setApiKeyVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auth Screen Layout
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans antialiased text-sm">
        {/* Decorative ambient background lights */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-950/20 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[250px] h-[250px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header bar */}
        <header id="auth-header" className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-cyan-400 font-mono font-bold shadow-2xl">
              <span className="text-xl">🛠️</span>
              <div className="absolute -inset-1 bg-cyan-500/10 rounded-xl blur-md pointer-events-none" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                AI Hub Platform <span className="text-xs font-mono font-semibold text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded bg-cyan-950/50">V2.0</span>
              </h1>
              <p className="text-xs text-slate-400 font-sans">Gestion de clés d'API et Bac à Sable</p>
            </div>
          </div>
          <button
            id="reset-demo-top-btn"
            onClick={handleResetDb}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono uppercase tracking-wider flex items-center gap-1 bg-slate-900/50 border border-slate-800/80 px-2.5 py-1.5 rounded-lg"
          >
            <RefreshCw className="w-3 h-3" /> Reset SQL Server
          </button>
        </header>

        {/* Main interactive auth layout */}
        <main id="auth-main" className="relative z-10 flex-grow flex items-center justify-center py-12 px-4 sm:px-6">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800/80">
                <div className="flex items-center space-x-2.5 text-cyan-400 mb-2">
                  <Lock className="w-4 h-4" />
                  <span className="font-mono text-xs uppercase tracking-widest font-semibold">Portail Développeur</span>
                </div>
                <h2 className="text-2xl font-sans font-semibold tracking-tight text-white">
                  {authMode === "login" ? "Connexion au Hub" : "Créer un compte développeur"}
                </h2>
                <p className="text-slate-400 mt-1.5">
                  Générez vos jetons et testez vos prompts d'intelligence artificielle en direct.
                </p>
              </div>

              <div className="p-8">
                {/* Visual fast tester block */}
                <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Session d'évaluation immédiate
                    </span>
                    <span className="text-3xs text-slate-500 uppercase font-mono">Prêt</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Testez la plateforme instantanément en un clic grâce à la liaison de base SQL pré-configurée.
                  </p>
                  <button
                    id="fast-demo-signin-btn"
                    type="button"
                    onClick={triggerDemoLogin}
                    disabled={authLoading}
                    className="w-full py-2 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/60 hover:border-cyan-500/40 text-xs text-slate-200 font-mono font-medium rounded-lg flex items-center justify-center gap-2 hover:text-white transition duration-200"
                  >
                    <span>Lancer la version démo</span> <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-4 text-xs font-mono text-slate-500 uppercase tracking-widest">OU</span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                {authError && (
                  <div className="mb-5 p-3 bg-red-950/40 border border-red-900 text-red-200 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="mb-5 p-3 bg-emerald-950/40 border border-emerald-900 text-emerald-200 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <form onSubmit={authMode === "login" ? handleLoginInput : handleRegisterInput} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                      Adresse Email
                    </label>
                    <input
                      id="auth-email-input"
                      type="email"
                      required
                      placeholder="dev@ma-platforme.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-lg px-3.5 py-2 text-slate-200 text-xs outline-none transition focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                      Mot de Passe
                    </label>
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-lg px-3.5 py-2 text-slate-200 text-xs outline-none transition focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </div>

                  <button
                    id="submit-auth-btn"
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-sans font-medium text-xs rounded-lg shadow-lg shadow-cyan-950 hover:shadow-cyan-900 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : authMode === "login" ? (
                      "Se Connecter"
                    ) : (
                      "Créer mon compte"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    id="toggle-auth-mode-btn"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "register" : "login");
                      setAuthError("");
                      setAuthSuccess("");
                    }}
                    className="text-xs text-slate-400 hover:text-cyan-400 transition"
                  >
                    {authMode === "login" ? (
                      <span>Pas encore de compte ? <b className="text-white hover:underline">S'inscrire</b></span>
                    ) : (
                      <span>Déjà un compte ? <b className="text-white hover:underline">Se connecter</b></span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <footer id="auth-footer" className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>© 2026 AI Hub Platform. Backend TypeScript Node.js & Liaison SQL.</p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-500">Stripe Payment</span>
            <span className="hover:text-slate-500">Gemini Web Client</span>
            <span className="hover:text-slate-500">Bases de données relationnelles</span>
          </div>
        </footer>
      </div>
    );
  }

  // Logged In Layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans antialiased text-sm">
      {/* Sidebar background and borders */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* Logo brand wrapper */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-400 font-mono font-bold">
                🛠️
              </div>
              <div>
                <h2 className="font-sans font-bold text-sm tracking-tight text-white">AI Hub Platform</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 uppercase">
                    Back-End actif
                  </span>
                </div>
              </div>
            </div>
            {/* User credentials badge */}
            <div className="mt-4 p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300 font-mono truncate">
                <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-slate-500 font-sans">Statut :</span>
                {currentUser.subscription === "premium" ? (
                  <span className="text-cyan-400 font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/65 border border-cyan-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Premium
                  </span>
                ) : (
                  <span className="text-slate-400 font-mono font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    Gratuit
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition duration-150 ${
                activeTab === "dashboard"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700/80"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Tableau de bord</span>
            </button>

            <button
              id="nav-tab-keys"
              onClick={() => setActiveTab("keys")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition duration-150 ${
                activeTab === "keys"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700/80"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Key className="w-4 h-4 flex-shrink-0" />
              <span className="flex-grow text-left">Gérer Clés d'API</span>
              {keysList.length > 0 && (
                <span className="text-[10px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
                  {keysList.length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-playground"
              onClick={() => setActiveTab("playground")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition duration-150 ${
                activeTab === "playground"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700/80"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-4 h-4 flex-shrink-0" />
              <span>Bac à sable / Playground</span>
            </button>

            <button
              id="nav-tab-billing"
              onClick={() => setActiveTab("billing")}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition duration-150 ${
                activeTab === "billing"
                  ? "bg-slate-800 text-cyan-400 border border-slate-700/80"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <span>Tarifs & Abonnement</span>
            </button>
          </nav>
        </div>

        {/* Action Footers */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* Credit balance visual gauge */}
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1 font-sans">
                <Coins className="w-3.5 h-3.5 text-cyan-400" /> Crédits API
              </span>
              <span className="font-mono font-bold text-white">{currentUser.credits}</span>
            </div>
            {/* simple completion bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    (currentUser.credits / (currentUser.subscription === "premium" ? 5000 : 100)) * 100
                  )}%`
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-sans mt-1.5 leading-relaxed">
              Consomme 5 crédits par appel à l'IA.
            </p>
          </div>

          <button
            id="reload-stats-btn"
            onClick={loadDashboardStats}
            disabled={loadingStats}
            className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-3xs font-mono font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loadingStats ? "animate-spin text-cyan-400" : ""}`} /> Sync Base SQL
          </button>

          <button
            id="logout-btn"
            type="button"
            onClick={triggerLogout}
            className="w-full py-2 bg-slate-950/40 hover:bg-red-950/20 text-slate-500 hover:text-red-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition duration-200 border border-transparent hover:border-red-900/40"
          >
            <LogOut className="w-3.5 h-3.5" /> Quitter la session
          </button>
        </div>
      </aside>

      {/* Main Dynamic Viewport Workspace */}
      <main className="flex-grow flex flex-col overflow-y-auto relative z-10">
        {/* Workspace banner/sub-header */}
        <header className="p-6 bg-slate-900/20 border-b border-slate-900/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white font-sans capitalize">
              {activeTab === "dashboard" && "Tableau de Bord Global"}
              {activeTab === "keys" && "Création et gestion des clés API"}
              {activeTab === "playground" && "Bac à Sable d'Appels Modèles"}
              {activeTab === "billing" && "Mise à Niveau Premium Sécurisée"}
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              {activeTab === "dashboard" && "Analyse en direct de vos requêtes et journaux SQL de consommation."}
              {activeTab === "keys" && "Associez des clés d'accès applicatives à votre quota."}
              {activeTab === "playground" && "Formulez des invites et observez le retour de l'API standard."}
              {activeTab === "billing" && "Garantissez un flux continu sans limites de développement."}
            </p>
          </div>
          <div className="flex items-center space-x-3.5">
            <span className="text-xs font-mono text-slate-500">
              Heure serveur: <strong className="text-slate-300">UTC</strong>
            </span>
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Live Server
            </div>
          </div>
        </header>

        {/* View content section */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-grow">
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div id="tab-dashboard" className="space-y-8">
              {/* Telemetry Stat Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
                  <div className="p-3 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/60 shadow-inner">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-sans text-slate-400 block font-medium">Requêtes Totales</span>
                    <strong className="text-2xl text-white font-bold font-mono">
                      {stats ? stats.totalCalls : "0"}
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
                  <div className="p-3 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800/60 shadow-inner">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-sans text-slate-400 block font-medium">Clés API Actives</span>
                    <strong className="text-2xl text-white font-bold font-mono">
                      {stats ? stats.activeKeysCount : "0"}
                      <span className="text-xs font-semibold text-slate-500 font-sans block">
                        Sûres & Chiffrées
                      </span>
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
                  <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/60 shadow-inner">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-sans text-slate-400 block font-medium">Bases Connectées</span>
                    <strong className="text-2xl text-white font-bold font-sans">
                      Durable <span className="text-xs font-mono text-emerald-400 font-semibold block">JSON SQL Engine</span>
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
                  <div className="p-3 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/60 shadow-inner">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-sans text-slate-400 block font-medium">Solde Quota Restant</span>
                    <strong className="text-2xl text-white font-bold font-mono">
                      {currentUser.credits} <span className="text-xs text-amber-400 font-sans font-medium block">unités</span>
                    </strong>
                  </div>
                </div>
              </div>

              {/* Dynamic Recharts graph visualizer */}
              {stats && stats.chartData && stats.chartData.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-white font-sans flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-cyan-400 animate-pulse" /> Activité API sur 7 jours
                      </h4>
                      <p className="text-xs text-slate-500">Flux d'appels validés par vos clés de sécurité.</p>
                    </div>
                    <div className="flex items-center gap-3.5 text-xs font-mono">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-cyan-500 rounded-full" /> Succès</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Échecs</span>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData}>
                        <defs>
                          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFails" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", borderColor: "#334155" }}
                          labelStyle={{ color: "#94a3b8" }}
                        />
                        <Area type="monotone" dataKey="Succes" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCalls)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Echecs" stroke="#ef4444" fillOpacity={1} fill="url(#colorFails)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Promo billing callout banner if Free */}
              {currentUser.subscription === "free" && (
                <div className="bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border border-cyan-800/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[400px] h-full bg-gradient-to-r from-transparent to-cyan-500/5 blur-[50px] pointer-events-none" />
                  <div className="space-y-1.5 z-10">
                    <span className="text-3xs font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900/80">
                      Offre Premium exclusive
                    </span>
                    <h4 className="text-base font-bold text-white font-sans flex items-center gap-1.5">
                      Libérez la puissance maximale avec l'Abonnement Premium <Sparkles className="w-4 h-4 text-cyan-400" />
                    </h4>
                    <p className="text-xs text-slate-300">
                      Obtenez immédiatement <strong>5 000 crédits d'API d'IA supplémentaires</strong> et une sécurité renforcée.
                    </p>
                  </div>
                  <button
                    id="upgrade-banner-cta-btn"
                    onClick={() => setActiveTab("billing")}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-slate-950 transition flex items-center gap-1 flex-shrink-0 z-10"
                  >
                    <span>M'abonner maintenant</span> <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Transactions log & Raw Queries console logs split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual live terminal logs list */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> Métriques d'Execution SQL en Direct
                    </span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-mono">
                      {stats ? stats.logs.length : "0"} Entrées
                    </span>
                  </div>
                  <div className="p-4 bg-slate-950/80 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[350px] min-h-[250px] space-y-2">
                    {stats && stats.logs.length > 0 ? (
                      stats.logs.map((log) => (
                        <div key={log.id} className="border-b border-slate-900/60 pb-2 text-slate-400">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-semibold">{new Date(log.timestamp).toLocaleString()}</span>
                            {log.status === "success" ? (
                              <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.1 border border-emerald-900 rounded">SUCCESS</span>
                            ) : (
                              <span className="text-red-400 font-bold bg-red-950/60 px-1 py-0.1 border border-red-900 rounded">FAILED</span>
                            )}
                          </div>
                          <p className="text-slate-300 mt-1">
                            <span className="text-cyan-500">SELECT</span> model, tokens <span className="text-cyan-500">FROM</span> generation <span className="text-cyan-500">WHERE</span> x_api_key_id = '{log.apiKeyId.substring(0, 15)}...';
                          </p>
                          <div className="flex items-center gap-4 text-slate-500 mt-0.5 whitespace-nowrap overflow-x-auto">
                            <span>Modèle: <b className="text-slate-400">{log.model}</b></span>
                            <span>Temps: <b className="text-slate-400">{log.responseTimeMs}ms</b></span>
                            <span className="truncate">Prompt: <em className="text-slate-500">"{log.prompt}"</em></span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-[200px] flex flex-col items-center justify-center text-slate-600 gap-2">
                        <Terminal className="w-8 h-8 opacity-40 text-cyan-400" />
                        <p>Aucun log de requêtes d'intelligence artificielle détecté.</p>
                        <button
                          onClick={() => setActiveTab("playground")}
                          className="text-xs text-cyan-500 underline"
                        >
                          Faire un test dans le bac à sable
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure payments transactions database visualization */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Historique de Facturation Premium (Stripe)
                    </span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-mono">
                      Actif SECURE-SSL
                    </span>
                  </div>
                  <div className="p-4 bg-slate-950/20 flex-grow max-h-[350px] overflow-y-auto min-h-[250px]">
                    {stats && stats.payments.length > 0 ? (
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="py-2.5">ID Transaction</th>
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Abonnement</th>
                            <th className="py-2.5">Montant</th>
                            <th className="py-2.5">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/60">
                          {stats.payments.map((p) => (
                            <tr key={p.id} className="text-slate-300">
                              <td className="py-3 text-cyan-400 font-semibold">{p.id}</td>
                              <td className="py-3 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                              <td className="py-3 text-slate-300 font-sans">{p.plan}</td>
                              <td className="py-3 text-slate-200">{p.amount.toFixed(2)} €</td>
                              <td className="py-3">
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-900 rounded uppercase">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-[200px] flex flex-col items-center justify-center text-slate-600 gap-2 font-sans">
                        <CreditCard className="w-8 h-8 opacity-40 text-cyan-400" />
                        <p>Aucun relevé de paiement détecté.</p>
                        <p className="text-xs text-slate-500 text-center">
                          Abonnez-vous à l'offre Premium pour débloquer les rapports de facturation.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE API KEYS */}
          {activeTab === "keys" && (
            <div id="tab-api-keys" className="space-y-8">
              {/* Informative alert box */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-300 max-w-4xl">
                <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold text-white font-sans block">Consignes de sécurité cruciales</span>
                  <p>
                    Les clés d'API générées ci-dessous (commençant par <code className="text-cyan-400 bg-slate-950 font-semibold px-1 py-0.1 rounded font-mono">sk_live_</code>) accordent des droits d'accès à nos modèles d'intelligence artificielle Gemini. Ne divulguez jamais vos jetons. En cas de suspicion d'exposition, cliquez sur révoquer.
                  </p>
                </div>
              </div>

              {/* Generator Key forms */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl">
                <h4 className="font-semibold text-white mb-2 font-sans flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-cyan-400" /> Créer une nouvelle clé d'accès sécurisée
                </h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Définissez un libellé d'usage pour identifier et isoler la clé dans vos journaux de trafic.
                </p>

                <form onSubmit={handleCreateApiKey} className="flex gap-3">
                  <input
                    id="new-key-name-input"
                    type="text"
                    required
                    placeholder="ex: Cle de production appli mobile"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-grow bg-slate-950 border border-slate-850 focus:border-cyan-500/80 rounded-lg px-3.5 py-2 text-slate-200 text-xs outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans"
                  />
                  <button
                    id="create-key-submit-btn"
                    type="submit"
                    disabled={creatingKey}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-medium text-xs rounded-lg transition duration-150 flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50 font-sans"
                  >
                    {creatingKey ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-white" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Générer</span>
                  </button>
                </form>
              </div>

              {/* Display Keys relational tables */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> Registre SQL simulé : api_keys
                  </span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                    {keysList.length} Clés existantes
                  </span>
                </div>
                <div className="p-4 bg-slate-950/20">
                  {keysList.length > 0 ? (
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3">Nom / Libellé</th>
                          <th className="py-3">Jeton de Clé</th>
                          <th className="py-3">Date</th>
                          <th className="py-3 text-center">Appels IA</th>
                          <th className="py-3">Statut</th>
                          <th className="py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60">
                        {keysList.map((key) => {
                          const isVisible = apiKeyVisible[key.id] || false;
                          const truncatedKey = key.id.substring(0, 15) + "••••••••••••••••";
                          return (
                            <tr key={key.id} className={`${key.status === "revoked" ? "opacity-50" : ""}`}>
                              <td className="py-3.5 font-sans font-semibold text-slate-200">
                                {key.name}
                              </td>
                              <td className="py-3.5">
                                <div className="flex items-center space-x-2">
                                  <code className="text-cyan-400 bg-slate-950 border border-slate-900/80 px-2 py-1 rounded">
                                    {isVisible ? key.id : truncatedKey}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility(key.id)}
                                    className="p-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                                    title={isVisible ? "Masquer" : "Afficher"}
                                  >
                                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(key.id)}
                                    className="p-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                                    title="Copier la clé"
                                  >
                                    {copiedKeyId === key.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 text-slate-400">
                                {new Date(key.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 text-center font-bold text-white text-sm">
                                {key.callsCount}
                              </td>
                              <td className="py-3.5">
                                {key.status === "active" ? (
                                  <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-900/60 rounded uppercase">
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[9px] font-bold bg-red-950/70 text-red-400 border border-red-900/60 rounded uppercase">
                                    Révoquée
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-right">
                                {key.status === "active" ? (
                                  <button
                                    onClick={() => handleRevokeApiKey(key.id)}
                                    className="px-2.5 py-1.5 text-red-400 hover:bg-red-950/30 hover:text-red-300 font-sans text-3xs font-bold uppercase border border-red-900/40 hover:border-red-900 rounded-lg transition"
                                  >
                                    Révoquer
                                  </button>
                                ) : (
                                  <span className="text-3xs font-mono uppercase text-slate-400">Inactif</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center bg-slate-950/40 rounded-xl space-y-3 font-sans">
                      <Key className="w-10 h-10 mx-auto text-cyan-500 opacity-50" />
                      <div>
                        <p className="text-white font-semibold">Aucune clé d'API active</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Utilisez le formulaire ci-dessus pour générer votre première clé d'accès et pouvoir commencer à requêter les API.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAYGROUND / SANDBOX */}
          {activeTab === "playground" && (
            <div id="tab-playground" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Control Parameter Config panel */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-cyan-400 border-b border-slate-800 pb-3">
                      <Terminal className="w-5 h-5 animate-pulse" />
                      <span className="font-sans font-bold text-sm text-white">Console d'Intégration d'API</span>
                    </div>

                    <form onSubmit={handleTestPlayground} className="space-y-4 font-sans">
                      <div>
                        <label className="block text-min font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                          Sélectionner la clé d'authentification
                        </label>
                        <select
                          id="playground-key-select"
                          required
                          value={selectedKey}
                          onChange={(e) => setSelectedKey(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none transition font-sans"
                        >
                          <option value="">Sélectionner une clé d'API...</option>
                          {keysList
                            .filter((k) => k.status === "active")
                            .map((key) => (
                              <option key={key.id} value={key.id}>
                                {key.name} ({key.id.substring(0, 15)}...)
                              </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Cet appel consommera 5 crédits de l'enveloppe du détenteur.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-min font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                            Modèle sélectionné
                          </label>
                          <select
                            id="playground-model-select"
                            value={playgroundModel}
                            onChange={(e) => setPlaygroundModel(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none font-sans"
                          >
                            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-min font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                            Température ({playgroundTemp})
                          </label>
                          <input
                            id="playground-temp-range"
                            type="range"
                            min="0.1"
                            max="1.5"
                            step="0.1"
                            value={playgroundTemp}
                            onChange={(e) => setPlaygroundTemp(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer mt-3"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-min font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                          Prompt d'entree (Payload)
                        </label>
                        <textarea
                          id="playground-prompt-textarea"
                          required
                          rows={4}
                          value={playgroundPrompt}
                          onChange={(e) => setPlaygroundPrompt(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/80 rounded-lg px-3.5 py-2 text-slate-200 text-xs outline-none transition font-sans leading-relaxed"
                          placeholder="Saisissez l'instruction à exécuter..."
                        />
                      </div>

                      <button
                        id="playground-run-btn"
                        type="submit"
                        disabled={playgroundLoading}
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-950/50 transition duration-150 disabled:opacity-50"
                      >
                        {playgroundLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Compil & Invocation du modèle...
                          </>
                        ) : (
                          <>
                            <Cpu className="w-4 h-4" /> <span>Exécuter la requête API</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed font-sans">
                    <span className="font-bold text-slate-400 flex items-center gap-1 mb-1">
                      💡 Astuce Développeur
                    </span>
                    Toutes les requêtes passent par le port proxy sécurisé du serveur Express. L'API Key est validée côté serveur, évitant toute fuite dans le navigateur de l'utilisateur final.
                  </div>
                </div>

                {/* API Output screen - JSON/Message view */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  {/* Console Header */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-grow shadow-2xl">
                    <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 animate-pulse" /> Terminal d'Exécution Client / cURL
                      </span>
                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded text-slate-400 font-mono">
                        POST /api/playground/chat
                      </span>
                    </div>

                    {/* Code playground output visualizer */}
                    <div className="p-6 bg-slate-950/90 font-mono text-xs flex-grow flex flex-col justify-between min-h-[350px]">
                      {/* Code placeholder snippet */}
                      <div className="space-y-4">
                        {/* simulated cURL command */}
                        <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-[11px] text-slate-300 select-all overflow-x-auto leading-relaxed">
                          <span className="text-cyan-500">curl</span> -X POST "{window.location.origin}/api/playground/chat" \<br />
                          &nbsp;&nbsp;-H <span className="text-amber-400">"Content-Type: application/json"</span> \<br />
                          &nbsp;&nbsp;-H <span className="text-amber-400">"x-api-key: {selectedKey || "sk_live_votre_cle_ici"}"</span> \<br />
                          &nbsp;&nbsp;-d '<span className="text-emerald-400">{"{"}"prompt": "{playgroundPrompt.replace(/"/g, '\\"')}", "model": "{playgroundModel}"{"}"}</span>'
                        </div>

                        {playgroundLoading ? (
                          <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-900 rounded-lg">
                            <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                            <p className="animate-pulse">En attente de réponse du serveur d'inférence Gemini de Google...</p>
                          </div>
                        ) : playgroundError ? (
                          <div className="p-4 bg-red-950/30 border border-red-900/60 rounded-lg space-y-1.5 text-xs">
                            <span className="text-red-400 font-bold flex items-center gap-1.5">
                              <XCircle className="w-4 h-4" /> REQUÊTE REJETÉE (ERR_INSUFFICIENT_CREDITS ou API_KEY_INVALID)
                            </span>
                            <p className="text-red-300 leading-relaxed font-mono">
                              {playgroundError}
                            </p>
                          </div>
                        ) : playgroundResult ? (
                          <div className="space-y-4">
                            {/* Headers parameters metadata block */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-900/50 border border-slate-850 rounded-lg text-[10px] text-slate-400 font-mono">
                              <div>
                                Status: <b className="text-emerald-400">200 OK</b>
                              </div>
                              <div>
                                Latence: <b className="text-amber-400">{playgroundResult?.headers?.["x-response-time-ms"] || "1200"} ms</b>
                              </div>
                              <div>
                                Crédits restants: <b className="text-white">{playgroundResult?.usage?.credits_remaining}</b>
                              </div>
                            </div>

                            {/* Actual result text message */}
                            <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-lg text-slate-200 leading-relaxed font-sans text-xs whitespace-pre-wrap">
                              <strong className="block font-mono text-[10px] text-cyan-400 uppercase tracking-widest mb-2">Message AI Retourné</strong>
                              {playgroundResult.response}
                            </div>

                            {/* Raw JSON payload returned */}
                            <details className="cursor-pointer">
                              <summary className="text-[10px] text-slate-500 hover:text-slate-300 select-none pb-1.5">Voir le payload JSON HTTP complet</summary>
                              <pre className="p-3 bg-slate-900 border border-slate-850 text-slate-400 text-[10px] overflow-auto max-h-[160px] rounded-lg cursor-text leading-relaxed">
                                {JSON.stringify(playgroundResult, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ) : (
                          <div className="h-[200px] flex flex-col items-center justify-center text-slate-600 gap-2 text-center border border-slate-900 rounded-lg">
                            <Terminal className="w-8 h-8 opacity-40 text-cyan-500" />
                            <p className="font-sans">Terminal inactif.</p>
                            <p className="text-[11px] max-w-xs leading-relaxed font-sans text-slate-500">
                              Appuyez sur le bouton vert d'exécution à gauche pour envoyer la commande et observer le payload HTTP simulé.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BILLING TARIFS & PAYMENT PORTAL */}
          {activeTab === "billing" && (
            <div id="tab-billing" className="space-y-8">
              {/* Premium presentation layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6 max-w-lg">
                  <div>
                    <span className="text-3xs font-mono uppercase tracking-widest text-[#06b6d4] bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900/80">
                      Garantie Zéro Risque
                    </span>
                    <h2 className="text-3xl font-bold tracking-tight text-white mt-1 font-sans">
                      Abonnement Premium Développeur
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed mt-2 font-sans">
                      Dépassez les limitations des comptes gratuits. Idéal pour mettre en ligne des applications tierces alimentées par l'API sans craindre l'épuisement de quotas.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 font-sans">
                    <span className="font-bold text-xs text-white uppercase tracking-wider block font-mono">
                      Contenu exclusif de l'offre
                    </span>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        <span><strong>+ 5 000 crédits d'API</strong> cumulables immédiatement</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        <span>Accès au modèle Premium <strong>Gemini 3.1 Pro (Inférence fine)</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        <span>Support technique par mail prioritaire (temps de réponse inférieur à 2h)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        <span>Garantie de disponibilité serveur de <strong>99,99%</strong></span>
                      </li>
                    </ul>
                    <div className="pt-3 border-t border-slate-800 flex items-baseline gap-1 bg-slate-950/20 p-2 rounded-lg">
                      <strong className="text-2xl font-mono text-white">29,00 €</strong>
                      <span className="text-xs text-slate-500 font-sans">/ par mois sans engagement</span>
                    </div>
                  </div>
                </div>

                {/* Stripe Secure checkout terminal wrapper */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-w-md">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Passerelle de Paiement Sécurisée : Stripe Inc.
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">
                      SSL-128bit
                    </span>
                  </div>

                  <div className="p-6">
                    {billingSuccess && (
                      <div className="p-4 bg-emerald-950/30 border border-emerald-900 text-emerald-300 rounded-lg text-xs space-y-2 mb-6 font-sans">
                        <span className="font-bold font-sans flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" /> Transaction approuvée avec succès !
                        </span>
                        <p>{billingSuccess}</p>
                        <p className="text-[11px] text-emerald-400/80">
                          Votre quota de crédits a été augmenté à <strong>{currentUser.credits} crédits</strong>. Bénéficiez des modèles dès à présent dans l'onglet Bac à sable.
                        </p>
                      </div>
                    )}

                    {billingError && (
                      <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 rounded-lg text-xs flex items-center gap-2 mb-6 font-sans">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>{billingError}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpgradePayment} className="space-y-4 font-sans text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                          Nom du titulaire de la carte
                        </label>
                        <input
                          id="card-holder-input"
                          type="text"
                          required
                          placeholder="Jean Dupont/Developer"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none transition focus:border-cyan-500/80"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                          Numéro de carte bancaire (Sans espaces)
                        </label>
                        <div className="relative">
                          <input
                            id="card-number-input"
                            type="text"
                            required
                            maxLength={19}
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, ""))}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-3 pr-10 py-2 text-slate-200 font-mono text-xs outline-none focus:border-cyan-500/80"
                          />
                          <div className="absolute right-3.5 top-2.5 text-slate-500">
                            💳
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                            Date d'expiration
                          </label>
                          <input
                            id="card-expiry-input"
                            type="text"
                            required
                            maxLength={5}
                            placeholder="MM/AA"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none text-center font-mono focus:border-cyan-500/80"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
                            Cryptogramme (CVC)
                          </label>
                          <input
                            id="card-cvc-input"
                            type="password"
                            required
                            maxLength={3}
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none text-center font-mono focus:border-cyan-500/80"
                          />
                        </div>
                      </div>

                      <button
                        id="submit-payment-btn"
                        type="submit"
                        disabled={billingLoading}
                        className="w-full mt-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold text-xs rounded-lg transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/80 disabled:opacity-50"
                      >
                        {billingLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Vérification d'authentification 3D Secure...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-white" />
                            <span>Valider le paiement de 29,00 €</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
