import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  KanbanSquare,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageCircle,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activities, clients, conversionSeries, deals, revenueSeries, stages, tasks, type DealStage } from "./data/demo";
import { cn, money } from "./lib/utils";
import { Badge, Button, Card, GhostButton, Skeleton } from "./components/ui";

type Page = "Дашборд" | "Клиенты" | "Профиль клиента" | "Сделки" | "Задачи" | "AI Ассистент" | "API Документация" | "Настройки" | "Админ-панель";
type Role = "admin" | "manager" | "viewer";
type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    status?: "active" | "invited" | "disabled";
    title?: string;
    department?: string;
  };
  accessToken: string;
  refreshToken: string;
};
type AuthedRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const sessionKey = "nexusrm.session";
const defaultWorkspaceSettings: WorkspaceSettings = {
  workspaceName: "NexusRM",
  timezone: "Europe/Moscow",
  currency: "RUB",
  aiEnabled: true,
  publicApiEnabled: true,
  registrationEnabled: false,
  defaultRole: "manager",
};

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "API временно недоступен";
    throw new Error(message);
  }
  return data as T;
}

function isExpiredTokenError(error: unknown) {
  return error instanceof Error && /invalid or expired access token|missing access token/i.test(error.message);
}

const nav: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Дашборд", icon: LayoutDashboard },
  { label: "Клиенты", icon: Users },
  { label: "Сделки", icon: KanbanSquare },
  { label: "Задачи", icon: CheckCircle2 },
  { label: "AI Ассистент", icon: Bot },
  { label: "API Документация", icon: Code2 },
  { label: "Настройки", icon: Settings },
  { label: "Админ-панель", icon: Shield },
];

const clientStatusLabels = {
  active: "активный",
  at_risk: "риск",
  new: "новый",
  lost: "потерян",
};

const taskStatusLabels = {
  todo: "к выполнению",
  in_progress: "в работе",
  done: "готово",
};

const priorityLabels = {
  low: "низкий",
  medium: "средний",
  high: "высокий",
  urgent: "срочно",
};

