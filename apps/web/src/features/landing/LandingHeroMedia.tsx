import { useEffect, useRef, useState } from "react";

const POSTER = "/f16-4/hero-poster.webp";
const MOBILE_QUERY = "(max-width: 600px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const sources = {
  mobile: {
    webm: "/f16-4/hero-mobile.webm",
    mp4: "/f16-4/hero-mobile.mp4",
  },
  desktop: {
    webm: "/f16-4/hero-motion.webm",
    mp4: "/f16-4/hero-motion.mp4",
  },
} as const;

function watchMediaQuery(query: string, onChange: (matches: boolean) => void) {
  const media = window.matchMedia(query);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  onChange(media.matches);
  if (media.addEventListener) media.addEventListener("change", listener);
  else media.addListener(listener);
  return () => {
    if (media.removeEventListener) media.removeEventListener("change", listener);
    else media.removeListener(listener);
  };
}

export function LandingHeroMedia() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [inView, setInView] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const mediaSources = sources[isMobile ? "mobile" : "desktop"];
  const shouldLoadVideo = !reducedMotion && inView && !videoFailed;

  useEffect(() => {
    const stopWatchingMotion = watchMediaQuery(REDUCED_MOTION_QUERY, setReducedMotion);
    const stopWatchingViewport = watchMediaQuery(MOBILE_QUERY, setIsMobile);
    return () => {
      stopWatchingMotion();
      stopWatchingViewport();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setInView(entry.isIntersecting);
      if (!entry.isIntersecting) setVideoReady(false);
    }, { rootMargin: "0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setVideoFailed(false);
    setVideoReady(false);
  }, [isMobile]);

  return (
    <div ref={containerRef} className="f162-visual" aria-hidden="true">
      <img
        className="f162-art-image"
        src={POSTER}
        alt=""
        fetchPriority="high"
        decoding="async"
        width="1280"
        height="720"
      />
      {shouldLoadVideo && (
        <video
          key={isMobile ? "mobile" : "desktop"}
          className={`f162-art-image f162-motion-video${videoReady ? " is-ready" : ""}`}
          autoPlay
          muted
          loop
          playsInline
          poster={POSTER}
          preload="none"
          onCanPlay={(event) => {
            void event.currentTarget.play()
              .then(() => setVideoReady(true))
              .catch(() => setVideoReady(false));
          }}
          onError={() => {
            setVideoFailed(true);
            setVideoReady(false);
          }}
        >
          <source src={mediaSources.webm} type="video/webm" />
          <source src={mediaSources.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
