import { describe, expect, it } from "vitest";
import {
  isBlockedPartnerHostname,
  isIpLiteralHostname,
  validateCreatorStockPickPartnerUrl,
} from "@/lib/creator-stock-picks/validate-partner-url";

describe("validateCreatorStockPickPartnerUrl", () => {
  it("accepts HTTPS o1.exchange swap links", () => {
    const url =
      "https://o1.exchange/swap?chainId=84532&inputCurrency=0xB200000000000000000000CD7e6b8042cb7c2BB5";
    expect(validateCreatorStockPickPartnerUrl(url)).toEqual({
      ok: true,
      url,
    });
  });

  it("rejects http", () => {
    expect(
      validateCreatorStockPickPartnerUrl("http://o1.exchange/swap"),
    ).toMatchObject({ ok: false });
  });

  it("rejects credentials in URL", () => {
    expect(
      validateCreatorStockPickPartnerUrl(
        "https://user:pass@o1.exchange/swap",
      ),
    ).toMatchObject({ ok: false });
  });

  it("rejects IP literals", () => {
    expect(
      validateCreatorStockPickPartnerUrl("https://127.0.0.1/swap"),
    ).toMatchObject({ ok: false });
  });

  it("rejects localhost", () => {
    expect(
      validateCreatorStockPickPartnerUrl("https://localhost/swap"),
    ).toMatchObject({ ok: false });
  });

  it("rejects off-allowlist hosts", () => {
    expect(
      validateCreatorStockPickPartnerUrl("https://evil.example/swap"),
    ).toMatchObject({ ok: false });
  });

  it("allows basestonk.io subdomains", () => {
    expect(
      validateCreatorStockPickPartnerUrl("https://app.basestonk.io/pools/amc"),
    ).toMatchObject({ ok: true });
  });
});

describe("hostname helpers", () => {
  it("detects IPv4 literals", () => {
    expect(isIpLiteralHostname("192.168.0.1")).toBe(true);
    expect(isIpLiteralHostname("o1.exchange")).toBe(false);
  });

  it("blocks localhost variants", () => {
    expect(isBlockedPartnerHostname("localhost")).toBe(true);
    expect(isBlockedPartnerHostname("o1.exchange")).toBe(false);
  });
});
