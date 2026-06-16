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
  LifeBuoy,
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
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getApiErrorMessage, isExpiredTokenMessage } from "./lib/api";
import {
  backendDealStageByUi,
  buildRevenueSeries,
  calculateConversionRate,
  clientDraftToPayload,
  clientToUpdatePayload,
  dealDraftToPayload,
  isActiveDeal,
  isDueToday,
  mapApiClient,
  mapApiDeal,
  mapApiTask,
  moveDealStage,
  moveTaskStatus,
  stages,
  taskDraftToPayload,
  type ClientDraft,
  type ClientStatus,
  type CrmClient,
  type CrmDeal,
  type CrmTask,
  type DealDraft,
  type DealRescuePlan,
  type DealStage,
  type RevenueSeriesPoint,
  type TaskDraft,
  type TaskPriority,
  type TaskStatus,
} from "./lib/crm";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
type DashboardStats = {
  clients: CrmClient[];
  deals: CrmDeal[];
  tasks: CrmTask[];
  totalPipeline: number;
  weightedForecast: number;
  atRiskClients: CrmClient[];
  urgentTasks: CrmTask[];
  wonRevenue: number;
};

type NotificationItem = {
  id: string;
  kind: "urgent" | "today" | "risk";
  title: string;
  detail: string;
};

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
    throw new Error(getApiErrorMessage(data));
  }
  return data as T;
}

