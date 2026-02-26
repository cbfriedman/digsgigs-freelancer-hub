import { describe, it, expect } from "vitest";
import { clientPreCheck } from "./clientPreCheck";

describe("clientPreCheck", () => {
  describe("valid business messages - should pass", () => {
    it("allows normal business messages", () => {
      expect(clientPreCheck("Hi, I'd like to discuss the project scope.").hasWarning).toBe(false);
      expect(clientPreCheck("The budget is 5000 for the full deliverable.").hasWarning).toBe(false);
      expect(clientPreCheck("When can we schedule a call to review the milestones?").hasWarning).toBe(false);
      expect(clientPreCheck("Thanks for your proposal. I'll review and get back to you.").hasWarning).toBe(false);
      expect(clientPreCheck("The deadline is next Friday. Let me know if that works.").hasWarning).toBe(false);
    });

    it("does not treat 5000 as phone number", () => {
      expect(clientPreCheck("The budget is 5000").hasWarning).toBe(false);
    });

    it("does not treat 2024 as phone number", () => {
      expect(clientPreCheck("We need this by 2024").hasWarning).toBe(false);
    });
  });

  describe("contact info - email", () => {
    it("detects direct email", () => {
      const r = clientPreCheck("Contact me at john@gmail.com");
      expect(r.hasWarning).toBe(true);
      expect(r.warningMessage).toContain("contact");
    });

    it("detects obfuscated email", () => {
      const r = clientPreCheck("My email is john [at] gmail [dot] com");
      expect(r.hasWarning).toBe(true);
    });
  });

  describe("contact info - phone", () => {
    it("detects phone-like sequences", () => {
      const r = clientPreCheck("Call me at +1 202 555 0199");
      expect(r.hasWarning).toBe(true);
      expect(r.warningMessage).toContain("phone");
    });

    it("detects formatted phone", () => {
      const r = clientPreCheck("My number is (202) 555-0199");
      expect(r.hasWarning).toBe(true);
    });
  });

  describe("contact info - social/platforms", () => {
    it("detects WhatsApp", () => {
      const r = clientPreCheck("Message me on WhatsApp");
      expect(r.hasWarning).toBe(true);
    });

    it("detects Telegram", () => {
      const r = clientPreCheck("Contact me on Telegram");
      expect(r.hasWarning).toBe(true);
    });

    it("detects text me", () => {
      const r = clientPreCheck("Just text me when you're ready");
      expect(r.hasWarning).toBe(true);
    });

    it("detects call me", () => {
      const r = clientPreCheck("You can call me tomorrow");
      expect(r.hasWarning).toBe(true);
    });

    it("detects email me", () => {
      const r = clientPreCheck("Please email me the details");
      expect(r.hasWarning).toBe(true);
    });
  });

  describe("off-platform payment", () => {
    it("detects direct payment phrases", () => {
      const r = clientPreCheck("Let's do this outside the platform, wire me the payment");
      expect(r.hasWarning).toBe(true);
      expect(r.warningMessage).toContain("payment");
    });

    it("detects PayPal", () => {
      const r = clientPreCheck("PayPal me directly");
      expect(r.hasWarning).toBe(true);
    });

    it("detects Zelle", () => {
      const r = clientPreCheck("Send via Zelle");
      expect(r.hasWarning).toBe(true);
    });

    it("detects cash app", () => {
      const r = clientPreCheck("Cash app me the payment");
      expect(r.hasWarning).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      expect(clientPreCheck("").hasWarning).toBe(false);
      expect(clientPreCheck("   ").hasWarning).toBe(false);
    });

    it("handles empty string", () => {
      expect(clientPreCheck("").hasWarning).toBe(false);
    });

    it("handles non-string gracefully", () => {
      expect(clientPreCheck(null as any).hasWarning).toBe(false);
      expect(clientPreCheck(undefined as any).hasWarning).toBe(false);
    });
  });
});
