"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TASK_STATUSES } from "@leadflow/shared";
import type { TaskStatus } from "@/generated/prisma/client";
import { runAction } from "@/server/action";
import { requireContext } from "@/server/context";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/server/services/tasks";

export async function createTaskAction(input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    const t = await createTask(ctx, input);
    revalidatePath("/tasks");
    if (t.companyId) revalidatePath(`/companies/${t.companyId}`);
    return { id: t.id };
  }, "Задача создана");
}

export async function updateTaskAction(id: string, input: unknown) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await updateTask(ctx, id, input);
    revalidatePath("/tasks");
    return null;
  }, "Задача обновлена");
}

export async function setTaskStatusAction(id: string, status: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await setTaskStatus(ctx, id, z.enum(TASK_STATUSES).parse(status) as TaskStatus);
    revalidatePath("/tasks");
    return null;
  });
}

export async function deleteTaskAction(id: string) {
  return runAction(async () => {
    const ctx = await requireContext("MEMBER");
    await deleteTask(ctx, id);
    revalidatePath("/tasks");
    return null;
  }, "Задача удалена");
}
