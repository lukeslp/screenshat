import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { randomUUID } from "crypto";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";

const SESSION_OPEN_ID_RE = /^[a-zA-Z0-9_-]{16,64}$/;

function normalizeOpenId(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!SESSION_OPEN_ID_RE.test(trimmed)) return null;
  return trimmed;
}

function generateSessionOpenId(): string {
  return `anon_${randomUUID().replace(/-/g, "")}`;
}

export function getSessionOpenIdFromRequest(req: Request): string | null {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  const parsed = parseCookie(rawCookie);
  return normalizeOpenId(parsed[COOKIE_NAME]);
}

export async function getSessionUserFromRequest(req: Request) {
  const openId = getSessionOpenIdFromRequest(req);
  if (!openId) return null;
  return (await getUserByOpenId(openId)) ?? null;
}

export async function getOrCreateSessionUser(req: Request, res: Response) {
  let openId = getSessionOpenIdFromRequest(req);
  let needsCookieWrite = false;

  if (!openId) {
    openId = generateSessionOpenId();
    needsCookieWrite = true;
  }

  await upsertUser({
    openId,
    loginMethod: "session",
  });

  if (needsCookieWrite) {
    res.cookie(COOKIE_NAME, openId, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });
  }

  return (await getUserByOpenId(openId)) ?? null;
}
