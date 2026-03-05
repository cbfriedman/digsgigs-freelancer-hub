import { describe, it, expect } from "vitest";
import { buildGigDraftPayload, hasDraftContent } from "./gigDraftUtils";

describe("gigDraftUtils", () => {
  describe("buildGigDraftPayload", () => {
    it("maps form state to gig_drafts payload shape", () => {
      const payload = buildGigDraftPayload({
        sessionId: "gig-uuid-123",
        email: "user@example.com",
        name: "Jane",
        phone: "+15551234567",
        projectTypes: ["build-website", "design-something"],
        description: "Need a landing page",
        budgetMin: 2000,
        budgetMax: 5000,
        timeline: "2_weeks",
        source: "website",
      });

      expect(payload.session_id).toBe("gig-uuid-123");
      expect(payload.email).toBe("user@example.com");
      expect(payload.name).toBe("Jane");
      expect(payload.phone).toBe("+15551234567");
      expect(payload.project_types).toEqual(["build-website", "design-something"]);
      expect(payload.description).toBe("Need a landing page");
      expect(payload.budget_min).toBe(2000);
      expect(payload.budget_max).toBe(5000);
      expect(payload.timeline).toBe("2_weeks");
      expect(payload.source).toBe("website");
    });

    it("trims and nulls empty strings", () => {
      const payload = buildGigDraftPayload({
        sessionId: "s1",
        email: "  ",
        name: "",
        phone: "",
        projectTypes: [],
        description: "",
        budgetMin: null,
        budgetMax: null,
        timeline: null,
        source: "embed_widget",
      });

      expect(payload.email).toBeNull();
      expect(payload.name).toBeNull();
      expect(payload.phone).toBeNull();
      expect(payload.description).toBeNull();
      expect(payload.source).toBe("embed_widget");
    });

    it("includes all keys required by follow-up-abandoned-drafts", () => {
      const payload = buildGigDraftPayload({
        sessionId: "s",
        email: "a@b.com",
        name: "N",
        phone: null,
        projectTypes: [],
        description: "d",
        budgetMin: null,
        budgetMax: null,
        timeline: null,
        source: "website",
      });

      expect(payload).toHaveProperty("session_id");
      expect(payload).toHaveProperty("email");
      expect(payload).toHaveProperty("name");
      expect(payload).toHaveProperty("description");
      expect(payload).toHaveProperty("project_types");
      expect(payload).toHaveProperty("budget_min");
      expect(payload).toHaveProperty("budget_max");
      expect(payload).toHaveProperty("timeline");
      expect(payload).toHaveProperty("source");
    });
  });

  describe("hasDraftContent", () => {
    it("returns true when description has content", () => {
      expect(hasDraftContent("Hello", "")).toBe(true);
      expect(hasDraftContent("  x  ", "")).toBe(true);
    });

    it("returns true when email has content", () => {
      expect(hasDraftContent("", "a@b.com")).toBe(true);
      expect(hasDraftContent("", "  a@b.com  ")).toBe(true);
    });

    it("returns false when both are empty", () => {
      expect(hasDraftContent("", "")).toBe(false);
      expect(hasDraftContent("   ", "   ")).toBe(false);
    });
  });
});
