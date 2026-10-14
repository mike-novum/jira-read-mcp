import { z } from "zod";

export const readTaskInputSchema = z
  .object({
    issue_key: z
      .string()
      .trim()
      .regex(/^[A-Za-z][A-Za-z0-9_]+-\d+$/, "Ключ задачи должен быть вида PROJECT-123")
      .describe("Ключ задачи Jira, например JIRA-1234"),
  })
  .strict();

export const readTaskOutputSchema = z
  .object({
    key: z.string(),
    summary: z.string(),
    description: z.string(),
    status: z.string(),
    assignee: z.string(),
    reporter: z.string(),
    comments: z.array(
      z.object({
        author: z.string(),
        created: z.string(),
        body: z.string(),
      }),
    ),
    total_comments: z.number().int(),
    truncated: z.boolean(),
    truncation_message: z.string().optional(),
  })
  .strict();

export type ReadTaskInput = z.infer<typeof readTaskInputSchema>;
export type ReadTaskOutput = z.infer<typeof readTaskOutputSchema>;
