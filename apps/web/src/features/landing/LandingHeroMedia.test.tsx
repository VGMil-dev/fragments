// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingHeroMedia } from "./LandingHeroMedia";

type MediaQueryStub = MediaQueryList & { notify: (matches: boolean) => void };

const mediaQueries = new Map<string, MediaQueryStub>();
const observers: FakeIntersectionObserver[] = [];

class FakeIntersectionObserver {
  private readonly callback: IntersectionObserverCallback;
  private target: Element | null = null;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }

  observe(target: Element) {
    this.target = target;
  }

  unobserve() {
    this.target = null;
  }

  disconnect() {
    this.target = null;
  }

  notify(isIntersecting: boolean) {
    if (!this.target) return;
    this.callback(
      [{
        isIntersecting,
        target: this.target,
        intersectionRatio: isIntersecting ? 1 : 0,
        boundingClientRect: this.target.getBoundingClientRect(),
        intersectionRect: this.target.getBoundingClientRect(),
        rootBounds: null,
        time: 0,
      } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function stubMediaQuery(query: string, matches: boolean): MediaQueryStub {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    media: query,
    get matches() { return matches; },
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    dispatchEvent: () => true,
    notify: (next: boolean) => {
      matches = next;
      const event = { matches: next, media: query } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
    },
  } as MediaQueryStub;
  mediaQueries.set(query, media);
  return media;
}

describe("LandingHeroMedia", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mediaQueries.clear();
    observers.length = 0;
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 390 });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.stubGlobal("matchMedia", vi.fn());
    window.matchMedia = vi.fn((query: string) => {
      const existing = mediaQueries.get(query);
      if (existing) return existing;
      const defaultMatch = query === "(prefers-reduced-motion: reduce)" ? false : window.innerWidth <= 600;
      return stubMediaQuery(query, defaultMatch);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderMedia() {
    await act(async () => {
      root.render(<LandingHeroMedia />);
      await Promise.resolve();
    });
  }

  async function enterViewport() {
    await act(async () => observers[0]?.notify(true));
  }

  async function setMediaQuery(query: string, matches: boolean) {
    await act(async () => mediaQueries.get(query)?.notify(matches));
  }

  it("conserva el poster y no monta fuentes bajo reduced motion", async () => {
    mediaQueries.clear();
    window.matchMedia = vi.fn((query: string) => stubMediaQuery(query, query === "(prefers-reduced-motion: reduce)"));

    await renderMedia();
    await enterViewport();

    expect(container.querySelector('img[src="/f16-4/hero-poster.webp"]')).not.toBeNull();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelectorAll("source")).toHaveLength(0);
  });

  it("carga una sola variante silenciosa cuando entra en viewport y la detiene al salir", async () => {
    await renderMedia();
    expect(container.querySelector("video")).toBeNull();

    await enterViewport();

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.hasAttribute("autoplay")).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.controls).toBe(false);
    expect(video?.playsInline).toBe(true);
    expect(video?.preload).toBe("none");
    expect(video?.poster).toContain("/f16-4/hero-poster.webp");
    expect(Array.from(container.querySelectorAll("source")).map((source) => source.src)).toEqual([
      expect.stringContaining("/hero-mobile.webm"),
      expect.stringContaining("/hero-mobile.mp4"),
    ]);

    await act(async () => observers[0]?.notify(false));
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src="/f16-4/hero-poster.webp"]')).not.toBeNull();
  });

  it("retiene el poster y quita las fuentes si el video falla", async () => {
    await renderMedia();
    await enterViewport();
    const video = container.querySelector("video");
    expect(video).not.toBeNull();

    await act(async () => video?.dispatchEvent(new Event("error")));

    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelectorAll("source")).toHaveLength(0);
    expect(container.querySelector('img[src="/f16-4/hero-poster.webp"]')).not.toBeNull();
  });

  it("selecciona solo recursos de escritorio en un viewport amplio", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
    await renderMedia();
    await enterViewport();

    expect(Array.from(container.querySelectorAll("source")).map((source) => source.src)).toEqual([
      expect.stringContaining("/hero-motion.webm"),
      expect.stringContaining("/hero-motion.mp4"),
    ]);
    expect(container.innerHTML).not.toContain("hero-mobile");
  });

  it("desmonta video y fuentes si el usuario activa reduced motion", async () => {
    await renderMedia();
    await enterViewport();
    expect(container.querySelector("video")).not.toBeNull();

    await setMediaQuery("(prefers-reduced-motion: reduce)", true);

    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelectorAll("source")).toHaveLength(0);
    expect(container.querySelector('img[src="/f16-4/hero-poster.webp"]')).not.toBeNull();
  });

  it("cambia a una sola fuente de escritorio al cruzar el ancho móvil", async () => {
    await renderMedia();
    await enterViewport();
    expect(container.innerHTML).toContain("hero-mobile.webm");

    await setMediaQuery("(max-width: 600px)", false);

    expect(container.innerHTML).toContain("hero-motion.webm");
    expect(container.innerHTML).not.toContain("hero-mobile");
  });
});
