import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email(),
  clerkUserId: z.string(),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
});

export const WorkFlowSchema = z.object({
  availableTriggetId: z.string(),
  triggerMetadata: z.any().optional(),
  actions: z.array(
    z.object({
      availableActionId: z.string(),
      actionMetadata: z.any().optional(),
    })
  ),
});