export function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = localStorage.getItem(sessionKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as Session;
    } catch {
      localStorage.removeItem(sessionKey);
      return null;
    }
  });
  const [page, setPage] = useState<Page>("Дашборд");
  const [selectedClient, setSelectedClient] = useState(clients[0]);
  const [loading, setLoading] = useState(false);
  const [dealList, setDealList] = useState(deals);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function createDeal(deal: (typeof deals)[number]) {
    setDealList((prev) => [deal, ...prev]);
    setNewDealOpen(false);
    setPage("Сделки");
  }

  const kpis = useMemo(
    () => [
      { label: "Всего клиентов", value: clients.length.toString(), delta: "+18%", icon: Users },
      { label: "Активные сделки", value: deals.filter((deal) => !["Выиграна", "Проиграна"].includes(deal.stage)).length.toString(), delta: "+7", icon: KanbanSquare },
      { label: "Выручка за месяц", value: money(42000), delta: "+24%", icon: BarChart3 },
      { label: "Конверсия", value: "31%", delta: "+4.2%", icon: Activity },
      { label: "Задачи на сегодня", value: tasks.filter((task) => task.due === "Сегодня").length.toString(), delta: "срочно", icon: Bell },
    ],
    [],
  );

  function switchPage(next: Page) {
    setMobileNavOpen(false);
    setLoading(true);
    setPage(next);
    window.setTimeout(() => setLoading(false), 420);
  }

  async function login(email: string, password: string) {
    const next = await apiRequest<Session>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession(next);
    localStorage.setItem(sessionKey, JSON.stringify(next));
    setPage("Дашборд");
  }

  async function authenticatedRequest<T>(path: string, options: RequestInit = {}) {
    if (!session) throw new Error("Сессия не найдена");
    try {
      return await apiRequest<T>(path, options, session.accessToken);
    } catch (error) {
      if (!isExpiredTokenError(error)) throw error;
      const refreshed = await apiRequest<Session>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      setSession(refreshed);
      localStorage.setItem(sessionKey, JSON.stringify(refreshed));
      return apiRequest<T>(path, options, refreshed.accessToken);
    }
  }

  function logout() {
    setSession(null);
    localStorage.removeItem(sessionKey);
    setPage("Дашборд");
  }

  if (!session) return <LoginScreen onLogin={login} />;

  const visibleNav = nav.filter((item) => item.label !== "Админ-панель" || session.user.role === "admin");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,45,45,0.18),transparent_34%),linear-gradient(180deg,#050505,#0B0B0F)] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-nexus-border bg-black/45 p-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <img className="size-11 rounded-lg shadow-red" src="/logo.png" alt="Логотип NexusRM" />
            <div>
              <div className="text-lg font-black tracking-normal">NexusRM</div>
              <div className="text-xs text-nexus-muted">B2B система продаж</div>
            </div>
          </div>
          <NavLinks items={visibleNav} page={page} onNavigate={switchPage} />
          <Card className="mt-8 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="text-nexus-red" size={17} />
              AI монитор рисков
            </div>
            <p className="text-sm leading-6 text-nexus-muted">RedForge в зоне риска: активности не было 14 дней.</p>
            <Button className="mt-4 h-9 w-full" onClick={() => switchPage("AI Ассистент")}>Сгенерировать письмо</Button>
          </Card>
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-nexus-border bg-[#0B0B0F] p-5 shadow-2xl">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img className="size-10 rounded-lg shadow-red" src="/logo.png" alt="Логотип NexusRM" />
                  <div>
                    <div className="text-base font-black tracking-normal">NexusRM</div>
                    <div className="text-xs text-nexus-muted">B2B система продаж</div>
                  </div>
                </div>
                <GhostButton className="size-9 px-0" onClick={() => setMobileNavOpen(false)} aria-label="Закрыть меню">
                  <X size={18} />
                </GhostButton>
              </div>
              <NavLinks items={visibleNav} page={page} onNavigate={switchPage} />
              <div className="mt-auto rounded-md border border-nexus-border bg-white/[0.03] px-3 py-3 text-xs">
                <div className="font-bold text-white">{session.user.name}</div>
                <div className="text-nexus-muted">{session.user.role}</div>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-nexus-border bg-nexus-bg/85 px-4 py-3 backdrop-blur md:px-7 md:py-4">
            <div className="flex items-center gap-3">
              <GhostButton className="size-10 shrink-0 px-0 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Открыть меню">
                <PanelLeft size={18} />
              </GhostButton>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs uppercase text-nexus-muted">Центр управления продажами</div>
                <h1 className="truncate text-xl font-black tracking-normal md:text-3xl">{page}</h1>
              </div>
              <div className="relative hidden min-w-72 xl:block">
                <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                <input className="h-10 w-full rounded-md border border-nexus-border bg-white/[0.03] pl-10 pr-3 text-sm outline-none ring-nexus-red/60 placeholder:text-zinc-600 focus:ring-2" placeholder="Поиск клиентов, сделок, задач..." />
              </div>
              <GhostButton className="hidden size-10 shrink-0 px-0 sm:inline-flex" aria-label="Уведомления">
                <Bell size={18} />
              </GhostButton>
              <Button className="shrink-0 px-3 md:px-4" onClick={() => setNewDealOpen(true)}>
                <Plus size={18} />
                <span className="hidden sm:inline">Новая сделка</span>
              </Button>
              <GhostButton className="size-10 shrink-0 px-0" onClick={logout} aria-label="Выйти">
                <LogOut size={18} />
              </GhostButton>
            </div>
          </header>

          <div className="p-4 md:p-7">
            {loading ? <LoadingState /> : null}
            {!loading && page === "Дашборд" && <Dashboard kpis={kpis} />}
            {!loading && page === "Клиенты" && <ClientsPage onSelect={(client) => { setSelectedClient(client); switchPage("Профиль клиента"); }} />}
            {!loading && page === "Профиль клиента" && <ClientProfile client={selectedClient} />}
            {!loading && page === "Сделки" && <DealsPage deals={dealList} />}
            {!loading && page === "Задачи" && <TasksPage />}
            {!loading && page === "AI Ассистент" && <AiPage />}
            {!loading && page === "API Документация" && <ApiDocsPage />}
            {!loading && page === "Настройки" && <SettingsPage session={session} request={authenticatedRequest} />}
            {!loading && page === "Админ-панель" && <AdminPage session={session} request={authenticatedRequest} />}
          </div>
        </main>
      </div>
      {newDealOpen && <NewDealModal onClose={() => setNewDealOpen(false)} onCreate={createDeal} />}
    </div>
  );
}

