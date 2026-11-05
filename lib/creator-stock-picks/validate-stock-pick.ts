import {
  buildO1PartnerDeepLink,
  getO1BaseStockTokenByAddress,
  getO1BaseStockTokenByTicker,
} from "@/lib/creator-stock-picks/o1-base-stock-catalog";
import { validateCreatorStockPickPartnerUrl } from "@/lib/creator-stock-picks/validate-partner-url";

export const MAX_STOCK_PICK_NOTE_LENGTH = 280;

export type CreatorStockPickStored = {
  ticker: string;
  token_address: string;
  partner_url: string;
  note: string | null;
  video_asset_id: string | null;
};

export type StockPickValidationResult =
  | { ok: true; value: CreatorStockPickStored | null }
  | { ok: false; error: string; field?: string };

const TICKER_PATTERN = /^[A-Z]{1,5}$/;

export function normalizeStockPickTicker(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const upper = raw.trim().toUpperCase();
  if (!TICKER_PATTERN.test(upper)) {
    return null;
  }
  return upper;
}

export function validateCreatorStockPickPayload(body: {
  stock_pick_ticker?: unknown;
  stock_pick_note?: unknown;
  stock_pick_video_asset_id?: unknown;
}): StockPickValidationResult {
  const ticker = normalizeStockPickTicker(body.stock_pick_ticker);
  const noteRaw = body.stock_pick_note;
  const videoRaw = body.stock_pick_video_asset_id;

  const clearing =
    body.stock_pick_ticker === null ||
    body.stock_pick_ticker === "" ||
    (typeof body.stock_pick_ticker === "string" &&
      body.stock_pick_ticker.trim() === "");

  if (clearing) {
    return { ok: true, value: null };
  }

  if (!ticker) {
    return {
      ok: false,
      error: "Stock ticker must be 1–5 letters from the catalog",
      field: "stock_pick_ticker",
    };
  }

  const catalog = getO1BaseStockTokenByTicker(ticker);
  if (!catalog) {
    return {
      ok: false,
      error: "Ticker must be selected from the o1 Base stock catalog",
      field: "stock_pick_ticker",
    };
  }

  let note: string | null = null;
  if (noteRaw !== undefined && noteRaw !== null && noteRaw !== "") {
    if (typeof noteRaw !== "string") {
      return {
        ok: false,
        error: "Note must be text",
        field: "stock_pick_note",
      };
    }
    const trimmed = noteRaw.trim();
    if (trimmed.length > MAX_STOCK_PICK_NOTE_LENGTH) {
      return {
        ok: false,
        error: `Note must be at most ${MAX_STOCK_PICK_NOTE_LENGTH} characters`,
        field: "stock_pick_note",
      };
    }
    note = trimmed.length > 0 ? trimmed : null;
  }

  let video_asset_id: string | null = null;
  if (videoRaw !== undefined && videoRaw !== null && videoRaw !== "") {
    if (typeof videoRaw !== "string") {
      return {
        ok: false,
        error: "Video link must be a valid id",
        field: "stock_pick_video_asset_id",
      };
    }
    const id = videoRaw.trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return {
        ok: false,
        error: "Video link must be a valid video asset id",
        field: "stock_pick_video_asset_id",
      };
    }
    video_asset_id = id;
  }

  const partner_url = buildO1PartnerDeepLink(catalog);
  const partnerCheck = validateCreatorStockPickPartnerUrl(partner_url);
  if (!partnerCheck.ok) {
    return {
      ok: false,
      error: partnerCheck.error,
      field: "stock_pick_ticker",
    };
  }

  const byAddr = getO1BaseStockTokenByAddress(catalog.address);
  if (!byAddr) {
    return { ok: false, error: "Catalog address mismatch", field: "stock_pick_ticker" };
  }

  return {
    ok: true,
    value: {
      ticker: catalog.ticker,
      token_address: catalog.address.toLowerCase(),
      partner_url: partnerCheck.url,
      note,
      video_asset_id,
    },
  };
}
