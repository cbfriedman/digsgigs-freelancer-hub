import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmbedWidget from "./EmbedWidget";

describe("EmbedWidget", () => {
  let postMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessageMock = vi.fn();
    Object.defineProperty(window, "parent", {
      value: { postMessage: postMessageMock },
      writable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends digs-gigs-resize message to parent with document height", () => {
    render(
      <MemoryRouter>
        <EmbedWidget />
      </MemoryRouter>
    );

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "digs-gigs-resize",
        height: expect.any(Number),
      }),
      "*"
    );
  });

  it("sends height as a number", () => {
    render(
      <MemoryRouter>
        <EmbedWidget />
      </MemoryRouter>
    );

    const call = postMessageMock.mock.calls[0];
    expect(call[0].type).toBe("digs-gigs-resize");
    expect(typeof call[0].height).toBe("number");
    expect(call[0].height).toBeGreaterThanOrEqual(0);
  });
});
