import { describe, it, expect } from "vitest";
import { buildReferralLink, buildReferralCode, getReferralCodeFromStorage } from "./referralUtils";

describe("referralUtils", () => {
  describe("buildReferralCode", () => {
    it("returns digger- plus first 8 chars of profile id", () => {
      expect(buildReferralCode("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("digger-a1b2c3d4");
      expect(buildReferralCode("deadbeef")).toBe("digger-deadbeef");
    });

    it("handles short ids", () => {
      expect(buildReferralCode("abc")).toBe("digger-abc");
    });

    it("handles empty string", () => {
      expect(buildReferralCode("")).toBe("digger-");
    });
  });

  describe("buildReferralLink", () => {
    it("returns full URL with encoded ref param", () => {
      const link = buildReferralLink("https://digsandgigs.net", "a1b2c3d4-e5f6-7890-abcd-ef1234567890");
      expect(link).toBe("https://digsandgigs.net/hire-a-pro?ref=digger-a1b2c3d4");
    });

    it("uses origin without trailing slash", () => {
      const link = buildReferralLink("https://example.com", "deadbeef-1234");
      expect(link).toContain("https://example.com/hire-a-pro");
      expect(link).toContain("ref=digger-deadbeef");
    });

    it("encodes ref param", () => {
      const link = buildReferralLink("https://x.com", "ab-cd-ef");
      expect(link).toContain("ref=digger-ab-cd-e");
    });
  });

  describe("getReferralCodeFromStorage", () => {
    it("returns value from sessionStorage when present", () => {
      sessionStorage.setItem("referral_code", "digger-abc12345");
      try {
        expect(getReferralCodeFromStorage()).toBe("digger-abc12345");
      } finally {
        sessionStorage.removeItem("referral_code");
      }
    });

    it("returns null when referral_code is not in sessionStorage", () => {
      sessionStorage.removeItem("referral_code");
      expect(getReferralCodeFromStorage()).toBeNull();
    });
  });
});
