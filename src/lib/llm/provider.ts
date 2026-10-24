import type { ZodType } from "zod";

export interface LLMProvider {
  readonly id: string;
  complete<T>(prompt: string, schema: ZodType<T>): Promise<T>;
}
