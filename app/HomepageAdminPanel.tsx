"use client";

import { useEffect, useState } from "react";
import {
  defaultHomepageSettings,
  saveHomepageSettings,
  type HomepageSettings,
  type HomepageSlide,
} from "@/lib/homepage-settings";

type HomepageAdminPanelProps = {
  settings: HomepageSettings;
  onSettingsSaved: (settings: HomepageSettings) => void;
};

function createHomepageSlide(): HomepageSettings["slides"][number] {
  const cryptoApi = globalThis.crypto;
  return {
    id: cryptoApi && typeof cryptoApi.randomUUID === "function" ? cryptoApi.randomUUID() : `${Date.now()}`,
  title: "",
  caption: "",
  imageUrl: "",
  altText: "",
  ctaLabel: "",
  ctaHref: "",
  };
}

export function HomepageAdminPanel({ settings, onSettingsSaved }: HomepageAdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<HomepageSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("Homepage settings ready.");

  useEffect(() => {
    if (!isOpen) setDraftSettings(settings);
  }, [isOpen, settings]);

  function updateHomepageField<K extends keyof Omit<HomepageSettings, "slides">>(field: K, value: HomepageSettings[K]) {
    setDraftSettings((previous) => ({ ...previous, [field]: value }));
  }

  function updateHomepageSlide(index: number, field: keyof HomepageSlide, value: string) {
    setDraftSettings((previous) => ({
      ...previous,
      slides: previous.slides.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, [field]: value } : slide
      ),
    }));
  }

  function addHomepageSlide() {
    setDraftSettings((previous) => ({
      ...previous,
      slides: [...previous.slides, createHomepageSlide()].slice(0, 8),
    }));
  }

  function removeHomepageSlide(index: number) {
    setDraftSettings((previous) => {
      const nextSlides = previous.slides.filter((_slide, slideIndex) => slideIndex !== index);
      return { ...previous, slides: nextSlides.length > 0 ? nextSlides : [createHomepageSlide()] };
    });
  }

  async function submitHomepageSettings(event: { preventDefault: () => void }) {
    event.preventDefault();
    try {
      setIsSaving(true);
      const saved = await saveHomepageSettings(draftSettings);
      setDraftSettings(saved);
      onSettingsSaved(saved);
      setStatus("Homepage settings saved.");
    } catch (error) {
      console.error("Failed to save homepage settings", error);
      setStatus(error instanceof Error ? error.message : "Failed to save homepage settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="home-admin-cog"
        aria-label="Open homepage admin settings"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path
            fill="currentColor"
            d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8 8 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5a10 10 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
          />
        </svg>
      </button>
      {isOpen ? (
        <section className="card home-admin-panel" role="dialog" aria-modal="false" aria-labelledby="homepage-admin-title">
          <div className="home-admin-panel-header">
            <div>
              <p className="home-eyebrow">Admin only</p>
              <h2 id="homepage-admin-title">Homepage Content</h2>
              <p className="muted">
                Choose the public homepage copy, feature images, and how often the image slot rotates.
              </p>
            </div>
            <button type="button" className="secondary" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>
          <form className="admin-form" onSubmit={submitHomepageSettings}>
            <label htmlFor="homepageEyebrow">Eyebrow</label>
            <input
              id="homepageEyebrow"
              value={draftSettings.eyebrow}
              onChange={(eventItem) => updateHomepageField("eyebrow", eventItem.target.value)}
              placeholder="Celestial Circuit"
            />
            <label htmlFor="homepageHeadline">Headline</label>
            <input
              id="homepageHeadline"
              value={draftSettings.headline}
              onChange={(eventItem) => updateHomepageField("headline", eventItem.target.value)}
              placeholder="Race-day tools, team registration, and live operations in one orbit."
            />
            <label htmlFor="homepageIntro">Intro copy</label>
            <textarea
              id="homepageIntro"
              value={draftSettings.intro}
              onChange={(eventItem) => updateHomepageField("intro", eventItem.target.value)}
              rows={3}
            />
            <div className="admin-form-grid">
              <div>
                <label htmlFor="homepagePrimaryCtaLabel">Primary CTA label</label>
                <input
                  id="homepagePrimaryCtaLabel"
                  value={draftSettings.primaryCtaLabel}
                  onChange={(eventItem) => updateHomepageField("primaryCtaLabel", eventItem.target.value)}
                />
              </div>
              <div>
                <label htmlFor="homepagePrimaryCtaHref">Primary CTA link</label>
                <input
                  id="homepagePrimaryCtaHref"
                  value={draftSettings.primaryCtaHref}
                  onChange={(eventItem) => updateHomepageField("primaryCtaHref", eventItem.target.value)}
                  placeholder="/signups"
                />
              </div>
              <div>
                <label htmlFor="homepageSecondaryCtaLabel">Secondary CTA label</label>
                <input
                  id="homepageSecondaryCtaLabel"
                  value={draftSettings.secondaryCtaLabel}
                  onChange={(eventItem) => updateHomepageField("secondaryCtaLabel", eventItem.target.value)}
                />
              </div>
              <div>
                <label htmlFor="homepageSecondaryCtaHref">Secondary CTA link</label>
                <input
                  id="homepageSecondaryCtaHref"
                  value={draftSettings.secondaryCtaHref}
                  onChange={(eventItem) => updateHomepageField("secondaryCtaHref", eventItem.target.value)}
                  placeholder="/docs"
                />
              </div>
            </div>
            <label htmlFor="homepageRotationInterval">Rotation interval in seconds</label>
            <input
              id="homepageRotationInterval"
              type="number"
              min={3}
              max={120}
              value={draftSettings.rotationIntervalSeconds}
              onChange={(eventItem) =>
                updateHomepageField("rotationIntervalSeconds", Number.parseInt(eventItem.target.value, 10) || 8)
              }
            />
            <div className="admin-actions">
              <button type="button" className="secondary" onClick={addHomepageSlide} disabled={draftSettings.slides.length >= 8}>
                Add image slot
              </button>
              <button type="button" className="secondary" onClick={() => setDraftSettings(defaultHomepageSettings)}>
                Reset to defaults
              </button>
            </div>
            <div className="admin-list">
              {draftSettings.slides.map((slide, index) => (
                <fieldset key={slide.id} className="admin-list-item">
                  <legend>Slide {index + 1}</legend>
                  <label htmlFor={`homepageSlideTitle-${slide.id}`}>Slide title</label>
                  <input
                    id={`homepageSlideTitle-${slide.id}`}
                    value={slide.title}
                    onChange={(eventItem) => updateHomepageSlide(index, "title", eventItem.target.value)}
                    placeholder="Showcase race-day moments"
                  />
                  <label htmlFor={`homepageSlideCaption-${slide.id}`}>Caption</label>
                  <textarea
                    id={`homepageSlideCaption-${slide.id}`}
                    value={slide.caption}
                    onChange={(eventItem) => updateHomepageSlide(index, "caption", eventItem.target.value)}
                    rows={2}
                  />
                  <label htmlFor={`homepageSlideImage-${slide.id}`}>Image URL</label>
                  <input
                    id={`homepageSlideImage-${slide.id}`}
                    value={slide.imageUrl}
                    onChange={(eventItem) => updateHomepageSlide(index, "imageUrl", eventItem.target.value)}
                    placeholder="https://..."
                  />
                  <label htmlFor={`homepageSlideAlt-${slide.id}`}>Image alt text</label>
                  <input
                    id={`homepageSlideAlt-${slide.id}`}
                    value={slide.altText}
                    onChange={(eventItem) => updateHomepageSlide(index, "altText", eventItem.target.value)}
                  />
                  <div className="admin-form-grid">
                    <div>
                      <label htmlFor={`homepageSlideCtaLabel-${slide.id}`}>Slide CTA label</label>
                      <input
                        id={`homepageSlideCtaLabel-${slide.id}`}
                        value={slide.ctaLabel}
                        onChange={(eventItem) => updateHomepageSlide(index, "ctaLabel", eventItem.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`homepageSlideCtaHref-${slide.id}`}>Slide CTA link</label>
                      <input
                        id={`homepageSlideCtaHref-${slide.id}`}
                        value={slide.ctaHref}
                        onChange={(eventItem) => updateHomepageSlide(index, "ctaHref", eventItem.target.value)}
                        placeholder="/status"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => removeHomepageSlide(index)}
                    disabled={draftSettings.slides.length <= 1}
                  >
                    Remove slide
                  </button>
                </fieldset>
              ))}
            </div>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving homepage..." : "Save homepage content"}
            </button>
            <p role="status" aria-live="polite">{status}</p>
          </form>
        </section>
      ) : null}
    </>
  );
}
