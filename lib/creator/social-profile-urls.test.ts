import { describe, expect, it } from "vitest";
import {
  normalizeCreatorSocialProfileUrl,
  normalizeInstagramProfileUrl,
  normalizeOrbProfileUrl,
  normalizeXProfileUrl,
} from "@/lib/creator/social-profile-urls";

describe("normalizeXProfileUrl", () => {
  it("accepts empty input as clear", () => {
    expect(normalizeXProfileUrl("")).toEqual({ ok: true, url: null });
    expect(normalizeXProfileUrl("   ")).toEqual({ ok: true, url: null });
  });

  it("normalizes handles and @handles", () => {
    expect(normalizeXProfileUrl("@CreativeCrtv")).toEqual({
      ok: true,
      url: "https://x.com/CreativeCrtv",
    });
    expect(normalizeXProfileUrl("drinkspindrift")).toEqual({
      ok: true,
      url: "https://x.com/drinkspindrift",
    });
  });

  it("normalizes twitter.com and x.com URLs", () => {
    expect(normalizeXProfileUrl("https://twitter.com/foo_bar")).toEqual({
      ok: true,
      url: "https://x.com/foo_bar",
    });
    expect(normalizeXProfileUrl("x.com/foo_bar")).toEqual({
      ok: true,
      url: "https://x.com/foo_bar",
    });
  });

  it("rejects invalid X values", () => {
    expect(normalizeXProfileUrl("https://example.com/user")).toMatchObject({
      ok: false,
    });
    expect(normalizeXProfileUrl("bad handle!")).toMatchObject({ ok: false });
  });

  it("rejects hostname spoof URLs", () => {
    expect(
      normalizeXProfileUrl("https://evil.com/x.com/foo"),
    ).toMatchObject({ ok: false });
    expect(
      normalizeXProfileUrl("https://x.com.evil.com/foo"),
    ).toMatchObject({ ok: false });
  });
});

describe("normalizeInstagramProfileUrl", () => {
  it("normalizes handles and profile URLs", () => {
    expect(normalizeInstagramProfileUrl("@creativetv")).toEqual({
      ok: true,
      url: "https://instagram.com/creativetv",
    });
    expect(
      normalizeInstagramProfileUrl("https://www.instagram.com/creativetv/"),
    ).toEqual({
      ok: true,
      url: "https://instagram.com/creativetv",
    });
  });

  it("rejects non-profile instagram paths", () => {
    expect(
      normalizeInstagramProfileUrl("https://instagram.com/reels/abc"),
    ).toMatchObject({ ok: false });
  });

  it("rejects hostname spoof URLs", () => {
    expect(
      normalizeInstagramProfileUrl("https://evil.com/instagram.com/foo"),
    ).toMatchObject({ ok: false });
    expect(
      normalizeInstagramProfileUrl("https://instagram.com.evil.com/foo"),
    ).toMatchObject({ ok: false });
  });
});

describe("normalizeOrbProfileUrl", () => {
  it("normalizes handles and wallet addresses", () => {
    expect(normalizeOrbProfileUrl("@lenshandle")).toEqual({
      ok: true,
      url: "https://orb.club/p/lenshandle",
    });
    expect(
      normalizeOrbProfileUrl("0xAbCdEf0123456789012345678901234567890AbCd"),
    ).toEqual({
      ok: true,
      url: "https://orb.club/p/0xabcdef0123456789012345678901234567890abcd",
    });
  });

  it("normalizes orb.club profile URLs and strips post segments", () => {
    expect(
      normalizeOrbProfileUrl("https://orb.club/p/creator/0x01-0xabc"),
    ).toEqual({
      ok: true,
      url: "https://orb.club/p/creator",
    });
  });

  it("rejects club URLs and invalid paths", () => {
    expect(
      normalizeOrbProfileUrl("https://orb.club/c/worldcup"),
    ).toMatchObject({ ok: false });
  });

  it("rejects hostname spoof URLs", () => {
    expect(
      normalizeOrbProfileUrl("https://evil.com/orb.club/p/foo"),
    ).toMatchObject({ ok: false });
    expect(
      normalizeOrbProfileUrl("https://orb.club.evil.com/p/foo"),
    ).toMatchObject({ ok: false });
  });

  it("rejects malformed percent-encoding in profile URLs", () => {
    expect(
      normalizeOrbProfileUrl("https://orb.club/p/%E0%A4%A"),
    ).toMatchObject({ ok: false });
  });
});

describe("normalizeCreatorSocialProfileUrl", () => {
  it("dispatches by platform", () => {
    expect(normalizeCreatorSocialProfileUrl("x", "@foo")).toEqual({
      ok: true,
      url: "https://x.com/foo",
    });
  });
});
