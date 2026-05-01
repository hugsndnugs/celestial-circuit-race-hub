"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserEmail, isAllowedAdmin, isAllowedDeveloper } from "@/lib/controller/admin-auth";
import { defaultHomepageSettings, loadHomepageSettings, type HomepageSettings } from "@/lib/homepage-settings";

const HOME_ROTATOR_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type HubTarget = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

const targets: HubTarget[] = [
  {
    title: "Team Signup",
    description: "Public team registration intake and submission flow.",
    href: "/signups",
    cta: "Open team signup",
  },
  {
    title: "Race Rules and Terms",
    description: "Public race regulations, terms of service, and legal notices.",
    href: "/docs",
    cta: "Open race docs",
  },
  {
    title: "Status",
    description: "System status page and race-day alerts.",
    href: "/status",
    cta: "Open status",
  },
];

export default function HomePage() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showRaceControllerCard, setShowRaceControllerCard] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>(defaultHomepageSettings);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function checkControllerAccess() {
      try {
        const email = await getCurrentUserEmail();
        if (!email) {
          if (!isMounted) return;
          setShowRaceControllerCard(false);
          return;
        }
        const [adminAllowed, developerAllowed] = await Promise.all([isAllowedAdmin(email), isAllowedDeveloper(email)]);
        if (!isMounted) return;
        setShowRaceControllerCard(adminAllowed || developerAllowed);
      } catch {
        if (!isMounted) return;
        setShowRaceControllerCard(false);
      } finally {
        if (!isMounted) return;
        setIsCheckingAccess(false);
      }
    }
    void checkControllerAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      const settings = await loadHomepageSettings();
      if (!isMounted) return;
      setHomepageSettings(settings);
      setActiveSlideIndex(0);
    }
    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (homepageSettings.slides.length <= 1) return;
    const mediaQuery =
      typeof globalThis.matchMedia === "function" ? globalThis.matchMedia(HOME_ROTATOR_REDUCED_MOTION_QUERY) : null;
    if (mediaQuery?.matches) return;
    const intervalMs = homepageSettings.rotationIntervalSeconds * 1000;
    const handle = globalThis.setInterval(() => {
      setActiveSlideIndex((current) => (current + 1) % homepageSettings.slides.length);
    }, intervalMs);
    return () => globalThis.clearInterval(handle);
  }, [homepageSettings.rotationIntervalSeconds, homepageSettings.slides.length]);

  const visibleTargets = useMemo(() => {
    if (!showRaceControllerCard) return targets;
    return [
      {
        title: "Race Controller",
        description: "Admin, marshal logging, and real-time leaderboard operations.",
        href: "/controller",
        cta: "Open race controller",
      },
      ...targets,
    ];
  }, [showRaceControllerCard]);

  const activeSlide = homepageSettings.slides[activeSlideIndex] ?? homepageSettings.slides[0];

  return (
    <main className="home-main">
      <section className="home-hero" aria-label="Featured Celestial Circuit homepage content">
        <div className="home-hero-copy">
          <p className="home-eyebrow">{homepageSettings.eyebrow}</p>
          <h1>{homepageSettings.headline}</h1>
          <p>{homepageSettings.intro}</p>
          <div className="home-hero-actions">
            <Link className="cc-link" href={homepageSettings.primaryCtaHref}>
              {homepageSettings.primaryCtaLabel}
            </Link>
            <Link className="cc-link secondary" href={homepageSettings.secondaryCtaHref}>
              {homepageSettings.secondaryCtaLabel}
            </Link>
          </div>
        </div>
        <div className="home-feature-card">
          <div className={activeSlide?.imageUrl ? "home-feature-image" : "home-feature-image home-feature-placeholder"}>
            {activeSlide?.imageUrl ? (
              <img src={activeSlide.imageUrl} alt={activeSlide.altText || activeSlide.title || "Homepage feature"} />
            ) : (
              <span>Admin image slot</span>
            )}
          </div>
          <div className="home-feature-content">
            <p className="home-feature-kicker">
              Rotates every {homepageSettings.rotationIntervalSeconds}s
            </p>
            <h2>{activeSlide?.title}</h2>
            <p>{activeSlide?.caption}</p>
            {activeSlide?.ctaLabel && activeSlide.ctaHref ? (
              <Link className="button-link secondary" href={activeSlide.ctaHref}>
                {activeSlide.ctaLabel}
              </Link>
            ) : null}
          </div>
          {homepageSettings.slides.length > 1 ? (
            <div className="home-slide-controls" aria-label="Homepage feature slides">
              {homepageSettings.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show ${slide.title || `slide ${index + 1}`}`}
                  aria-current={index === activeSlideIndex ? "true" : undefined}
                  onClick={() => setActiveSlideIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="home-section-intro">
        <p className="home-eyebrow">Quick paths</p>
        <h2>Choose your race-day destination</h2>
        <p className="muted">Jump into registration, public race information, operations, or live standings.</p>
      </section>

      <section className="grid" aria-label="Hub destinations">
        {(isCheckingAccess ? targets : visibleTargets).map((target) => (
          <article key={target.title} className="card">
            <h2>{target.title}</h2>
            <p className="muted">{target.description}</p>
            <Link className="cc-link" href={target.href}>
              {target.cta}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
