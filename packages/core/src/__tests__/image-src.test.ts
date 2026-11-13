import { describe, expect, it } from "vitest";

import { isSafeImageSrc, isSafeVideoSrc } from "../image-src.js";

describe("isSafeImageSrc", () => {
  it("accepts shipped image paths and https URLs", () => {
    expect(isSafeImageSrc("/images/home/hero-truck.jpg")).toBe(true);
    expect(isSafeImageSrc("  /images/logo.svg ")).toBe(true);
    expect(isSafeImageSrc("https://cdn.example.com/a/b.jpg?w=800")).toBe(true);
  });

  it("rejects script and data schemes, http and other origins", () => {
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeImageSrc("java\tscript:alert(1)")).toBe(false);
    expect(isSafeImageSrc("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeImageSrc("http://example.com/a.jpg")).toBe(false);
    expect(isSafeImageSrc("//evil.example/a.jpg")).toBe(false);
    expect(isSafeImageSrc("https://user:pw@example.com/a.jpg")).toBe(false);
  });

  it("rejects paths outside /images/", () => {
    expect(isSafeImageSrc("")).toBe(false);
    expect(isSafeImageSrc("/api/admin")).toBe(false);
    expect(isSafeImageSrc("images/a.jpg")).toBe(false);
    expect(isSafeImageSrc("/images/../api/x")).toBe(false);
    expect(isSafeImageSrc("/images/%2e%2e/api")).toBe(false);
    expect(isSafeImageSrc("/images\\..\\x")).toBe(false);
  });
});

describe("isSafeVideoSrc", () => {
  it("accepts shipped video paths and https URLs", () => {
    expect(isSafeVideoSrc("/videos/home/strip-1.mp4")).toBe(true);
    expect(isSafeVideoSrc(" /videos/a.webm ")).toBe(true);
    expect(isSafeVideoSrc("https://cdn.example.com/uploads/videos/2026/10/a.mp4")).toBe(true);
  });

  it("rejects script and data schemes, http and other origins", () => {
    expect(isSafeVideoSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeVideoSrc("java\nscript:alert(1)")).toBe(false);
    expect(isSafeVideoSrc("data:video/mp4;base64,AAAA")).toBe(false);
    expect(isSafeVideoSrc("blob:https://example.com/0f0e")).toBe(false);
    expect(isSafeVideoSrc("http://example.com/a.mp4")).toBe(false);
    expect(isSafeVideoSrc("//evil.example/a.mp4")).toBe(false);
    expect(isSafeVideoSrc("https://user:pw@example.com/a.mp4")).toBe(false);
  });

  it("rejects paths outside /videos/, including image paths", () => {
    expect(isSafeVideoSrc("")).toBe(false);
    expect(isSafeVideoSrc("/images/home/strip-1.jpg")).toBe(false);
    expect(isSafeVideoSrc("videos/a.mp4")).toBe(false);
    expect(isSafeVideoSrc("/videos/../api/x")).toBe(false);
    expect(isSafeVideoSrc("/videos/%2E%2E/api")).toBe(false);
    expect(isSafeVideoSrc("/videos\\..\\x")).toBe(false);
  });

  it("is not satisfied by a video path where an image is expected", () => {
    expect(isSafeImageSrc("/videos/home/strip-1.mp4")).toBe(false);
  });
});
