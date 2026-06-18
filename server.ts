import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define basic JSON structure mirroring SQL Relational Tables
interface User {
  id: string;
  email: string;
  passwordHash: string; // client hashes or simple hash
  subscription: "free" | "premium";
  credits: number;
  createdAt: string;
}

interface ApiKey {
  id: string; // sk_live_...
  userId: string;
  name: string;
  status: "active" | "revoked";
  callsCount: number;
  createdAt: string;
}

interface Payment {
  id: string;
  userId: string;
  amount: number;
  plan: string;
  status: "completed" | "failed";
  cardLast4: string;
  createdAt: string;
}

interface ApiLog {
  id: string;
  apiKeyId: string;
  userId: string;
  model: string;
  prompt: string;
  status: "success" | "failed";
  responseTimeMs: number;
  timestamp: string;
}

interface Database {
  users: User[];
  api_keys: ApiKey[];
  payments: Payment[];
  api_logs: ApiLog[];
}

// Ensure database file exits with default structures
function loadDb(): Database {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData: Database = {
      users: [
        {
          id: "usr_admin123",
          email: "developpeur@aiplatform.com",
          passwordHash: "demo123", // Simple demo credential for convenient testing
          subscription: "free",
          credits: 100,
          createdAt: new Date().toISOString(),
        }
      ],
      api_keys: [
        {
          id: "sk_live_demo123456789",
          userId: "usr_admin123",
          name: "Cle d'essai par defaut",
          status: "active",
          callsCount: 0,
          createdAt: new Date().toISOString(),
        }
      ],
      payments: [],
      api_logs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const fileContent = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading database", error);
    return { users: [], api_keys: [], payments: [], api_logs: [] };
  }
}

function saveDb(data: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving database", error);
  }
}

// Middleware to parse requests
app.use(express.json());

// Simple Auth helper from header Bearer token (contains userId for simplified session)
function getAuthenticatedUser(req: express.Request, dbState: Database): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const userId = authHeader.split(" ")[1];
  return dbState.users.find((u) => u.id === userId) || null;
}

// ----------------------------------------------------
// BACKEND API ROUTES
// ----------------------------------------------------

// 1. User Registration
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "L'e-mail et le mot de passe sont requis." });
    return;
  }

  const dbState = loadDb();
  const exists = dbState.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    res.status(400).json({ error: "Cette adresse e-mail est deja utilisee." });
    return;
  }

  const newUser: User = {
    id: "usr_" + Math.random().toString(36).substr(2, 9),
    email,
    passwordHash: password, // For simplicity of this demo backend
    subscription: "free",
    credits: 100, // Starts off with 100 free credits
    createdAt: new Date().toISOString(),
  };

  dbState.users.push(newUser);
  saveDb(dbState);

  res.status(201).json({
    message: "Inscription reussie",
    user: {
      id: newUser.id,
      email: newUser.email,
      subscription: newUser.subscription,
      credits: newUser.credits,
    },
  });
});

// 2. User Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "L'e-mail et le mot de passe sont requis." });
    return;
  }

  const dbState = loadDb();
  const user = dbState.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
  );

  if (!user) {
    res.status(401).json({ error: "Identifiants incorrects." });
    return;
  }

  res.json({
    message: "Connexion reussie",
    user: {
      id: user.id,
      email: user.email,
      subscription: user.subscription,
      credits: user.credits,
    },
  });
});

// 3. Get Current Profile Status
app.get("/api/auth/me", (req, res) => {
  const dbState = loadDb();
  const user = getAuthenticatedUser(req, dbState);
  if (!user) {
    res.status(401).json({ error: "Sens de connexion refuse. Veuillez vous reconnecter." });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      subscription: user.subscription,
      credits: user.credits,
      createdAt: user.createdAt,
    },
  });
});

