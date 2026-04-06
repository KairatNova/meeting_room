import { api, buildApiUrl } from "./client";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("adds auth header from localStorage", async () => {
    localStorage.setItem("access_token", "token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await api.get("/api/health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-123");
  });

  it("throws ApiError with parsed detail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Conflict error" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(api.post("/api/bookings", { room_id: 1 })).rejects.toMatchObject({
      status: 409,
      message: "Conflict error",
    });
  });

  it("builds absolute URL in browser context", () => {
    expect(buildApiUrl("/api/test")).toMatch(/\/api\/test$/);
  });
});