function NavLinks({ items, page, onNavigate }: { items: typeof nav; page: Page; onNavigate: (next: Page) => void }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => onNavigate(item.label)}
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white",
            page === item.label && "bg-nexus-red/14 text-white ring-1 ring-nexus-red/35",
          )}
        >
          <item.icon size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("admin@nexusrm.ai");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  function useAccount(nextEmail: string, nextPassword: string) {
    setEmail(nextEmail);
    setPassword(nextPassword);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_10%,rgba(255,45,45,0.22),transparent_30%),linear-gradient(135deg,#050505,#0B0B0F)] p-5 text-white">
      <Card className="w-full max-w-md p-7">
        <div className="mb-7 flex items-center gap-3">
          <img className="size-12 rounded-lg" src="/logo.png" alt="Логотип NexusRM" />
          <div>
            <h1 className="text-2xl font-black">NexusRM</h1>
            <p className="text-sm text-nexus-muted">Защищенный центр управления CRM</p>
          </div>
        </div>
        <label className="mb-2 block text-sm text-zinc-300">Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="mb-4 h-11 w-full rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60" />
        <label className="mb-2 block text-sm text-zinc-300">Пароль</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="mb-5 h-11 w-full rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60" />
        {error ? <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
        <Button className="w-full" onClick={() => void submit()} disabled={loading}>
          <Lock size={18} />
          {loading ? "Проверяем доступ..." : "Войти в рабочее пространство"}
        </Button>
        <div className="mt-4 grid gap-2 text-xs text-nexus-muted">
          <button className="rounded-md border border-nexus-border p-2 text-left hover:border-nexus-red/60" onClick={() => useAccount("admin@nexusrm.ai", "admin123")}>Админ: Алексей Орлов</button>
          <button className="rounded-md border border-nexus-border p-2 text-left hover:border-nexus-red/60" onClick={() => useAccount("manager@nexusrm.ai", "manager123")}>Менеджер: Мария Чен</button>
          <button className="rounded-md border border-nexus-border p-2 text-left hover:border-nexus-red/60" onClick={() => useAccount("viewer@nexusrm.ai", "viewer123")}>Просмотр: Илья Соколов</button>
        </div>
      </Card>
    </div>
  );
}