function isExpiredTokenError(error: unknown) {
  return error instanceof Error && isExpiredTokenMessage(error.message);
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
  const [clientList, setClientList] = useState<CrmClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [dealList, setDealList] = useState<CrmDeal[]>([]);
  const [taskList, setTaskList] = useState<CrmTask[]>([]);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [rescueDeal, setRescueDeal] = useState<CrmDeal | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmError, setCrmError] = useState("");

  useEffect(() => {
    if (!session) return;
    let active = true;
    setCrmLoading(true);
    setCrmError("");
    Promise.all([
      authenticatedRequest<unknown[]>("/api/clients"),
      authenticatedRequest<unknown[]>("/api/deals"),
      authenticatedRequest<unknown[]>("/api/tasks"),
    ])
      .then(([nextClients, nextDeals, nextTasks]) => {
        if (!active) return;
        const mappedClients = nextClients.map((client) => mapApiClient(client as Parameters<typeof mapApiClient>[0]));
        const mappedDeals = nextDeals.map((deal) => mapApiDeal(deal as Parameters<typeof mapApiDeal>[0]));
        const mappedTasks = nextTasks.map((task) => mapApiTask(task as Parameters<typeof mapApiTask>[0]));
        setClientList(mappedClients);
        setDealList(mappedDeals);
        setTaskList(mappedTasks);
        setSelectedClient((current) => mappedClients.find((client) => client.id === current?.id) ?? mappedClients[0] ?? null);
      })
      .catch((error) => {
        if (active) setCrmError(error instanceof Error ? error.message : "Не удалось загрузить CRM данные");
      })
      .finally(() => {
        if (active) setCrmLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  async function createDeal(draft: DealDraft) {
    setCrmError("");
    const created = await authenticatedRequest<unknown>("/api/deals", {
      method: "POST",
      body: JSON.stringify(dealDraftToPayload(draft)),
    });
    setDealList((prev) => [mapApiDeal(created as Parameters<typeof mapApiDeal>[0]), ...prev]);
    setNewDealOpen(false);
    setPage("Сделки");
  }

  async function createClient(draft: ClientDraft) {
    setCrmError("");
    const created = await authenticatedRequest<unknown>("/api/clients", {
      method: "POST",
      body: JSON.stringify(clientDraftToPayload(draft)),
    });
    const client = mapApiClient(created as Parameters<typeof mapApiClient>[0]);
    setClientList((prev) => [client, ...prev]);
    setSelectedClient(client);
    setNewClientOpen(false);
    setPage("Клиенты");
  }

  async function updateClient(client: CrmClient) {
    setCrmError("");
    const updated = await authenticatedRequest<unknown>(`/api/clients/${client.id}`, {
      method: "PATCH",
      body: JSON.stringify(clientToUpdatePayload(client)),
    });
    const next = mapApiClient(updated as Parameters<typeof mapApiClient>[0]);
    setClientList((items) => items.map((item) => (item.id === next.id ? next : item)));
    setSelectedClient(next);
    return next;
  }

  async function createTask(draft: TaskDraft) {
    setCrmError("");
    const created = await authenticatedRequest<unknown>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(taskDraftToPayload(draft)),
    });
    setTaskList((prev) => [mapApiTask(created as Parameters<typeof mapApiTask>[0]), ...prev]);
    setNewTaskOpen(false);
    setPage("Задачи");
  }

  async function rescueDealPlan(deal: CrmDeal) {
    return authenticatedRequest<DealRescuePlan>(`/api/ai/deals/${deal.id}/rescue`, { method: "POST" });
  }

  async function createRescueTask(plan: DealRescuePlan) {
    setCrmError("");
    const created = await authenticatedRequest<unknown>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: plan.recommendedTask.title,
        priority: plan.recommendedTask.priority,
        status: "todo",
        clientId: plan.recommendedTask.clientId,
        dealId: plan.recommendedTask.dealId,
        dueDate: new Date().toISOString(),
      }),
    });
    setTaskList((prev) => [mapApiTask(created as Parameters<typeof mapApiTask>[0]), ...prev]);
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    setTaskList((prev) => moveTaskStatus(prev, taskId, status));
    try {
      await authenticatedRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : "Не удалось сохранить статус задачи");
    }
  }

  async function moveDeal(dealId: string, stage: DealStage) {
    setDealList((prev) => moveDealStage(prev, dealId, stage));
    try {
      await authenticatedRequest(`/api/deals/${dealId}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: backendDealStageByUi[stage] }),
      });
    } catch (error) {
      setCrmError(error instanceof Error ? error.message : "Не удалось сохранить стадию сделки");
    }
  }

  const kpis = useMemo(
    () => {
      const activeDeals = dealList.filter(isActiveDeal);
      const todayTasks = taskList.filter((task) => isDueToday(task));
      const urgentTodayTasks = todayTasks.filter((task) => task.priority === "urgent" && task.status !== "done");
      return [
        { label: "Всего клиентов", value: clientList.length.toString(), delta: `${clientList.filter((client) => client.status === "active").length} активных`, icon: Users },
        { label: "Активные сделки", value: activeDeals.length.toString(), delta: `${dealList.length} всего`, icon: KanbanSquare },
        { label: "Pipeline", value: money(activeDeals.reduce((sum, deal) => sum + deal.amount, 0)), delta: "активная воронка", icon: BarChart3 },
        { label: "Конверсия", value: `${calculateConversionRate(dealList)}%`, delta: "won / closed", icon: Activity },
        { label: "Задачи на сегодня", value: todayTasks.length.toString(), delta: `${urgentTodayTasks.length} срочно`, icon: Bell },
      ];
    },
    [clientList, dealList, taskList],
  );

  const dashboardStats = useMemo<DashboardStats>(() => {
    const activeDeals = dealList.filter(isActiveDeal);
    return {
      clients: clientList,
      deals: dealList,
      tasks: taskList,
      totalPipeline: activeDeals.reduce((sum, deal) => sum + deal.amount, 0),
      weightedForecast: activeDeals.reduce((sum, deal) => sum + deal.amount * (deal.probability / 100), 0),
      atRiskClients: clientList.filter((client) => client.status === "at_risk" || client.healthScore < 60),
      urgentTasks: taskList.filter((task) => task.priority === "urgent" && task.status !== "done"),
      wonRevenue: dealList.filter((deal) => deal.stage === "Выиграна").reduce((sum, deal) => sum + deal.amount, 0),
    };
  }, [clientList, dealList, taskList]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];
    taskList
      .filter((task) => task.priority === "urgent" && task.status !== "done")
      .forEach((task) => items.push({ id: `task-${task.id}`, kind: "urgent", title: task.title, detail: `Срочная задача · ${task.due}` }));
    taskList
      .filter((task) => isDueToday(task) && task.priority !== "urgent" && task.status !== "done")
      .forEach((task) => items.push({ id: `today-${task.id}`, kind: "today", title: task.title, detail: "Задача на сегодня" }));
    clientList
      .filter((client) => client.status === "at_risk" || client.healthScore < 60)
      .forEach((client) => items.push({ id: `client-${client.id}`, kind: "risk", title: client.name, detail: `Клиент в зоне риска · health ${client.healthScore}` }));
    return items;
  }, [clientList, taskList]);

  function switchPage(next: Page) {    setMobileNavOpen(false);
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
    setSessionNotice("");
    localStorage.setItem(sessionKey, JSON.stringify(next));
    setPage("Дашборд");
  }

  async function authenticatedRequest<T>(path: string, options: RequestInit = {}) {
    if (!session) throw new Error("Сессия не найдена");
    try {
      return await apiRequest<T>(path, options, session.accessToken);
    } catch (error) {
      if (!isExpiredTokenError(error)) throw error;
      try {
        const refreshed = await apiRequest<Session>("/api/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        setSession(refreshed);
        localStorage.setItem(sessionKey, JSON.stringify(refreshed));
        return apiRequest<T>(path, options, refreshed.accessToken);
      } catch {
        setSession(null);
        localStorage.removeItem(sessionKey);
        setPage("Дашборд");
        setSessionNotice("Сессия истекла. Войдите заново, чтобы продолжить работу.");
        throw new Error("Сессия истекла. Войдите заново.");
      }
    }
  }

  function logout() {
    setSession(null);
    localStorage.removeItem(sessionKey);
    setPage("Дашборд");
  }

  if (!session) return <LoginScreen onLogin={login} notice={sessionNotice} />;

  const visibleNav = nav.filter((item) => session.user.role === "admin" || !["Админ-панель", "Настройки", "API Документация"].includes(item.label));
  const createActionLabel = page === "Задачи" ? "Новая задача" : page === "Клиенты" ? "Новый клиент" : page === "Сделки" || page === "Дашборд" ? "Новая сделка" : "";

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
              <div className="relative hidden shrink-0 sm:block">
                <GhostButton className="size-10 px-0" aria-label="Уведомления" onClick={() => setNotificationsOpen((prev) => !prev)}>
                  <Bell size={18} />
                  {notifications.length > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-nexus-red text-[10px] font-bold text-white">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                  ) : null}
                </GhostButton>
                {notificationsOpen ? (
                  <NotificationsPanel notifications={notifications} onClose={() => setNotificationsOpen(false)} />
                ) : null}
              </div>
              {createActionLabel ? (
                <Button className="shrink-0 px-3 md:px-4" onClick={() => page === "Задачи" ? setNewTaskOpen(true) : page === "Клиенты" ? setNewClientOpen(true) : setNewDealOpen(true)}>
                  <Plus size={18} />
                  <span className="hidden sm:inline">{createActionLabel}</span>
                </Button>
              ) : null}
              <GhostButton className="size-10 shrink-0 px-0" onClick={logout} aria-label="Выйти">
                <LogOut size={18} />
              </GhostButton>
            </div>
          </header>

          <div className="p-4 md:p-7">
            {loading ? <LoadingState /> : null}
            {crmError ? <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{crmError}</div> : null}
            {crmLoading && !loading ? <LoadingState /> : null}
            {!loading && !crmLoading && page === "Дашборд" && <Dashboard kpis={kpis} stats={dashboardStats} />}
            {!loading && page === "Клиенты" && <ClientsPage clients={clientList} onCreateClient={() => setNewClientOpen(true)} onSelect={(client) => { setSelectedClient(client); switchPage("Профиль клиента"); }} />}
            {!loading && page === "Профиль клиента" && (selectedClient ? <ClientProfile client={selectedClient} deals={dealList} onUpdateClient={updateClient} /> : <EmptyState title="Клиент не выбран" detail="Откройте клиента из списка." />)}
            {!loading && page === "Сделки" && <DealsPage deals={dealList} onMoveDeal={moveDeal} onRescue={setRescueDeal} />}
            {!loading && page === "Задачи" && <TasksPage tasks={taskList} onMoveTask={moveTask} onCreateTask={() => setNewTaskOpen(true)} />}
            {!loading && page === "AI Ассистент" && <AiPage stats={dashboardStats} />}
            {!loading && page === "API Документация" && <ApiDocsPage />}
            {!loading && page === "Настройки" && <SettingsPage session={session} request={authenticatedRequest} />}
            {!loading && page === "Админ-панель" && <AdminPage session={session} request={authenticatedRequest} />}
          </div>
        </main>
      </div>
      {newClientOpen && <NewClientModal onClose={() => setNewClientOpen(false)} onCreate={createClient} />}
      {newDealOpen && <NewDealModal clients={clientList} onClose={() => setNewDealOpen(false)} onCreate={createDeal} />}
      {newTaskOpen && <NewTaskModal clients={clientList} onClose={() => setNewTaskOpen(false)} onCreate={createTask} />}
      {rescueDeal && (
        <DealRescueModal
          deal={rescueDeal}
          loadPlan={rescueDealPlan}
          onCreateTask={createRescueTask}
          onClose={() => setRescueDeal(null)}
        />
      )}
    </div>
  );
}

function NotificationsPanel({ notifications, onClose }: { notifications: NotificationItem[]; onClose: () => void }) {
  const accent: Record<NotificationItem["kind"], string> = {
    urgent: "bg-nexus-red",
    today: "bg-amber-400",
    risk: "bg-orange-400",
  };
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-lg border border-nexus-border bg-nexus-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-nexus-border px-4 py-3">
          <span className="text-sm font-semibold">Уведомления</span>
          <GhostButton className="size-7 px-0" onClick={onClose} aria-label="Закрыть">
            <X size={15} />
          </GhostButton>
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-nexus-muted">Нет новых уведомлений</div>
        ) : (
          <ul className="max-h-96 divide-y divide-nexus-border overflow-y-auto">
            {notifications.map((item) => (
              <li key={item.id} className="flex gap-3 px-4 py-3">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", accent[item.kind])} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="truncate text-xs text-nexus-muted">{item.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function NavLinks({ items, page, onNavigate }: { items: typeof nav; page: Page; onNavigate: (next: Page) => void }) {  return (
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

function LoginScreen({ onLogin, notice }: { onLogin: (email: string, password: string) => Promise<void>; notice?: string }) {
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
        {notice ? <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{notice}</div> : null}
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

function Dashboard({ kpis, stats }: { kpis: { label: string; value: string; delta: string; icon: typeof Users }[]; stats: DashboardStats }) {
  const stageBreakdown = stages.map((stage) => ({
    stage,
    count: stats.deals.filter((deal) => deal.stage === stage).length,
    amount: stats.deals.filter((deal) => deal.stage === stage).reduce((sum, deal) => sum + deal.amount, 0),
  }));
  const revenueSeries = buildRevenueSeries(stats.deals);
  const conversionSeries = stageBreakdown.map((item) => ({ stage: item.stage, value: item.count }));
  const activeDealsCount = stats.deals.filter(isActiveDeal).length;
  const weightedForecast = Math.round(stats.weightedForecast);
  const forecastCoverage = stats.totalPipeline ? Math.round((weightedForecast / stats.totalPipeline) * 100) : 0;
  const taskBreakdown = (["todo", "in_progress", "done"] as const).map((status) => ({
    status,
    count: stats.tasks.filter((task) => task.status === status).length,
  }));
  const activities = [
    stats.atRiskClients[0] ? `${stats.atRiskClients[0].name} в зоне риска: health score ${stats.atRiskClients[0].healthScore}%.` : "Критичных клиентов сейчас нет.",
    stats.deals[0] ? `${stats.deals[0].title}: стадия ${stats.deals[0].stage}, вероятность ${stats.deals[0].probability}%.` : "Добавьте первую сделку, чтобы увидеть pipeline.",
    stats.urgentTasks[0] ? `Срочная задача: ${stats.urgentTasks[0].title}.` : "Срочных задач нет.",
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,45,45,0.16),transparent_36%),radial-gradient(circle_at_85%_18%,rgba(255,255,255,0.08),transparent_24%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-nexus-red/30 bg-nexus-red/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-100">
                <Sparkles size={14} />
                AI sales cockpit
              </div>
              <h2 className="text-2xl font-black leading-tight sm:text-3xl">Фокус на выручку, риски и действия</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Взвешенный прогноз {money(weightedForecast)} покрывает {forecastCoverage}% активной воронки.
                {stats.atRiskClients.length ? ` Внимание на ${stats.atRiskClients[0].name}.` : " Критичных клиентов сейчас нет."}
              </p>
            </div>
            <div className="grid min-w-[260px] grid-cols-2 gap-3">
              <MetricTile label="Pipeline" value={money(stats.totalPipeline)} detail={`${activeDealsCount} активных сделок`} />
              <MetricTile label="Forecast" value={money(weightedForecast)} detail="с учетом вероятности" tone="red" />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Операционная сводка</h2>
              <p className="mt-1 text-sm text-nexus-muted">Ключевые сигналы на сегодня</p>
            </div>
            <Activity className="text-nexus-red" size={20} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MetricTile label="Won revenue" value={money(stats.wonRevenue)} detail="закрытая выручка" tone="green" />
            <MetricTile label="Клиенты в риске" value={stats.atRiskClients.length.toString()} detail={stats.atRiskClients[0]?.name ?? "критичных нет"} tone={stats.atRiskClients.length ? "red" : "green"} />
            <MetricTile label="Срочные задачи" value={stats.urgentTasks.length.toString()} detail={stats.urgentTasks[0]?.title ?? "нет просрочки"} tone={stats.urgentTasks.length ? "amber" : "green"} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="group relative overflow-hidden p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.045]"
          >
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-nexus-muted">{kpi.label}</div>
                <span className="relative flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-red-200 transition group-hover:border-nexus-red/40 group-hover:text-nexus-red">
                  <kpi.icon size={18} />
                </span>
              </div>
              <div className="text-3xl font-black leading-none tracking-tight">{kpi.value}</div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-200">
                <span className="size-1.5 rounded-full bg-nexus-red" />
                {kpi.delta}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="relative overflow-hidden p-5">
          <div className="relative mb-5 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-md border border-nexus-red/30 bg-nexus-red/10 text-nexus-red">
                <TrendingUp size={18} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Прогноз выручки</h2>
                <p className="text-sm text-nexus-muted">Взвешенный прогноз: {money(weightedForecast)}</p>
              </div>
            </div>
            <Badge tone="red">Взвешенный прогноз</Badge>
          </div>
          <RevenueChart data={revenueSeries} />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="text-nexus-red" size={18} />
            <h2 className="text-lg font-bold">Последние активности</h2>
          </div>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity} className="flex gap-3 rounded-md border border-nexus-border bg-white/[0.025] p-3 text-sm leading-5 text-zinc-300 transition hover:border-white/15 hover:bg-white/[0.045]">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-nexus-red" />
                {activity}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="text-nexus-red" size={18} />
            <h2 className="text-lg font-bold">Pipeline по стадиям</h2>
          </div>
          <div className="space-y-3">
            {(() => {
              const maxStageAmount = Math.max(1, ...stageBreakdown.map((item) => item.amount));
              return stageBreakdown.map((item) => (
                <div
                  key={item.stage}
                  className="group rounded-md border border-nexus-border bg-white/[0.025] p-3 transition hover:border-nexus-red/40 hover:bg-white/[0.045]"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold">{item.stage}</span>
                    <span className="text-nexus-muted">{item.count}</span>
                  </div>
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-200 to-nexus-red transition-all"
                      style={{ width: `${Math.max(6, (item.amount / maxStageAmount) * 100)}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium text-red-100">{money(item.amount)}</div>
                </div>
              ));
            })()}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-nexus-red" size={18} />
            <h2 className="text-lg font-bold">Задачи по статусам</h2>
          </div>
          <div className="space-y-3">
            {taskBreakdown.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-md border border-nexus-border bg-white/[0.025] p-3 text-sm transition hover:border-nexus-red/40 hover:bg-white/[0.045]"
              >
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-nexus-red" />
                  {taskStatusLabels[item.status]}
                </span>
                <Badge>{item.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="text-nexus-red" size={18} />
            <h2 className="text-lg font-bold">Воронка конверсии</h2>
          </div>
          <FunnelBars data={conversionSeries} />
        </Card>
      </section>
    </div>
  );
}

function RevenueChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-nexus-border bg-nexus-bg/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 font-bold text-white">{label}</div>
      {payload.filter((row) => typeof row.value === "number").map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: row.color }} />
          <span className="text-nexus-muted">{row.name}:</span>
          <span className="font-semibold text-white">{money(Math.round(row.value))}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueChart({ data }: { data: RevenueSeriesPoint[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF2D2D" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#FF2D2D" stopOpacity={0.25} />
            </linearGradient>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A32" vertical={false} />
          <XAxis dataKey="month" stroke="#71717A" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#2A2A32" }} />
          <YAxis stroke="#71717A" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={64} tickFormatter={(value: number) => money(value)} />
          <Tooltip content={<RevenueChartTooltip />} cursor={{ fill: "rgba(255,45,45,0.06)" }} />
          <Area type="monotone" dataKey="forecast" name="AI-прогноз" stroke="#A1A1AA" strokeWidth={2} strokeDasharray="6 6" fill="url(#forecastFill)" connectNulls dot={{ r: 3, fill: "#0B0B0F", stroke: "#A1A1AA", strokeWidth: 2 }} />
          <Bar dataKey="revenue" name="Выручка" fill="url(#revFill)" radius={[6, 6, 0, 0]} barSize={28} />
          <Line type="monotone" dataKey="revenue" name="Тренд выручки" stroke="#FF2D2D" strokeWidth={3} dot={{ r: 4, fill: "#0B0B0F", stroke: "#FF2D2D", strokeWidth: 3 }} connectNulls legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelBars({ data }: { data: { stage: DealStage; value: number }[] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.stage} className="group rounded-md border border-nexus-border bg-white/[0.025] p-3 transition hover:border-nexus-red/40 hover:bg-white/[0.045]">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold">{item.stage}</span>
            <Badge>{item.value}</Badge>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-nexus-accent to-nexus-red shadow-[0_0_10px_rgba(255,45,45,0.5)] transition-all"
              style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricTile({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "red" | "green" | "amber" }) {
  const tones = {
    default: "border-nexus-border bg-white/[0.025]",
    red: "border-red-500/30 bg-red-500/10",
    green: "border-emerald-500/25 bg-emerald-500/10",
    amber: "border-amber-500/25 bg-amber-500/10",
  };
  const accents = {
    default: "bg-nexus-muted",
    red: "bg-nexus-red",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-md border p-3 transition hover:-translate-y-0.5 hover:border-white/15", tones[tone])}>
      <span className={cn("absolute inset-y-0 left-0 w-1 rounded-l-md", accents[tone])} />
      <div className="pl-1.5">
        <div className="text-xs uppercase tracking-wide text-nexus-muted">{label}</div>
        <div className="mt-1 text-xl font-black">{value}</div>
        <div className="mt-1 text-xs text-zinc-400">{detail}</div>
      </div>
    </div>
  );
}

function NewClientModal({ onClose, onCreate }: { onClose: () => void; onCreate: (client: ClientDraft) => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [tags, setTags] = useState("");
  const [manager, setManager] = useState("Администратор Nexus");
  const [status, setStatus] = useState<ClientStatus>("new");
  const [error, setError] = useState("");

  function submit() {
    if (!name.trim()) {
      setError("Укажите название клиента");
      return;
    }
    if (!industry.trim()) {
      setError("Укажите отрасль клиента");
      return;
    }
    onCreate({ name, industry, tags, manager, status });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Новый клиент</h2>
          <GhostButton className="h-8 px-3" onClick={onClose}>Закрыть</GhostButton>
        </div>
        <div className="space-y-3">
          <Field label="Название компании">
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Acme Systems" />
          </Field>
          <Field label="Отрасль">
            <input className={inputClass} value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Например, B2B SaaS" />
          </Field>
          <Field label="Теги через запятую">
            <input className={inputClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="enterprise, cloud" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Менеджер">
              <input className={inputClass} value={manager} onChange={(event) => setManager(event.target.value)} placeholder="Администратор Nexus" />
            </Field>
            <Field label="Статус">
              <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as ClientStatus)}>
                <option value="new">новый</option>
                <option value="active">активный</option>
                <option value="at_risk">риск</option>
                <option value="lost">потерян</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button className="w-full" onClick={submit}><Plus size={18} />Создать клиента</Button>
        </div>
      </Card>
    </div>
  );
}

function ClientsPage({ clients, onCreateClient, onSelect }: { clients: CrmClient[]; onCreateClient: () => void; onSelect: (client: CrmClient) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-nexus-muted">Добавляйте клиентов вручную и открывайте профиль для сделок, задач и health score.</p>
        <Button onClick={onCreateClient}><Plus size={18} />Новый клиент</Button>
      </div>
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
    </div>
  );
}

function ClientProfile({ client, deals, onUpdateClient }: { client: CrmClient; deals: CrmDeal[]; onUpdateClient: (client: CrmClient) => Promise<CrmClient> }) {
  const clientDeals = deals.filter((deal) => deal.clientId === client.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(client);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(client);
    setError("");
    setEditing(false);
  }, [client.id]);

  async function save() {
    if (!draft.name.trim()) {
      setError("Название клиента обязательно");
      return;
    }
    if (!draft.industry.trim()) {
      setError("Отрасль клиента обязательна");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const next = await onUpdateClient(draft);
      setDraft(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить клиента");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">{client.name}</h2>
            <p className="mt-1 text-nexus-muted">{client.industry}</p>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <GhostButton className="h-9" onClick={() => { setDraft(client); setEditing(false); }}>Отмена</GhostButton>
              <Button className="h-9" disabled={saving} onClick={() => void save()}>{saving ? "Сохраняем..." : "Сохранить"}</Button>
            </div>
          ) : (
            <Button className="h-9" onClick={() => setEditing(true)}>Редактировать</Button>
          )}
        </div>
        {editing ? (
          <div className="grid gap-3">
            <Field label="Название компании">
              <input className={inputClass} value={draft.name} onChange={(event) => setDraft((item) => ({ ...item, name: event.target.value }))} />
            </Field>
            <Field label="Отрасль">
              <input className={inputClass} value={draft.industry} onChange={(event) => setDraft((item) => ({ ...item, industry: event.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Статус">
                <select className={inputClass} value={draft.status} onChange={(event) => setDraft((item) => ({ ...item, status: event.target.value as ClientStatus }))}>
                  <option value="new">новый</option>
                  <option value="active">активный</option>
                  <option value="at_risk">риск</option>
                  <option value="lost">потерян</option>
                </select>
              </Field>
              <Field label="Health score">
                <input className={inputClass} type="number" min="0" max="100" value={draft.healthScore} onChange={(event) => setDraft((item) => ({ ...item, healthScore: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} />
              </Field>
            </div>
            <Field label="Теги через запятую">
              <input className={inputClass} value={draft.tags.join(", ")} onChange={(event) => setDraft((item) => ({ ...item, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} />
            </Field>
            {error ? <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">{client.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
            <div className="mt-6 space-y-3 text-sm text-zinc-300">
              <p>Статус: {clientStatusLabels[client.status]}</p>
              <p>Ответственный менеджер: {client.manager}</p>
              <p>Контакты: {client.contacts.length ? client.contacts.join(", ") : "Контакты пока не добавлены"}</p>
              <p>Последняя активность: {client.lastActivity}</p>
            </div>
          </>
        )}
        <Card className="mt-6 border-red-500/25 bg-red-500/8 p-4">
          <div className="mb-2 text-sm font-bold text-red-100">AI health score клиента</div>
          <div className="text-4xl font-black">{editing ? draft.healthScore : client.healthScore}%</div>
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

function DealsPage({ deals: dealsProp, onMoveDeal, onRescue }: { deals: CrmDeal[]; onMoveDeal: (dealId: string, stage: DealStage) => void; onRescue: (deal: CrmDeal) => void }) {
  const [draggingDealId, setDraggingDealId] = useState("");

  return (
    <div className="space-y-5">
      <p className="text-sm text-nexus-muted">Перетащите сделку между стадиями или создайте новую через кнопку вверху.</p>
      <div className="grid min-w-0 gap-4 xl:grid-cols-6">
      {stages.map((stage) => {
        const stageDeals = dealsProp.filter((deal) => deal.stage === stage);
        return (
          <Card
            key={stage}
            className={cn("min-h-80 p-3 transition", draggingDealId && "border-red-500/45 bg-red-500/[0.03]")}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dealId = event.dataTransfer.getData("text/deal-id") || draggingDealId;
              if (dealId) onMoveDeal(dealId, stage);
              setDraggingDealId("");
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">{stage}</h2>
              <Badge>{stageDeals.length}</Badge>
            </div>
            <div className="space-y-3">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/deal-id", deal.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingDealId(deal.id);
                  }}
                  onDragEnd={() => setDraggingDealId("")}
                  className={cn("cursor-grab active:cursor-grabbing", draggingDealId === deal.id && "opacity-50")}
                >
                  <DealCard deal={deal} onRescue={onRescue} />
                </div>
              ))}
              {!stageDeals.length && <EmptyState title="Пусто" detail="Переместите сделку сюда." compact />}
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

function DealCard({ deal, onRescue }: { deal: CrmDeal; onRescue: (deal: CrmDeal) => void }) {
  const atRisk = deal.risk === "high" || (deal.risk === "medium" && deal.probability < 50);
  const canRescue = atRisk && isActiveDeal(deal);
  return (
    <div className="rounded-md border border-nexus-border bg-black/30 p-3">
      <div className="mb-2 text-sm font-bold">{deal.title}</div>
      <div className="mb-3 text-xs text-nexus-muted">{deal.client}</div>
      <div className="flex items-center justify-between text-xs">
        <span>{money(deal.amount)}</span>
        <Badge tone={deal.risk === "high" ? "red" : deal.risk === "low" ? "green" : "amber"}>{deal.probability}%</Badge>
      </div>
      {canRescue && (
        <button
          onClick={() => onRescue(deal)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-nexus-red/40 bg-nexus-red/12 px-2 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-nexus-red/20"
        >
          <LifeBuoy size={14} />
          AI Rescue
        </button>
      )}
    </div>
  );
}

function DealRescueModal({
  deal,
  loadPlan,
  onCreateTask,
  onClose,
}: {
  deal: CrmDeal;
  loadPlan: (deal: CrmDeal) => Promise<DealRescuePlan>;
  onCreateTask: (plan: DealRescuePlan) => Promise<void>;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<DealRescuePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskCreated, setTaskCreated] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loadPlan(deal)
      .then((result) => {
        if (active) setPlan(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Не удалось построить план спасения");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deal.id]);

  async function handleCreateTask() {
    if (!plan) return;
    setCreatingTask(true);
    setError("");
    try {
      await onCreateTask(plan);
      setTaskCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleCopyEmail() {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(plan.emailDraft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать письмо в буфер обмена");
    }
  }

  const riskTone = plan?.riskLevel === "high" ? "red" : plan?.riskLevel === "low" ? "green" : "amber";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifeBuoy size={20} className="text-nexus-red" />
            <h2 className="text-lg font-bold">AI-режим спасения сделки</h2>
          </div>
          <GhostButton className="size-8 px-0" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </GhostButton>
        </div>

        <div className="mb-4">
          <div className="text-sm font-bold">{deal.title}</div>
          <div className="text-xs text-nexus-muted">{deal.client}</div>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && !loading ? (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{error}</div>
        ) : null}

        {plan && !loading && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={riskTone}>Риск: {plan.riskLevel === "high" ? "высокий" : plan.riskLevel === "low" ? "низкий" : "средний"}</Badge>
              <Badge>Вероятность закрытия: {plan.closeProbability}%</Badge>
              <Badge>Без активности: {plan.daysSinceActivity} дн.</Badge>
            </div>

            <div className="rounded-md border border-nexus-border bg-black/20 p-3">
              <div className="mb-1 text-xs font-bold uppercase text-nexus-muted">Причина риска</div>
              <p className="text-sm">{plan.riskReason}</p>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase text-nexus-muted">Рекомендованные шаги</div>
              <ol className="space-y-1.5">
                {plan.nextSteps.map((step, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-nexus-red/15 text-xs font-bold text-red-100">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-bold uppercase text-nexus-muted">Черновик письма</div>
                <span className="text-[10px] text-nexus-muted">{plan.emailModel}</span>
              </div>
              <div className="rounded-md border border-nexus-border bg-black/20 p-3">
                <div className="mb-1 text-sm font-semibold">{plan.emailSubject}</div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">{plan.emailDraft}</pre>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCreateTask} disabled={creatingTask || taskCreated}>
                {taskCreated ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                {taskCreated ? "Задача создана" : creatingTask ? "Создаём..." : "Создать задачу"}
              </Button>
              <GhostButton onClick={handleCopyEmail}>
                {copied ? "Скопировано" : "Скопировать письмо"}
              </GhostButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function NewDealModal({ clients, onClose, onCreate }: { clients: CrmClient[]; onClose: () => void; onCreate: (deal: DealDraft) => void }) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
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
    if (!clientId) {
      setError("Сначала добавьте или выберите клиента");
      return;
    }
    const amountNum = Number(amount) || 0;
    const probabilityNum = Math.min(100, Math.max(0, Number(probability) || 0));
    onCreate({
      title: title.trim(),
      clientId,
      stage,
      amount: amountNum,
      closeDate: closeDate.trim() || "Не указано",
      probability: probabilityNum,
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
            <select className={inputClass} value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Выберите клиента</option>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Стадия">
              <select className={inputClass} value={stage} onChange={(event) => setStage(event.target.value as DealStage)}>
                {stages.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Сумма, RUB">
              <input className={inputClass} type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="42000" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата закрытия">
              <input className={inputClass} type="date" value={closeDate} onChange={(event) => setCloseDate(event.target.value)} />
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

function NewTaskModal({ clients, onClose, onCreate }: { clients: CrmClient[]; onClose: () => void; onCreate: (task: TaskDraft) => void }) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [due, setDue] = useState("Сегодня");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [error, setError] = useState("");

  function submit() {
    if (!title.trim()) {
      setError("Укажите название задачи");
      return;
    }
    onCreate({ title, clientId: clientId || undefined, due, priority });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <Card className="w-full max-w-lg p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Новая задача</h2>
          <GhostButton className="h-8 px-3" onClick={onClose}>Закрыть</GhostButton>
        </div>
        <div className="space-y-3">
          <Field label="Название">
            <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Позвонить клиенту" />
          </Field>
          <Field label="Клиент">
            <select className={inputClass} value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Без клиента</option>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Срок">
              <input className={inputClass} value={due} onChange={(event) => setDue(event.target.value)} placeholder="Сегодня" />
            </Field>
            <Field label="Приоритет">
              <select className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                <option value="low">низкий</option>
                <option value="medium">средний</option>
                <option value="high">высокий</option>
                <option value="urgent">срочно</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button className="w-full" onClick={submit}><Plus size={18} />Создать задачу</Button>
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

function DealRow({ deal }: { deal: CrmDeal }) {
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

function TasksPage({ tasks, onMoveTask, onCreateTask }: { tasks: CrmTask[]; onMoveTask: (taskId: string, status: TaskStatus) => void; onCreateTask: () => void }) {
  const [draggingTaskId, setDraggingTaskId] = useState("");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-nexus-muted">Перетащите карточку между колонками или создайте новую задачу.</p>
        <Button onClick={onCreateTask}><Plus size={18} />Новая задача</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {(["todo", "in_progress", "done"] as const).map((status) => {
          const statusTasks = tasks.filter((task) => task.status === status);
          return (
            <Card
              key={status}
              className={cn("min-h-64 p-5 transition", draggingTaskId && "border-red-500/45 bg-red-500/[0.03]")}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/task-id") || draggingTaskId;
                if (taskId) onMoveTask(taskId, status);
                setDraggingTaskId("");
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{taskStatusLabels[status]}</h2>
                <Badge>{statusTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {statusTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/task-id", task.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingTaskId(task.id);
                    }}
                    onDragEnd={() => setDraggingTaskId("")}
                    className={cn(
                      "cursor-grab rounded-md border border-nexus-border bg-white/[0.025] p-4 transition active:cursor-grabbing",
                      draggingTaskId === task.id && "scale-[0.99] border-red-500/60 opacity-70",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="font-bold">{task.title}</div>
                      <Badge tone={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : "default"}>{priorityLabels[task.priority]}</Badge>
                    </div>
                    <div className="text-sm text-nexus-muted">{task.client} · {task.due}</div>
                  </div>
                ))}
                {!statusTasks.length && (
                  <EmptyState title="Нет задач" detail="Перетащите сюда карточку или создайте новую задачу." compact />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AiPage({ stats }: { stats: DashboardStats }) {
  const [message, setMessage] = useState("Какие сделки сейчас самые рискованные и что делать менеджеру?");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Я вижу клиентов, сделки и задачи в CRM. Могу быстро собрать риски, next steps и прогноз по pipeline.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("CRM context");

  const promptChips = [
    "Какие сделки самые рискованные?",
    "Что сегодня должен сделать менеджер?",
    "Где теряется pipeline?",
    "Составь план follow-up по клиентам в риске",
  ];

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
      setModel(data.model ?? "CRM AI");
    } catch (error) {
      setModel("local-crm-fallback");
      setChat((items) => [
        ...items,
        {
          role: "assistant",
          text: makeLocalAiAnswer(trimmed, stats, error instanceof Error ? error.message : "AI сервис временно недоступен"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function usePrompt(prompt: string) {
    setMessage(prompt);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr]">
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-100">
              <Bot className="text-nexus-red" size={20} />
              Nexus AI Copilot
            </div>
            <h2 className="text-2xl font-black">Контекст CRM</h2>
          </div>
          <Badge tone={model === "local-crm-fallback" ? "amber" : "green"}>{model}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label="Pipeline" value={money(stats.totalPipeline)} detail={`${stats.deals.length} сделок`} />
          <MetricTile label="Forecast" value={money(Math.round(stats.weightedForecast))} detail="с учетом вероятности" />
          <MetricTile label="Risk clients" value={stats.atRiskClients.length.toString()} detail={stats.atRiskClients[0]?.name ?? "нет критичных"} tone={stats.atRiskClients.length ? "red" : "green"} />
          <MetricTile label="Urgent tasks" value={stats.urgentTasks.length.toString()} detail={stats.urgentTasks[0]?.title ?? "нет срочных"} tone={stats.urgentTasks.length ? "amber" : "green"} />
        </div>
        <div className="mt-5 space-y-2">
          {promptChips.map((prompt) => (
            <button key={prompt} onClick={() => usePrompt(prompt)} className="w-full rounded-md border border-nexus-border bg-white/[0.025] px-3 py-2 text-left text-sm text-zinc-300 transition hover:border-nexus-red/60 hover:text-white">
              {prompt}
            </button>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-nexus-red" size={22} />
            <h3 className="text-lg font-bold">Чат с AI Ассистентом</h3>
          </div>
          <GhostButton className="h-9 px-3" onClick={() => setChat([{ role: "assistant", text: "Контекст очищен. Готов собрать новый CRM-разбор." }])}>
            <RefreshCw size={16} />
            Очистить
          </GhostButton>
        </div>
        <div className="mb-4 max-h-[520px] min-h-[360px] space-y-3 overflow-y-auto rounded-md border border-nexus-border bg-black/25 p-3">
          {chat.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={cn(
                "rounded-md border p-4 text-sm leading-6 shadow-sm",
                item.role === "user" ? "ml-4 border-zinc-700 bg-white/[0.04] sm:ml-8" : "mr-4 border-red-500/20 bg-red-500/8 sm:mr-8",
              )}
            >
              <div className="mb-1 text-xs font-bold uppercase text-nexus-muted">{item.role === "user" ? "Вы" : "Nexus AI"}</div>
              <ChatMessage text={item.text} />
            </div>
          ))}
          {loading ? <div className="rounded-md border border-nexus-border bg-white/[0.025] p-4 text-sm text-nexus-muted">AI анализирует CRM-контекст...</div> : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void sendMessage();
            }}
            className="h-11 min-w-0 flex-1 rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60"
            placeholder="Спросите про клиентов, сделки или риски..."
          />
          <Button className="px-5" onClick={() => void sendMessage()} disabled={loading}>
            <Send size={18} />
            Отправить
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ChatMessage({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line));
        if (isList) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIndex} className="whitespace-pre-wrap break-words">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {renderInline(line)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded bg-black/40 px-1 py-0.5 text-xs text-red-100">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function makeLocalAiAnswer(question: string, stats: DashboardStats, reason: string) {
  const riskyClient = stats.atRiskClients[0];
  const riskyDeal = stats.deals
    .filter((deal) => deal.risk === "high" || deal.probability < 50)
    .sort((a, b) => a.probability - b.probability)[0];
  const urgentTask = stats.urgentTasks[0];

  return [
    `Локальный CRM-разбор по запросу "${question}". Внешний AI сейчас недоступен: ${reason}.`,
    `Pipeline: ${money(stats.totalPipeline)}, weighted forecast: ${money(Math.round(stats.weightedForecast))}.`,
    riskyDeal ? `Главная риск-сделка: ${riskyDeal.title} (${riskyDeal.client}), вероятность ${riskyDeal.probability}%.` : "Критичных сделок по вероятности не найдено.",
    riskyClient ? `Клиент в фокусе: ${riskyClient.name}, health score ${riskyClient.healthScore}%.` : "Критичных клиентов по health score нет.",
    urgentTask ? `Сегодня закрыть: ${urgentTask.title} для ${urgentTask.client}.` : "Срочных незакрытых задач нет.",
    "Следующий шаг: назначить follow-up, обновить вероятность сделки после контакта и зафиксировать результат в задачах.",
  ].join(" ");
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

  function setLocalSetting<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  const canEdit = session.user.role === "admin";

  if (!canEdit) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-black">Профиль аккаунта</h2>
          <div className="space-y-3 text-sm">
            <InfoRow label="Имя" value={session.user.name} />
            <InfoRow label="Email" value={session.user.email} />
            <InfoRow label="Роль" value={session.user.role} />
          </div>
        </Card>
      </div>
    );
  }

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
              Workspace
              <input
                value={settings.workspaceName}
                onBlur={() => void updateSetting("workspaceName", settings.workspaceName)}
                onChange={(event) => setLocalSetting("workspaceName", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60"
              />
            </label>
            <label className="text-sm text-zinc-300">
              Часовой пояс
              <input
                value={settings.timezone}
                onBlur={() => void updateSetting("timezone", settings.timezone)}
                onChange={(event) => setLocalSetting("timezone", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60"
              />
            </label>
            <label className="text-sm text-zinc-300">
              Валюта
              <select value={settings.currency} onChange={(event) => { const value = event.target.value; setLocalSetting("currency", value); void updateSetting("currency", value); }} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60">
                <option value="RUB">RUB · рубли</option>
                <option value="USD">USD · доллары</option>
                <option value="EUR">EUR · евро</option>
              </select>
            </label>
            <label className="text-sm text-zinc-300">
              Роль по умолчанию
              <select value={settings.defaultRole} onChange={(event) => { const value = event.target.value as Role; setLocalSetting("defaultRole", value); void updateSetting("defaultRole", value); }} className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60">
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

  function setLocalAdminSetting<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
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
            <label className="block text-sm text-zinc-300">
              Рабочее пространство
              <input
                value={settings.workspaceName}
                onBlur={() => void updateSetting("workspaceName", settings.workspaceName)}
                onChange={(event) => setLocalAdminSetting("workspaceName", event.target.value)}
                disabled={savingSetting === "workspaceName"}
                className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60 disabled:opacity-60"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Часовой пояс
              <input
                value={settings.timezone}
                onBlur={() => void updateSetting("timezone", settings.timezone)}
                onChange={(event) => setLocalAdminSetting("timezone", event.target.value)}
                disabled={savingSetting === "timezone"}
                className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60 disabled:opacity-60"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Валюта
              <select
                value={settings.currency}
                onChange={(event) => { const value = event.target.value; setLocalAdminSetting("currency", value); void updateSetting("currency", value); }}
                disabled={savingSetting === "currency"}
                className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60 disabled:opacity-60"
              >
                <option value="RUB">RUB · рубли</option>
                <option value="USD">USD · доллары</option>
                <option value="EUR">EUR · евро</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-300">
              Роль по умолчанию
              <select
                value={settings.defaultRole}
                onChange={(event) => { const value = event.target.value as Role; setLocalAdminSetting("defaultRole", value); void updateSetting("defaultRole", value); }}
                disabled={savingSetting === "defaultRole"}
                className="mt-2 h-10 w-full rounded-md border border-nexus-border bg-black/40 px-3 outline-none focus:ring-2 focus:ring-nexus-red/60 disabled:opacity-60"
              >
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="viewer">viewer</option>
              </select>
            </label>
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
