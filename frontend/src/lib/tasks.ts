import type { TaskPriority, TaskStatus } from "../data/demo";

export type CrmTask = {
  id: string;
  title: string;
  client: string;
  due: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export type TaskDraft = {
  title: string;
  client: string;
  due: string;
  priority: TaskPriority;
};

export function moveTaskStatus(tasks: CrmTask[], taskId: string, status: TaskStatus) {
  return tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
}

export function buildTask(draft: TaskDraft): CrmTask {
  return {
    id: `task-${Date.now()}`,
    title: draft.title.trim(),
    client: draft.client.trim(),
    due: draft.due.trim() || "Сегодня",
    status: "todo",
    priority: draft.priority,
  };
}
