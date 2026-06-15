export type ClientStatus = "new" | "active" | "at_risk" | "lost";
export type DealStage = "Lead" | "Contacted" | "Proposal" | "Negotiation" | "Won" | "Lost";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export const stages: DealStage[] = ["Lead", "Contacted", "Proposal", "Negotiation", "Won", "Lost"];

export const clients = [
  {
    id: "vectorcloud",
    name: "VectorCloud",
    industry: "B2B SaaS",
    status: "active" as ClientStatus,
    tags: ["enterprise", "cloud"],
    manager: "Maya Chen",
    healthScore: 88,
    contacts: ["Alex Morgan", "Rina Patel"],
    lastActivity: "Proposal review 2h ago",
    notes: "Expansion opportunity tied to migration deadline.",
  },
  {
    id: "redforge",
    name: "RedForge Studio",
    industry: "Digital Agency",
    status: "at_risk" as ClientStatus,
    tags: ["agency", "retainer"],
    manager: "Maya Chen",
    healthScore: 42,
    contacts: ["Ilya Novak", "Sofia Grant"],
    lastActivity: "No activity for 14 days",
    notes: "Renewal risk. Needs executive follow-up today.",
  },
  {
    id: "northstar",
    name: "Northstar Outsourcing",
    industry: "IT Outsourcing",
    status: "new" as ClientStatus,
    tags: ["nearshore", "pipeline"],
    manager: "Nexus Admin",
    healthScore: 71,
    contacts: ["Sam Rivera"],
    lastActivity: "Discovery call yesterday",
    notes: "Strong fit for dedicated squad package.",
  },
];

export const deals = [
  { id: "d1", title: "Cloud migration program", client: "VectorCloud", stage: "Negotiation" as DealStage, amount: 42000, closeDate: "Jun 28", probability: 72, aiScore: 81, risk: "low" },
  { id: "d2", title: "Retainer expansion", client: "RedForge Studio", stage: "Proposal" as DealStage, amount: 18500, closeDate: "Jun 22", probability: 48, aiScore: 55, risk: "high" },
  { id: "d3", title: "Dedicated delivery squad", client: "Northstar Outsourcing", stage: "Contacted" as DealStage, amount: 64000, closeDate: "Jul 14", probability: 37, aiScore: 49, risk: "medium" },
  { id: "d4", title: "Security audit sprint", client: "VectorCloud", stage: "Won" as DealStage, amount: 12000, closeDate: "Jun 08", probability: 100, aiScore: 94, risk: "low" },
  { id: "d5", title: "Legacy CRM migration", client: "RedForge Studio", stage: "Lead" as DealStage, amount: 28000, closeDate: "Jul 04", probability: 24, aiScore: 36, risk: "high" },
];

export const tasks = [
  { id: "t1", title: "Send follow-up to RedForge", client: "RedForge Studio", due: "Today", status: "todo" as TaskStatus, priority: "urgent" as TaskPriority },
  { id: "t2", title: "Prepare technical proposal", client: "VectorCloud", due: "Tomorrow", status: "in_progress" as TaskStatus, priority: "high" as TaskPriority },
  { id: "t3", title: "Qualify procurement process", client: "Northstar Outsourcing", due: "Jun 20", status: "todo" as TaskStatus, priority: "medium" as TaskPriority },
  { id: "t4", title: "Archive won sprint docs", client: "VectorCloud", due: "Jun 18", status: "done" as TaskStatus, priority: "low" as TaskPriority },
];

export const activities = [
  "AI flagged RedForge as at risk because no activity for 14 days.",
  "VectorCloud moved to Negotiation with 72% closing probability.",
  "Northstar completed discovery call and requested delivery squad pricing.",
  "Public API accepted an inbound lead from Acme Systems.",
];

export const revenueSeries = [
  { month: "Jan", revenue: 18000, forecast: 22000 },
  { month: "Feb", revenue: 24000, forecast: 26000 },
  { month: "Mar", revenue: 31000, forecast: 30000 },
  { month: "Apr", revenue: 28000, forecast: 35000 },
  { month: "May", revenue: 37000, forecast: 39000 },
  { month: "Jun", revenue: 42000, forecast: 47000 },
];

export const conversionSeries = [
  { stage: "Lead", value: 44 },
  { stage: "Contacted", value: 31 },
  { stage: "Proposal", value: 19 },
  { stage: "Won", value: 8 },
];