function Dashboard({ kpis }: { kpis: { label: string; value: string; delta: string; icon: typeof Users }[] }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-nexus-muted">{kpi.label}</div>
              <kpi.icon className="text-nexus-red" size={18} />
            </div>
            <div className="text-2xl font-black tracking-normal">{kpi.value}</div>
            <div className="mt-2 text-xs text-red-200">{kpi.delta}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Прогноз выручки</h2>
              <p className="text-sm text-nexus-muted">AI-прогноз на месяц: {money(42000)}</p>
            </div>
            <Badge tone="red">AI прогноз</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#FF2D2D" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#FF2D2D" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2A2A32" vertical={false} />
                <XAxis dataKey="month" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ background: "#111116", border: "1px solid #2A2A32", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="#FF2D2D" fill="url(#rev)" strokeWidth={3} />
                <Area type="monotone" dataKey="forecast" stroke="#A1A1AA" fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">AI уведомления</h2>
          <div className="space-y-3">
            {[
              "Клиент в зоне риска: нет активности 14 дней",
              "Вероятность закрытия сделки: 72%",
              "Рекомендованный шаг: отправить письмо сегодня",
            ].map((alert) => (
              <div key={alert} className="rounded-md border border-red-500/20 bg-red-500/8 p-3 text-sm text-zinc-200">
                <Sparkles className="mb-2 text-nexus-red" size={16} />
                {alert}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Воронка конверсии</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionSeries}>
                <CartesianGrid stroke="#2A2A32" vertical={false} />
                <XAxis dataKey="stage" stroke="#A1A1AA" />
                <YAxis stroke="#A1A1AA" />
                <Tooltip contentStyle={{ background: "#111116", border: "1px solid #2A2A32", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#E50914" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Последние активности</h2>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity} className="flex gap-3 rounded-md border border-nexus-border bg-white/[0.025] p-3 text-sm text-zinc-300">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-nexus-red" />
                {activity}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function ClientsPage({ onSelect }: { onSelect: (client: (typeof clients)[number]) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {clients.map((client) => (
        <Card key={client.id} className="p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black">{client.name}</h2>
              <p className="text-sm text-nexus-muted">{client.industry}</p>
            </div>
            <Badge tone={client.status === "at_risk" ? "red" : client.status === "active" ? "green" : "default"}>{clientStatusLabels[client.status]}</Badge>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">{client.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
          <div className="mb-4 text-sm text-zinc-300">Менеджер: {client.manager}</div>
          <div className="mb-5 h-2 rounded-full bg-white/[0.06]">
            <div className="h-2 rounded-full bg-nexus-red" style={{ width: `${client.healthScore}%` }} />
          </div>
          <GhostButton className="w-full" onClick={() => onSelect(client)}>
            Открыть профиль
            <ChevronRight size={16} />
          </GhostButton>
        </Card>
      ))}
    </div>
  );
}

function ClientProfile({ client }: { client: (typeof clients)[number] }) {
  const clientDeals = deals.filter((deal) => deal.client === client.name);
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-6">
        <h2 className="text-2xl font-black">{client.name}</h2>
        <p className="mt-1 text-nexus-muted">{client.industry}</p>
        <div className="mt-5 flex flex-wrap gap-2">{client.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
        <div className="mt-6 space-y-3 text-sm text-zinc-300">
          <p>Статус: {clientStatusLabels[client.status]}</p>
          <p>Ответственный менеджер: {client.manager}</p>
          <p>Контакты: {client.contacts.join(", ")}</p>
          <p>Последняя активность: {client.lastActivity}</p>
        </div>
        <Card className="mt-6 border-red-500/25 bg-red-500/8 p-4">
          <div className="mb-2 text-sm font-bold text-red-100">AI health score клиента</div>
          <div className="text-4xl font-black">{client.healthScore}%</div>
          <p className="mt-2 text-sm text-nexus-muted">{client.notes}</p>
        </Card>
      </Card>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">Связанные сделки</h3>
        <div className="space-y-3">
          {clientDeals.length ? clientDeals.map((deal) => <DealRow key={deal.id} deal={deal} />) : <EmptyState title="Сделок пока нет" detail="Создайте первую возможность из профиля клиента." />}
        </div>
      </Card>
    </div>
  );
}

function DealsPage({ deals: dealsProp }: { deals: typeof deals }) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-6">
      {stages.map((stage) => {
        const stageDeals = dealsProp.filter((deal) => deal.stage === stage);
        return (
          <Card key={stage} className="min-h-80 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">{stage}</h2>
              <Badge>{stageDeals.length}</Badge>
            </div>
            <div className="space-y-3">
              {stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
              {!stageDeals.length && <EmptyState title="Пусто" detail="Переместите сделку сюда." compact />}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DealCard({ deal }: { deal: (typeof deals)[number] }) {
  return (
    <div className="rounded-md border border-nexus-border bg-black/30 p-3">
      <div className="mb-2 text-sm font-bold">{deal.title}</div>
      <div className="mb-3 text-xs text-nexus-muted">{deal.client}</div>
      <div className="flex items-center justify-between text-xs">
        <span>{money(deal.amount)}</span>
        <Badge tone={deal.risk === "high" ? "red" : deal.risk === "low" ? "green" : "amber"}>{deal.probability}%</Badge>
      </div>
    </div>
  );
}

function NewDealModal({ onClose, onCreate }: { onClose: () => void; onCreate: (deal: (typeof deals)[number]) => void }) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState(clients[0].name);
  const [stage, setStage] = useState<DealStage>(stages[0]);
  const [amount, setAmount] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [probability, setProbability] = useState("50");
  const [error, setError] = useState("");

  function submit() {
    if (!title.trim()) {
      setError("Укажите название сделки");
      return;
    }
    const amountNum = Number(amount) || 0;
    const probabilityNum = Math.min(100, Math.max(0, Number(probability) || 0));
    onCreate({
      id: `d${Date.now()}`,
      title: title.trim(),
      client,
      stage,
      amount: amountNum,
      closeDate: closeDate.trim() || "Не указано",
      probability: probabilityNum,
      aiScore: Math.round(probabilityNum * 0.9),
      risk: probabilityNum >= 60 ? "low" : probabilityNum >= 35 ? "medium" : "high",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Новая сделка</h2>
          <GhostButton className="h-8 px-3" onClick={onClose}>Закрыть</GhostButton>
        </div>
        <div className="space-y-3">
          <Field label="Название">
            <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Внедрение CRM" />
          </Field>
          <Field label="Клиент">
            <select className={inputClass} value={client} onChange={(event) => setClient(event.target.value)}>
              {clients.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Стадия">
              <select className={inputClass} value={stage} onChange={(event) => setStage(event.target.value as DealStage)}>
                {stages.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Сумма, $">
              <input className={inputClass} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="42000" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата закрытия">
              <input className={inputClass} value={closeDate} onChange={(event) => setCloseDate(event.target.value)} placeholder="28 июня" />
            </Field>
            <Field label="Вероятность, %">
              <input className={inputClass} type="number" min="0" max="100" value={probability} onChange={(event) => setProbability(event.target.value)} />
            </Field>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button className="w-full" onClick={submit}><Plus size={18} />Создать сделку</Button>
        </div>
      </Card>
    </div>
  );
}

const inputClass = "h-10 w-full rounded-md border border-nexus-border bg-white/[0.03] px-3 text-sm outline-none ring-nexus-red/60 placeholder:text-zinc-600 focus:ring-2";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase text-nexus-muted">{label}</span>
      {children}
    </label>
  );
}

function DealRow({ deal }: { deal: (typeof deals)[number] }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-nexus-border bg-white/[0.025] p-4">
      <div>
        <div className="font-bold">{deal.title}</div>
        <div className="text-sm text-nexus-muted">{deal.stage} · закрытие {deal.closeDate}</div>
      </div>
      <div className="text-right">
        <div className="font-bold">{money(deal.amount)}</div>
        <div className="text-sm text-red-200">AI {deal.aiScore}</div>
      </div>
    </div>
  );
}

function TasksPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {(["todo", "in_progress", "done"] as const).map((status) => (
        <Card key={status} className="p-5">
          <h2 className="mb-4 text-lg font-bold">{taskStatusLabels[status]}</h2>
          <div className="space-y-3">
            {tasks.filter((task) => task.status === status).map((task) => (
              <div key={task.id} className="rounded-md border border-nexus-border bg-white/[0.025] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-bold">{task.title}</div>
                  <Badge tone={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : "default"}>{priorityLabels[task.priority]}</Badge>
                </div>
                <div className="text-sm text-nexus-muted">{task.client} · {task.due}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AiPage() {
  const [message, setMessage] = useState("Какие сделки сейчас самые рискованные и что делать менеджеру?");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Привет. Я AI Ассистент NexusRM. Задайте вопрос по клиентам, сделкам, задачам или рискам.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setChat((items) => [...items, { role: "user", text: trimmed }]);
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "AI сервис временно недоступен");
      setChat((items) => [...items, { role: "assistant", text: data.answer }]);
    } catch (error) {
      setChat((items) => [
        ...items,
        {
          role: "assistant",
          text: `Не удалось получить ответ от AI. ${error instanceof Error ? error.message : "Проверьте backend и DEEPSEEK_API_KEY."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function addDemoRecommendations() {
    setChat((items) => [
      ...items,
      {
        role: "assistant",
        text: "Рекомендации: 1) RedForge обработать сегодня, потому что 14 дней нет активности. 2) VectorCloud довести до procurement-встречи. 3) Northstar квалифицировать по бюджету и срокам delivery-команды.",
      },
    ]);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-6">
        <Bot className="mb-4 text-nexus-red" size={34} />
        <h2 className="text-2xl font-black">AI sales copilot</h2>
        <p className="mt-2 text-nexus-muted">Демо-слой интеллекта для оценки сделок, поиска рисков, генерации писем и прогноза выручки.</p>
        <Button className="mt-6" onClick={addDemoRecommendations}>
          <RefreshCw size={18} />
          Сгенерировать рекомендации
        </Button>
      </Card>
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="text-nexus-red" size={22} />
          <h3 className="text-lg font-bold">Чат с AI Ассистентом</h3>
        </div>
        <div className="mb-4 max-h-96 space-y-3 overflow-y-auto pr-1">
          {chat.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={cn(
                "rounded-md border p-4 text-sm leading-6",
                item.role === "user" ? "ml-8 border-zinc-700 bg-white/[0.04]" : "mr-8 border-red-500/20 bg-red-500/8",
              )}
            >
              <div className="mb-1 text-xs font-bold uppercase text-nexus-muted">{item.role === "user" ? "Вы" : "Nexus AI"}</div>
              {item.text}
            </div>
          ))}
          {loading ? <div className="rounded-md border border-nexus-border bg-white/[0.025] p-4 text-sm text-nexus-muted">AI думает...</div> : null}
        </div>
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void sendMessage();
            }}
            className="min-w-0 flex-1 rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60"
            placeholder="Спросите про клиентов, сделки или риски..."
          />
          <Button onClick={() => void sendMessage()} disabled={loading}>
            <Send size={18} />
            Отправить
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ApiDocsPage() {
  const endpoints = [
    ["POST", "/api/auth/login", "Вход пользователя, выдача access/refresh JWT"],
    ["POST", "/api/auth/refresh", "Обновление access token"],
    ["GET", "/api/auth/me", "Проверка текущего пользователя"],
    ["GET", "/api/admin/overview", "Сводка админ-панели"],
    ["GET", "/api/admin/users", "Пользователи, роли, статусы и профили"],
    ["PATCH", "/api/admin/settings", "Настройки рабочего пространства"],
    ["POST", "/api/admin/api-keys", "Выпуск публичного API-ключа"],
    ["POST", "/api/ai/chat", "AI чат по CRM-контексту"],
    ["GET", "/api/ai/insights", "AI-инсайты, риски и score"],
    ["POST", "/api/public/leads", "Создать входящий лид"],
    ["GET", "/api/public/clients", "Получить список клиентов"],
    ["POST", "/api/public/tasks", "Создать задачу"],
    ["GET", "/api/public/deals", "Получить сделки"],
    ["POST", "/api/public/webhooks", "Зарегистрировать webhook"],
  ];

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <Code2 className="mb-4 text-nexus-red" size={32} />
        <h2 className="text-2xl font-black">Документация API</h2>
        <p className="mt-2 max-w-3xl text-nexus-muted">
          Эта страница доступна внутри frontend даже если Swagger временно недоступен. Swagger открывается по адресу `/api/docs`, когда backend контейнер запущен.
        </p>
        <a className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-nexus-red" href={`${apiBase}/api/docs`} target="_blank" rel="noreferrer">
          Открыть Swagger документацию
          <ChevronRight size={16} />
        </a>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">Рабочие endpoints</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {endpoints.map(([method, path, description]) => (
            <div key={path} className="rounded-md border border-nexus-border bg-black/35 p-4">
              <div className="font-mono text-sm text-red-100">{method} {path}</div>
              <div className="mt-2 text-sm text-nexus-muted">{description}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-lg font-bold">Пример входа и вызова защищенного API</h3>
        <pre className="overflow-x-auto rounded-md border border-nexus-border bg-black/50 p-4 text-xs text-red-100">{`curl -X POST ${apiBase}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@nexusrm.ai","password":"admin123"}'

curl ${apiBase}/api/admin/overview \\
  -H "Authorization: Bearer <ACCESS_TOKEN>"`}</pre>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-lg font-bold">Если `/api/docs` показывает 502</h3>
        <p className="text-sm leading-6 text-nexus-muted">
          Это означает, что Cloudflare видит домен, но origin/backend не отвечает. Повторите серверную команду установки после последнего обновления репозитория и проверьте логи backend/Caddy.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md border border-nexus-border bg-black/50 p-4 text-xs text-red-100">{`cd /opt/nexusrm
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend caddy`}</pre>
      </Card>
    </div>
  );
}

type AdminOverview = Record<"users" | "clients" | "deals" | "tasks" | "apiKeys" | "webhooks" | "auditLogs", number>;
type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  title?: string;
  department?: string;
  phone?: string;
  lastLoginAt?: string;
};
type WorkspaceSettings = {
  workspaceName: string;
  timezone: string;
  currency: string;
  aiEnabled: boolean;
  publicApiEnabled: boolean;
  registrationEnabled: boolean;
  defaultRole: Role;
};
type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
  owner?: { email: string; name: string } | null;
};
type UserForm = {
  email: string;
  name: string;
  password: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  title: string;
  department: string;
  phone: string;
};
const emptyUserForm: UserForm = {
  email: "",
  name: "",
  password: "manager123",
  role: "manager",
  status: "active",
  title: "",
  department: "",
  phone: "",
};

function SettingsPage({ session, request }: { session: Session; request: AuthedRequest }) {
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<keyof WorkspaceSettings | "">("");

  useEffect(() => {
    if (session.user.role !== "admin") return;
    void request<WorkspaceSettings>("/api/admin/settings")
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить настройки"));
  }, [request, session.user.role]);

  async function updateSetting<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setError("");
    setBusyKey(key);
    try {
      const next = await request<WorkspaceSettings>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
      setSettings(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить настройки");
    } finally {
      setBusyKey("");
    }
  }

  const canEdit = session.user.role === "admin";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black">Настройки пространства</h2>
        {error ? <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{error}</div> : null}
        {!canEdit ? <div className="mb-4 rounded-md border border-nexus-border bg-white/[0.025] p-3 text-sm text-nexus-muted">Изменять системные настройки может только администратор.</div> : null}
        <Toggle label="Темная тема по умолчанию" enabled disabled />
        <Toggle label="AI уведомления о рисках" enabled={settings.aiEnabled} disabled={!canEdit || busyKey === "aiEnabled"} busy={busyKey === "aiEnabled"} onToggle={() => void updateSetting("aiEnabled", !settings.aiEnabled)} />
        <Toggle label="Доступ к публичному API" enabled={settings.publicApiEnabled} disabled={!canEdit || busyKey === "publicApiEnabled"} busy={busyKey === "publicApiEnabled"} onToggle={() => void updateSetting("publicApiEnabled", !settings.publicApiEnabled)} />
        <Toggle label="Самостоятельная регистрация" enabled={settings.registrationEnabled} disabled={!canEdit || busyKey === "registrationEnabled"} busy={busyKey === "registrationEnabled"} onToggle={() => void updateSetting("registrationEnabled", !settings.registrationEnabled)} />
        {canEdit ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-zinc-300">
              Валюта
              <select value={settings.currency} onChange={(event) => void updateSetting("currency", event.target.value)} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60">
                <option value="RUB">RUB · рубли</option>
                <option value="USD">USD · доллары</option>
                <option value="EUR">EUR · евро</option>
              </select>
            </label>
            <label className="text-sm text-zinc-300">
              Роль по умолчанию
              <select value={settings.defaultRole} onChange={(event) => void updateSetting("defaultRole", event.target.value as Role)} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60">
                <option value="manager">manager</option>
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
            </label>
          </div>
        ) : null}
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black">Профиль аккаунта</h2>
        <div className="space-y-3 text-sm">
          <InfoRow label="Имя" value={session.user.name} />
          <InfoRow label="Email" value={session.user.email} />
          <InfoRow label="Роль" value={session.user.role} />
          <InfoRow label="Workspace" value={settings.workspaceName} />
          <InfoRow label="Часовой пояс" value={settings.timezone} />
          <InfoRow label="Валюта" value={settings.currency} />
        </div>
      </Card>
    </div>
  );
}

function AdminPage({ session, request }: { session: Session; request: AuthedRequest }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState("");
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [savingUserId, setSavingUserId] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingSetting, setSavingSetting] = useState<keyof WorkspaceSettings | "">("");
  const [togglingKeyId, setTogglingKeyId] = useState("");

  useEffect(() => {
    if (session.user.role !== "admin") return;
    void Promise.all([
      request<AdminOverview>("/api/admin/overview"),
      request<AdminUser[]>("/api/admin/users"),
      request<WorkspaceSettings>("/api/admin/settings"),
      request<ApiKeyInfo[]>("/api/admin/api-keys"),
    ])
      .then(([nextOverview, nextUsers, nextSettings, nextApiKeys]) => {
        setOverview(nextOverview);
        setUsers(nextUsers);
        setSettings(nextSettings);
        setApiKeys(nextApiKeys);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить админ-панель"));
  }, [request, session.user.role]);

  async function createKey() {
    setError("");
    try {
      const result = await request<{ apiKey: string; record: ApiKeyInfo }>("/api/admin/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "Ключ админ-панели" }),
      });
      setNewKey(result.apiKey);
      setApiKeys((items) => [result.record, ...items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать ключ");
    }
  }

  async function toggleKey(id: string) {
    setError("");
    setTogglingKeyId(id);
    try {
      const next = await request<ApiKeyInfo>(`/api/admin/api-keys/${id}/toggle`, { method: "PATCH" });
      setApiKeys((items) => items.map((item) => (item.id === id ? { ...item, isActive: next.isActive } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось переключить API ключ");
    } finally {
      setTogglingKeyId("");
    }
  }

  async function createUser() {
    setError("");
    setCreatingUser(true);
    try {
      const created = await request<AdminUser>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(userForm),
      });
      setUsers((items) => [...items, created]);
      setUserForm(emptyUserForm);
      setOverview((current) => current ? { ...current, users: current.users + 1 } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать пользователя");
    } finally {
      setCreatingUser(false);
    }
  }

  async function updateUser(id: string, patch: Partial<AdminUser>) {
    setError("");
    setSavingUserId(id);
    try {
      const updated = await request<AdminUser>(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setUsers((items) => items.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить пользователя");
    } finally {
      setSavingUserId("");
    }
  }

  async function updateSetting<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setError("");
    setSavingSetting(key);
    try {
      const next = await request<WorkspaceSettings>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
      setSettings(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить настройку");
    } finally {
      setSavingSetting("");
    }
  }

  if (session.user.role !== "admin") {
    return <EmptyState title="Недостаточно прав" detail="Админ-панель доступна только пользователям с ролью admin." />;
  }

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        {(overview ? Object.entries(overview) : []).map(([label, value]) => (
          <Card key={label} className="p-4">
            <div className="text-xs uppercase text-nexus-muted">{label}</div>
            <div className="mt-2 text-2xl font-black">{value}</div>
          </Card>
        ))}
      </section>

      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-black">Пользователи и роли</h2>
          <Button onClick={() => void createUser()} disabled={creatingUser || !userForm.email || !userForm.name || userForm.password.length < 6}>
            <Plus size={18} />
            {creatingUser ? "Создаем..." : "Добавить пользователя"}
          </Button>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TextInput label="Имя" value={userForm.name} onChange={(value) => setUserForm((form) => ({ ...form, name: value }))} />
          <TextInput label="Email" value={userForm.email} onChange={(value) => setUserForm((form) => ({ ...form, email: value }))} />
          <TextInput label="Пароль" value={userForm.password} onChange={(value) => setUserForm((form) => ({ ...form, password: value }))} type="password" />
          <TextInput label="Должность" value={userForm.title} onChange={(value) => setUserForm((form) => ({ ...form, title: value }))} />
          <TextInput label="Отдел" value={userForm.department} onChange={(value) => setUserForm((form) => ({ ...form, department: value }))} />
          <TextInput label="Телефон" value={userForm.phone} onChange={(value) => setUserForm((form) => ({ ...form, phone: value }))} />
          <label className="text-sm text-zinc-300">
            Роль
            <select value={userForm.role} onChange={(event) => setUserForm((form) => ({ ...form, role: event.target.value as Role }))} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60">
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            Статус
            <select value={userForm.status} onChange={(event) => setUserForm((form) => ({ ...form, status: event.target.value as UserForm["status"] }))} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60">
              <option value="active">active</option>
              <option value="invited">invited</option>
              <option value="disabled">disabled</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-nexus-muted">
              <tr><th className="p-3">Пользователь</th><th className="p-3">Должность</th><th className="p-3">Роль</th><th className="p-3">Статус</th><th className="p-3">Последний вход</th><th className="p-3">Действия</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-nexus-border">
                  <td className="p-3">
                    <input value={user.name} onChange={(event) => setUsers((items) => items.map((item) => item.id === user.id ? { ...item, name: event.target.value } : item))} className="mb-2 h-9 w-full rounded-md border border-nexus-border bg-black/40 px-2 outline-none focus:ring-2 focus:ring-nexus-red/60" />
                    <div className="text-xs text-nexus-muted">{user.email}</div>
                  </td>
                  <td className="p-3">
                    <input value={user.title ?? ""} onChange={(event) => setUsers((items) => items.map((item) => item.id === user.id ? { ...item, title: event.target.value } : item))} className="mb-2 h-9 w-full rounded-md border border-nexus-border bg-black/40 px-2 outline-none focus:ring-2 focus:ring-nexus-red/60" placeholder="Должность" />
                    <input value={user.department ?? ""} onChange={(event) => setUsers((items) => items.map((item) => item.id === user.id ? { ...item, department: event.target.value } : item))} className="h-9 w-full rounded-md border border-nexus-border bg-black/40 px-2 outline-none focus:ring-2 focus:ring-nexus-red/60" placeholder="Отдел" />
                  </td>
                  <td className="p-3">
                    <select value={user.role} onChange={(event) => void updateUser(user.id, { ...user, role: event.target.value as Role })} className="h-9 w-full rounded-md border border-nexus-border bg-black/40 px-2 outline-none focus:ring-2 focus:ring-nexus-red/60">
                      <option value="admin">admin</option>
                      <option value="manager">manager</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select value={user.status} onChange={(event) => void updateUser(user.id, { ...user, status: event.target.value as AdminUser["status"] })} className="h-9 w-full rounded-md border border-nexus-border bg-black/40 px-2 outline-none focus:ring-2 focus:ring-nexus-red/60">
                      <option value="active">active</option>
                      <option value="invited">invited</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </td>
                  <td className="p-3">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ru-RU") : "еще не входил"}</td>
                  <td className="p-3">
                    <Button className="h-9" disabled={savingUserId === user.id} onClick={() => void updateUser(user.id, user)}>
                      {savingUserId === user.id ? "Сохраняем..." : "Сохранить"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-black">Системные настройки</h2>
          <div className="space-y-3 text-sm">
            <InfoRow label="Рабочее пространство" value={settings.workspaceName} />
            <InfoRow label="Часовой пояс" value={settings.timezone} />
            <InfoRow label="Валюта" value={settings.currency} />
            <InfoRow label="Роль по умолчанию" value={settings.defaultRole} />
            <Toggle label="AI" enabled={settings.aiEnabled} busy={savingSetting === "aiEnabled"} disabled={savingSetting === "aiEnabled"} onToggle={() => void updateSetting("aiEnabled", !settings.aiEnabled)} />
            <Toggle label="Публичный API" enabled={settings.publicApiEnabled} busy={savingSetting === "publicApiEnabled"} disabled={savingSetting === "publicApiEnabled"} onToggle={() => void updateSetting("publicApiEnabled", !settings.publicApiEnabled)} />
            <Toggle label="Регистрация" enabled={settings.registrationEnabled} busy={savingSetting === "registrationEnabled"} disabled={savingSetting === "registrationEnabled"} onToggle={() => void updateSetting("registrationEnabled", !settings.registrationEnabled)} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">API ключи</h2>
            <Button onClick={() => void createKey()}><Plus size={18} />Создать ключ</Button>
          </div>
          {newKey ? <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-100">{newKey}</div> : null}
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="rounded-md border border-nexus-border bg-black/35 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div><div className="font-bold">{key.name}</div><div className="font-mono text-xs text-nexus-muted">{key.prefix}...</div></div>
                  <button disabled={togglingKeyId === key.id} onClick={() => void toggleKey(key.id)} className="rounded-md border border-nexus-border px-3 py-2 text-xs font-bold transition hover:border-nexus-red/60 disabled:opacity-60">
                    <Badge tone={key.isActive ? "green" : "red"}>{key.isActive ? "активен" : "отключен"}</Badge>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-nexus-border bg-white/[0.025] p-3">
      <span className="text-nexus-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm text-zinc-300">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60" />
    </label>
  );
}

function Toggle({ label, enabled, onToggle, disabled, busy }: { label: string; enabled: boolean; onToggle?: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || !onToggle}
      aria-pressed={enabled}
      className="mb-3 flex w-full items-center justify-between rounded-md border border-nexus-border bg-white/[0.025] p-4 text-left transition hover:border-nexus-red/60 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="text-sm">{label}</span>
      <span className={cn("h-6 w-11 rounded-full p-1", enabled ? "bg-nexus-red" : "bg-zinc-700")}>
        <span className={cn("block size-4 rounded-full bg-white transition", enabled && "translate-x-5", busy && "opacity-60")} />
      </span>
    </button>
  );
}

function EmptyState({ title, detail, compact }: { title: string; detail: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-md border border-dashed border-nexus-border bg-white/[0.02] text-center text-nexus-muted", compact ? "p-3 text-xs" : "p-8")}>
      <div className="font-bold text-zinc-300">{title}</div>
      <div className="mt-1">{detail}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Skeleton className="h-44" />
      <Skeleton className="h-44" />
      <Skeleton className="h-44" />
    </div>
  );
}