// 4. Upgrade Premium Subscriptions (Simulated Payment Portal)
app.post("/api/subscription/upgrade", (req, res) => {
  const { plan, cardNumber, expiry, cvc, amount } = req.body;
  const dbState = loadDb();
  const user = getAuthenticatedUser(req, dbState);
  if (!user) {
    res.status(401).json({ error: "Veuillez vous connecter pour vous abonner." });
    return;
  }

  if (!cardNumber || !expiry || !cvc) {
    res.status(400).json({ error: "Les informations de paiement sont manquantes ou incorrectes." });
    return;
  }

  // Find user index and update details
  const userIdx = dbState.users.findIndex((u) => u.id === user.id);
  if (userIdx === -1) {
    res.status(404).json({ error: "Utilisateur non trouve." });
    return;
  }

  // Simulate payment processor decision (approving card types unless test failures requested)
  const isApproved = cardNumber.replace(/\s/g, "").length >= 12;
  if (!isApproved) {
    res.status(400).json({ error: "Carte invalide ou transaction refusee par la banque." });
    return;
  }

  const transactionAmount = amount || 29.0;
  const premiumCredits = 5000; // Premium users get 5000 API call credits

  // Update properties on deep copy
  dbState.users[userIdx].subscription = "premium";
  // Accumulate premium credits on top of whatever was there
  dbState.users[userIdx].credits += premiumCredits;

  // Create payment record
  const newPayment: Payment = {
    id: "tx_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    userId: user.id,
    amount: transactionAmount,
    plan: plan || "Abonnement Premium Mensuel",
    status: "completed",
    cardLast4: cardNumber.substring(cardNumber.length - 4),
    createdAt: new Date().toISOString(),
  };

  dbState.payments.push(newPayment);
  saveDb(dbState);

  res.json({
    message: "Felicitations ! Vous etes desormais membre Premium.",
    user: {
      id: dbState.users[userIdx].id,
      email: dbState.users[userIdx].email,
      subscription: dbState.users[userIdx].subscription,
      credits: dbState.users[userIdx].credits,
    },
    payment: newPayment,
  });
});

// 5. Get API Keys
app.get("/api/api-keys", (req, res) => {
  const dbState = loadDb();
  const user = getAuthenticatedUser(req, dbState);
  if (!user) {
    res.status(401).json({ error: "Non autorise." });
    return;
  }

  const userKeys = dbState.api_keys.filter((k) => k.userId === user.id);
  res.json({ keys: userKeys });
});

// 6. Create API Key
app.post("/api/api-keys", (req, res) => {
  const { name } = req.body;
  const dbState = loadDb();
  const user = getAuthenticatedUser(req, dbState);
  if (!user) {
    res.status(401).json({ error: "Non autorise." });
    return;
  }

  const randomString = [...Array(24)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
  const keyId = `sk_live_${randomString}`;

  const newKey: ApiKey = {
    id: keyId,
    userId: user.id,
    name: name || "Nouvelle Cle API",
    status: "active",
    callsCount: 0,
    createdAt: new Date().toISOString(),
  };

  dbState.api_keys.push(newKey);
  saveDb(dbState);

  res.status(201).json({
    message: "Cle API marquee avec succes",
    apiKey: newKey,
  });
});

// 7. Revoke/Change status of API Key
app.post("/api/api-keys/revoke", (req, res) => {
  const { keyId } = req.body;
  const dbState = loadDb();
  const user = getAuthenticatedUser(req, dbState);
  if (!user) {
    res.status(401).json({ error: "Non autorise." });
    return;
  }

  const keyIdx = dbState.api_keys.findIndex((k) => k.id === keyId && k.userId === user.id);
  if (keyIdx === -1) {
    res.status(404).json({ error: "Cle API introuvable." });
    return;
  }

  dbState.api_keys[keyIdx].status = "revoked";
  saveDb(dbState);

  res.json({
    message: "Cle API revoquee avec succes.",
    apiKey: dbState.api_keys[keyIdx],
  });
});

// 8. Load Dashboard Analytics / Reports
app.get("/api/dashboard/stats", (req, res) => {
  const dbState = loadDb();
  const user = getAuthenticatedUser(req, dbState);
  if (!user) {
    res.status(401).json({ error: "Non autorise." });
    return;
  }

  // Get user keys
  const keys = dbState.api_keys.filter((k) => k.userId === user.id);
  const keyIds = keys.map((k) => k.id);

  // Filter logs related to those keys
  const logs = dbState.api_logs.filter((l) => keyIds.includes(l.apiKeyId));

  // Payments for this user
  const payments = dbState.payments.filter((p) => p.userId === user.id);

  res.json({
    keysCount: keys.length,
    activeKeysCount: keys.filter((k) => k.status === "active").length,
    totalCalls: keys.reduce((acc, k) => acc + k.callsCount, 0),
    creditsRemaining: user.credits,
    subscriptionStatus: user.subscription,
    logs: logs.slice(-25).reverse(), // Last 25 logs
    payments: payments.reverse(),
    // Group logs by day for charting (last 7 days)
    chartData: generateChartStats(logs),
  });
});

// Helper to accumulate chart values
function generateChartStats(logs: ApiLog[]) {
  const days: { [key: string]: { date: string; Succes: number; Echecs: number; Milliseconds: number; count: number } } = {};
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
    days[dateStr] = { date: dateStr, Succes: 0, Echecs: 0, Milliseconds: 0, count: 0 };
  }

  logs.forEach((log) => {
    const logDateStr = new Date(log.timestamp).toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
    if (days[logDateStr]) {
      if (log.status === "success") {
        days[logDateStr].Succes += 1;
      } else {
        days[logDateStr].Echecs += 1;
      }
      days[logDateStr].Milliseconds += log.responseTimeMs;
      days[logDateStr].count += 1;
    }
  });

  return Object.values(days).map(day => ({
    ...day,
    "Temps (ms)": day.count > 0 ? Math.round(day.Milliseconds / day.count) : 0
  }));
}

