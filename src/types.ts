export interface User {
  id: string;
  email: string;
  subscription: "free" | "premium";
  credits: number;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  status: "active" | "revoked";
  callsCount: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  plan: string;
  status: "completed" | "failed";
  cardLast4: string;
  createdAt: string;
}

export interface ApiLog {
  id: string;
  apiKeyId: string;
  userId: string;
  model: string;
  prompt: string;
  status: "success" | "failed";
  responseTimeMs: number;
  timestamp: string;
}

export interface DashboardStats {
  keysCount: number;
  activeKeysCount: number;
  totalCalls: number;
  creditsRemaining: number;
  subscriptionStatus: "free" | "premium";
  logs: ApiLog[];
  payments: Payment[];
  chartData: {
    date: string;
    Succes: number;
    Echecs: number;
    "Temps (ms)": number;
  }[];
}
