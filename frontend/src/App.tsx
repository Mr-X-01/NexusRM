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
  PanelLeft,
  Plus,
  Search,
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

type Page = "Dashboard" | "Clients" | "Client Profile" | "Deals" | "Tasks" | "AI Assistant" | "API Documentation" | "Settings" | "Admin Panel";

const nav: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Clients", icon: Users },
  { label: "Deals", icon: KanbanSquare },
  { label: "Tasks", icon: CheckCircle2 },
  { label: "AI Assistant", icon: Bot },
  { label: "API Documentation", icon: Code2 },
  { label: "Settings", icon: Settings },
  { label: "Admin Panel", icon: Shield },
];

export function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Page>("Dashboard");
  const [selectedClient, setSelectedClient] = useState(clients[0]);
  const [loading, setLoading] = useState(false);

  const kpis = useMemo(
    () => [
      { label: "Total Clients", value: clients.length.toString(), delta: "+18%", icon: Users },
      { label: "Active Deals", value: deals.filter((deal) => !["Won", "Lost"].includes(deal.stage)).length.toString(), delta: "+7", icon: KanbanSquare },
      { label: "Monthly Revenue", value: money(42000), delta: "+24%", icon: BarChart3 },
      { label: "Conversion Rate", value: "31%", delta: "+4.2%", icon: Activity },
      { label: "Tasks Due Today", value: tasks.filter((task) => task.due === "Today").length.toString(), delta: "urgent", icon: Bell },
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
            <div className="grid size-11 place-items-center rounded-lg bg-nexus-red text-lg font-black shadow-red">N</div>
            <div>
              <div className="text-lg font-black tracking-normal">NexusRM</div>
              <div className="text-xs text-nexus-muted">B2B Revenue OS</div>
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
              AI Risk Monitor
            </div>
            <p className="text-sm leading-6 text-nexus-muted">RedForge is at risk because no activity has been logged for 14 days.</p>
            <Button className="mt-4 h-9 w-full">Generate follow-up</Button>
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-nexus-border bg-nexus-bg/85 px-4 py-4 backdrop-blur md:px-7">
            <div className="flex flex-wrap items-center gap-3">
              <GhostButton className="lg:hidden">
                <PanelLeft size={18} />
              </GhostButton>
              <div className="min-w-[220px] flex-1">
                <div className="text-xs uppercase text-nexus-muted">Revenue Command Center</div>
                <h1 className="text-2xl font-black tracking-normal md:text-3xl">{page}</h1>
              </div>
              <div className="relative hidden min-w-72 md:block">
                <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                <input className="h-10 w-full rounded-md border border-nexus-border bg-white/[0.03] pl-10 pr-3 text-sm outline-none ring-nexus-red/60 placeholder:text-zinc-600 focus:ring-2" placeholder="Search clients, deals, tasks..." />
              </div>
              <GhostButton>
                <Bell size={18} />
              </GhostButton>
              <Button>
                <Plus size={18} />
                New Deal
              </Button>
              <GhostButton onClick={() => setAuthed(false)}>
                <LogOut size={18} />
              </GhostButton>
            </div>
          </header>

          <div className="p-4 md:p-7">
            {loading ? <LoadingState /> : null}
            {!loading && page === "Dashboard" && <Dashboard kpis={kpis} />}
            {!loading && page === "Clients" && <ClientsPage onSelect={(client) => { setSelectedClient(client); switchPage("Client Profile"); }} />}
            {!loading && page === "Client Profile" && <ClientProfile client={selectedClient} />}
            {!loading && page === "Deals" && <DealsPage />}
            {!loading && page === "Tasks" && <TasksPage />}
            {!loading && page === "AI Assistant" && <AiPage />}
            {!loading && page === "API Documentation" && <ApiDocsPage />}
            {!loading && page === "Settings" && <SettingsPage />}
            {!loading && page === "Admin Panel" && <AdminPage />}
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
          <div className="grid size-12 place-items-center rounded-lg bg-nexus-red text-xl font-black">N</div>
          <div>
            <h1 className="text-2xl font-black">NexusRM</h1>
            <p className="text-sm text-nexus-muted">Secure CRM command center</p>
          </div>
        </div>
        <label className="mb-2 block text-sm text-zinc-300">Email</label>
        <input defaultValue="admin@nexusrm.ai" className="mb-4 h-11 w-full rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60" />
        <label className="mb-2 block text-sm text-zinc-300">Password</label>
        <input defaultValue="admin123" type="password" className="mb-5 h-11 w-full rounded-md border border-nexus-border bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-nexus-red/60" />
        <Button className="w-full" onClick={onLogin}>
          <Lock size={18} />
          Login to workspace
        </Button>
        <p className="mt-4 text-center text-xs text-nexus-muted">Demo: admin@nexusrm.ai / admin123</p>
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
              <h2 className="text-lg font-bold">Revenue Forecast</h2>
              <p className="text-sm text-nexus-muted">AI forecast for this month: $42,000</p>
            </div>
            <Badge tone="red">AI Forecast</Badge>
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
          <h2 className="mb-4 text-lg font-bold">AI Alerts</h2>
          <div className="space-y-3">
            {[
              "Client at risk: no activity for 14 days",
              "Deal has 72% closing probability",
              "Recommended next step: send follow-up today",
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
          <h2 className="mb-4 text-lg font-bold">Conversion Funnel</h2>
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
          <h2 className="mb-4 text-lg font-bold">Recent Activities</h2>
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
            <Badge tone={client.status === "at_risk" ? "red" : client.status === "active" ? "green" : "default"}>{client.status}</Badge>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">{client.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
          <div className="mb-4 text-sm text-zinc-300">Manager: {client.manager}</div>
          <div className="mb-5 h-2 rounded-full bg-white/[0.06]">
            <div className="h-2 rounded-full bg-nexus-red" style={{ width: `${client.healthScore}%` }} />
          </div>
          <GhostButton className="w-full" onClick={() => onSelect(client)}>
            Open profile
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
          <p>Status: {client.status}</p>
          <p>Responsible manager: {client.manager}</p>
          <p>Contacts: {client.contacts.join(", ")}</p>
          <p>Last activity: {client.lastActivity}</p>
        </div>
        <Card className="mt-6 border-red-500/25 bg-red-500/8 p-4">
          <div className="mb-2 text-sm font-bold text-red-100">AI Client Health Score</div>
          <div className="text-4xl font-black">{client.healthScore}%</div>
          <p className="mt-2 text-sm text-nexus-muted">{client.notes}</p>
        </Card>
      </Card>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">Linked Deals</h3>
        <div className="space-y-3">
          {clientDeals.length ? clientDeals.map((deal) => <DealRow key={deal.id} deal={deal} />) : <EmptyState title="No deals yet" detail="Create a first opportunity from this client profile." />}
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
              {!stageDeals.length && <EmptyState title="Empty" detail="Drop a deal here." compact />}
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
        <div className="text-sm text-nexus-muted">{deal.stage} · closes {deal.closeDate}</div>
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
          <h2 className="mb-4 text-lg font-bold">{status.replace("_", " ")}</h2>
          <div className="space-y-3">
            {tasks.filter((task) => task.status === status).map((task) => (
              <div key={task.id} className="rounded-md border border-nexus-border bg-white/[0.025] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-bold">{task.title}</div>
                  <Badge tone={task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : "default"}>{task.priority}</Badge>
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
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-6">
        <Bot className="mb-4 text-nexus-red" size={34} />
        <h2 className="text-2xl font-black">AI Sales Copilot</h2>
        <p className="mt-2 text-nexus-muted">Mock intelligence layer for scoring, risk detection, follow-up generation and revenue forecasting.</p>
        <Button className="mt-6">Generate recommendations</Button>
      </Card>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">Recommendations</h3>
        {[
          "Deal has 72% closing probability.",
          "Client is at risk because no activity for 14 days.",
          "Recommended next step: send follow-up today.",
          "Revenue forecast for this month: $42,000.",
        ].map((item) => (
          <div key={item} className="mb-3 rounded-md border border-red-500/20 bg-red-500/8 p-4 text-sm">
            {item}
          </div>
        ))}
      </Card>
    </div>
  );
}

function ApiDocsPage() {
  return (
    <Card className="p-6">
      <Code2 className="mb-4 text-nexus-red" size={32} />
      <h2 className="text-2xl font-black">Public CRM API</h2>
      <p className="mt-2 max-w-3xl text-nexus-muted">External systems can create leads, list clients, create tasks, list deals and register webhooks with API key authentication.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {["POST /api/public/leads", "GET /api/public/clients", "POST /api/public/tasks", "GET /api/public/deals", "POST /api/public/webhooks"].map((endpoint) => (
          <div key={endpoint} className="rounded-md border border-nexus-border bg-black/35 p-4 font-mono text-sm text-red-100">{endpoint}</div>
        ))}
      </div>
      <a className="mt-6 inline-flex text-sm font-bold text-nexus-red" href={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/api/docs`} target="_blank" rel="noreferrer">
        Open Swagger documentation
      </a>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black">Workspace Settings</h2>
        <Toggle label="Default dark mode" enabled />
        <Toggle label="AI risk alerts" enabled />
        <Toggle label="Public API access" enabled />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-black">API Keys</h2>
        <div className="rounded-md border border-nexus-border bg-black/35 p-4 font-mono text-sm">nxrm_demo_public_key</div>
      </Card>
    </div>
  );
}

function AdminPage() {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-black">Admin Panel</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-nexus-muted">
            <tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Security</th></tr>
          </thead>
          <tbody>
            {[["Nexus Admin", "admin"], ["Maya Chen", "manager"], ["Read Only Demo", "viewer"]].map(([name, role]) => (
              <tr key={name} className="border-t border-nexus-border">
                <td className="p-3 font-bold">{name}</td><td className="p-3">{role}</td><td className="p-3"><Badge tone="green">active</Badge></td><td className="p-3">JWT + RBAC</td>
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
