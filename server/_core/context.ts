import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getOrCreateSessionUser } from "./session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await getOrCreateSessionUser(opts.req, opts.res);
  } catch (error) {
    console.warn("[Auth] Failed to resolve session user:", error);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
