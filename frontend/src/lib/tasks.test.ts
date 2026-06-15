import { describe, expect, it } from "vitest";
import { buildTask, moveTaskStatus, type CrmTask } from "./tasks";

const taskList: CrmTask[] = [
  { id: "t1", title: "Позвонить клиенту", client: "VectorCloud", due: "Сегодня", status: "todo", priority: "urgent" },
  { id: "t2", title: "Подготовить КП", client: "RedForge Studio", due: "Завтра", status: "in_progress", priority: "high" },
];

describe("task board helpers", () => {
  it("moves a task to another kanban status without changing other tasks", () => {
    expect(moveTaskStatus(taskList, "t1", "done")).toEqual([
      { ...taskList[0], status: "done" },
      taskList[1],
    ]);
  });

  it("creates a task with trimmed fields and todo status by default", () => {
    expect(
      buildTask({
        title: "  Уточнить договор  ",
        client: "  Northstar Outsourcing ",
        due: "",
        priority: "medium",
      }),
    ).toMatchObject({
      title: "Уточнить договор",
      client: "Northstar Outsourcing",
      due: "Сегодня",
      status: "todo",
      priority: "medium",
    });
  });
});
