import type { ClientStatus } from "../data/demo";

export type CrmClient = {
  id: string;
  name: string;
  industry: string;
  status: ClientStatus;
  tags: string[];
  manager: string;
  healthScore: number;
  contacts: string[];
  lastActivity: string;
  notes: string;
};

export type ClientDraft = {
  name: string;
  industry: string;
  tags: string;
  manager: string;
  status: ClientStatus;
};

export function buildClient(draft: ClientDraft): CrmClient {
  const name = draft.name.trim();
  const industry = draft.industry.trim();
  return {
    id: slugify(name),
    name,
    industry,
    status: draft.status,
    tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    manager: draft.manager.trim() || "Администратор Nexus",
    healthScore: 72,
    contacts: [],
    lastActivity: "Клиент добавлен вручную",
    notes: "Новый клиент. Добавьте контакты, сделки и следующую задачу.",
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "") || `client-${Date.now()}`;
}
