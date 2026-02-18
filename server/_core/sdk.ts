// Minimal session verification - no OAuth required for this personal tool
// Auth is optional; all procedures are public.
export type SessionPayload = {
  openId: string;
  name: string;
};

// Stub sdk export for compatibility with context.ts
export const sdk = {
  authenticateRequest: async (_req: unknown): Promise<null> => {
    return null;
  },
};