// 9. API PLAYGROUND - AI MODEL ROUTE EXECUTED WITH DEVELOPER ClE API
// This serves as the actual AI API gateway of our platform!
app.post("/api/playground/chat", async (req, res) => {
  const apiKeyHeader = req.headers["x-api-key"] as string;
  const { prompt, model = "gemini-3.5-flash", temperature = 0.7 } = req.body;

  if (!apiKeyHeader) {
    res.status(401).json({
      error: "Authentification de cle API manquante.",
      code: "API_KEY_MISSING"
    });
    return;
  }

  const dbState = loadDb();
  // Find key
  const apiKeyEntity = dbState.api_keys.find((k) => k.id === apiKeyHeader);
  if (!apiKeyEntity || apiKeyEntity.status === "revoked") {
    res.status(403).json({
      error: "Cle API invalide ou revoquee.",
      code: "API_KEY_INVALID"
    });
    return;
  }

  // Find owning user
  const userIdx = dbState.users.findIndex((u) => u.id === apiKeyEntity.userId);
  if (userIdx === -1) {
    res.status(404).json({
      error: "Proprietaire de la cle introuvable.",
      code: "USER_NOT_FOUND"
    });
    return;
  }

  const user = dbState.users[userIdx];
  const queryCost = 5; // e.g., 5 credits per API interaction

  if (user.credits < queryCost) {
    res.status(402).json({
      error: "Solde de credits insuffisant. Veuillez recharger votre compte ou passer a Premium.",
      code: "CREDITS_EXHAUSTED"
    });
    return;
  }

  // Deduct credits and increment call count
  dbState.users[userIdx].credits -= queryCost;
  const keyIdx = dbState.api_keys.findIndex((k) => k.id === apiKeyHeader);
  dbState.api_keys[keyIdx].callsCount += 1;

  const startMs = Date.now();
  let responseText = "";
  let successStatus: "success" | "failed" = "success";

  try {
    // Standard initialization rules for Gemini
    const systemToken = process.env.GEMINI_API_KEY;
    if (!systemToken || systemToken === "MY_GEMINI_API_KEY") {
      throw new Error("Le jeton systeme GEMINI_API_KEY n'est pas configure sur le serveur.");
    }

    const ai = new GoogleGenAI({
      apiKey: systemToken,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Run AI request
    const response = await ai.models.generateContent({
      model: model, // defaults to gemini-3.5-flash
      contents: prompt || "Invoquer un message de salutation dev-to-dev.",
    });

    responseText = response.text || "Aucune reponse generee par le modele.";
  } catch (error: any) {
    successStatus = "failed";
    responseText = `Erreur Serveur d'Execution de l'IA : ${error?.message || error}`;
  }

  const endMs = Date.now();
  const duration = endMs - startMs;

  // Record API log
  const newLog: ApiLog = {
    id: "log_" + Math.random().toString(36).substr(2, 9),
    apiKeyId: apiKeyEntity.id,
    userId: user.id,
    model,
    prompt: prompt ? (prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt) : "Default test",
    status: successStatus,
    responseTimeMs: duration,
    timestamp: new Date().toISOString(),
  };

  dbState.api_logs.push(newLog);
  // Persist edits
  saveDb(dbState);

  if (successStatus === "failed") {
    res.status(502).json({
      error: "Echec de generation par l'IA.",
      details: responseText,
      responseTimeMs: duration,
      creditsDeducted: queryCost,
      remainingCredits: dbState.users[userIdx].credits,
    });
  } else {
    // Successful simulation response formatting
    res.json({
      success: true,
      model,
      response: responseText,
      usage: {
        credits_billed: queryCost,
        credits_remaining: dbState.users[userIdx].credits,
        api_key_name: apiKeyEntity.name,
      },
      headers: {
        "x-platform-sender": "developer-ai-platform",
        "x-response-time-ms": duration.toString(),
        "x-credits-remaining": dbState.users[userIdx].credits.toString(),
      },
    });
  }
});

// A standard API endpoint to return server system details or reset DB
app.post("/api/system/reset-demo", (req, res) => {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  loadDb();
  res.json({ status: "success", message: "Base de donnees reinitialisee par defaut !" });
});

// ----------------------------------------------------
// FRONTEND BINDINGS (VITE MIDDLEWARE)
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully responsive on port ${PORT}`);
  });
}

startServer();
