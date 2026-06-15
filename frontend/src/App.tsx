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
} from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activities, clients, conversionSeries, deals, revenueSeries, stages, tasks } from "./data/demo";
import { cn, money } from "./lib/utils";
import { Badge, Button, Card, GhostButton, Skeleton } from "./components/ui";

type Page = "Дашборд" | "Клиенты" | "Профиль клиента" | "Сделки" | "Задачи" | "AI Ассистент" | "API Документация" | "Настройки" | "Админ-панель";

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
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Page>("Дашборд");
  const [selectedClient, setSelectedClient] = useState(clients[0]);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    setPage(next);
    window.setTimeout(() => setLoading(false), 420);
  }

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

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
          <nav className="space-y-1">
            {nav.map((item) => (
              <button
                key={item.label}
                onClick={() => switchPage(item.label)}
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
          <Card className="mt-8 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="text-nexus-red" size={17} />
              AI монитор рисков
            </div>
            <p className="text-sm leading-6 text-nexus-muted">RedForge в зоне риска: активности не было 14 дней.</p>
            <Button className="mt-4 h-9 w-full" onClick={() => switchPage("AI Ассистент")}>Сгенерировать письмо</Button>
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-nexus-border bg-nexus-bg/85 px-4 py-4 backdrop-blur md:px-7">
            <div className="flex flex-wrap items-center gap-3">
              <GhostButton className="lg:hidden">
                <PanelLeft size={18} />
              </GhostButton>
              <div className="min-w-[220px] flex-1">
                <div className="text-xs uppercase text-nexus-muted">Центр управления продажами</div>
                <h1 className="text-2xl font-black tracking-normal md:text-3xl">{page}</h1>
              </div>
              <div className="relative hidden min-w-72 md:block">
                <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                <input className="h-10 w-full rounded-md border border-nexus-border bg-white/[0.03] pl-10 pr-3 text-sm outline-none ring-nexus-red/60 placeholder:text-zinc-600 focus:ring-2" placeholder="Поиск клиентов, сделок, задач..." />
              </div>
              <GhostButton>
                <Bell size={18} />
              </GhostButton>
              <Button onClick={() => switchPage("Сделки")}>
                <Plus size={18} />
                Новая сделка
              </Button>
              <GhostButton onClick={() => setAuthed(false)}>
                <LogOut size={18} />
              </GhostButton>
            </div>
          </header>

          <div className="p-4 md:p-7">
            {loading ? <LoadingState /> : null}
            {!loading && page === "Дашборд" && <Dashboard kpis={kpis} />}
            {!loading && page === "Клиенты" && <ClientsPage onSelect={(client) => { setSelectedClient(client); switchPage("Профиль клиента"); }} />}
            {!loading && page === "Профиль клиента" && <ClientProfile client={selectedClient} />}
            {!loading && page === "Сделки" && <DealsPage />}
            {!loading && page === "Задачи" && <TasksPage />}
            {!loading && page === "AI Ассистент" && <AiPage />}
            {!loading && page === "API Документация" && <ApiDocsPage />}
            {!loading && page === "Настройки" && <SettingsPage />}
            {!loading && page === "Админ-панель" && <AdminPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
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
        <input defaultValue="admin@nexusrm.ai" className="mb-4 h-11 w-full rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60" />
        <label className="mb-2 block text-sm text-zinc-300">Пароль</label>
        <input defaultValue="admin123" type="password" className="mb-5 h-11 w-full rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60" />
        <Button className="w-full" onClick={onLogin}>
          <Lock size={18} />
          Войти в рабочее пространство
        </Button>
        <p className="mt-4 text-center text-xs text-nexus-muted">Демо: admin@nexusrm.ai / admin123</p>
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
              <p className="text-sm text-nexus-muted">AI-прогноз на месяц: $42,000</p>
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

function DealsPage() {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-6">
      {stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stage === stage);
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
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
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
  const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const endpoints = [
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
          Эта страница доступна внутри frontend даже если Swagger временно недоступен. Swagger должен открываться по адресу `/api/docs`, когда backend запущен.
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

function SettingsPage() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black">Настройки пространства</h2>
        <Toggle label="Темная тема по умолчанию" enabled />
        <Toggle label="AI уведомления о рисках" enabled />
        <Toggle label="Доступ к публичному API" enabled />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black">API ключи</h2>
        <div className="rounded-md border border-nexus-border bg-black/35 p-4 font-mono text-sm">nxrm_demo_public_key</div>
      </Card>
    </div>
  );
}

function AdminPage() {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-black">Админ-панель</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-nexus-muted">
            <tr><th className="p-3">Пользователь</th><th className="p-3">Роль</th><th className="p-3">Статус</th><th className="p-3">Безопасность</th></tr>
          </thead>
          <tbody>
            {[["Администратор Nexus", "admin"], ["Мария Чен", "manager"], ["Демо только чтение", "viewer"]].map(([name, role]) => (
              <tr key={name} className="border-t border-nexus-border">
                <td className="p-3 font-bold">{name}</td><td className="p-3">{role}</td><td className="p-3"><Badge tone="green">активен</Badge></td><td className="p-3">JWT + RBAC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Toggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-nexus-border bg-white/[0.025] p-4">
      <span className="text-sm">{label}</span>
      <span className={cn("h-6 w-11 rounded-full p-1", enabled ? "bg-nexus-red" : "bg-zinc-700")}>
        <span className={cn("block size-4 rounded-full bg-white transition", enabled && "translate-x-5")} />
      </span>
    </div>
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
