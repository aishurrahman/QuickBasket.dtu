"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";

const slides = [
  {
    badge: "Live — delivering in your area",
    title: ["Groceries, snacks", "essentials —", "delivered before", "you know it."],
    description:
      "Fresh produce, dairy, bakery & household staples. Tap to add, checkout in seconds, track your rider live.",
    deliveryTime: "~10 MIN*",
    foods: ["🥑", "🍊", "🥛", "🥕"],
    cards: ["🟢 Fresh · Today", "🚴 Rider assigned · 2 min", "⭐ 12k+ orders delivered"],
  },
  {
    badge: "Fresh picks, picked for you",
    title: ["Bring home", "fresh today —", "from local", "favorites."],
    description:
      "Stock up on crisp produce and daily favorites, selected with care and delivered straight to your door.",
    deliveryTime: "FRESH PICKS",
    foods: ["🍓", "🥬", "🍋", "🍅"],
    cards: ["🍃 Picked fresh", "🥬 Great seasonal picks", "⭐ Loved by shoppers"],
  },
  {
    badge: "Your everyday, made easy",
    title: ["Forgot a few", "essentials?", "We’ll bring them", "in just minutes —"],
    description:
      "From breakfast basics to last-minute snacks, get the everyday essentials you need without the extra trip.",
    deliveryTime: "EASY TOP-UP",
    foods: ["🍞", "🥚", "☕", "🍌"],
    cards: ["🧺 Easy top-up", "🚴 At your doorstep", "⭐ Everyday favorites"],
  },
];

type HeroCarouselProps = {
  categoryHref: string;
};

export function HeroCarousel({ categoryHref }: HeroCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const slide = slides[activeSlide];

  useEffect(() => {
    if (!rotationEnabled) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveSlide((current) => (current + 1) % slides.length);
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [rotationEnabled]);

  function showSlide(index: number) {
    setActiveSlide((index + slides.length) % slides.length);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;

    if (startX === null || endX === undefined) return;
    const distance = endX - startX;
    if (Math.abs(distance) < 48) return;

    showSlide(activeSlide + (distance < 0 ? 1 : -1));
  }

  return (
    <section
      aria-label="Featured offers"
      aria-roledescription="carousel"
      className="motion-hero relative overflow-hidden px-4 text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="motion-hero-bg" aria-hidden="true" />
      <div className="motion-hero-grid" aria-hidden="true" />
      <div className="motion-hero-orb motion-hero-orb-one" aria-hidden="true" />
      <div className="motion-hero-orb motion-hero-orb-two" aria-hidden="true" />
      <div className="motion-hero-orb motion-hero-orb-three" aria-hidden="true" />
      <span className="motion-hero-particle motion-hero-particle-one" aria-hidden="true" />
      <span className="motion-hero-particle motion-hero-particle-two" aria-hidden="true" />
      <span className="motion-hero-particle motion-hero-particle-three" aria-hidden="true" />
      <span className="motion-hero-particle motion-hero-particle-four" aria-hidden="true" />

      <div
        key={activeSlide}
        role="group"
        aria-roledescription="slide"
        aria-label={`Offer ${activeSlide + 1} of ${slides.length}`}
        aria-live="polite"
        className="motion-hero-slide relative z-10 mx-auto grid max-w-6xl items-center gap-6 py-8 pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-10 lg:pb-14"
      >
        <div>
          <div className="motion-hero-badge">
            <span className="motion-hero-badge-dot" aria-hidden="true" />
            {slide.badge}
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-emerald-700">⚡ {slide.deliveryTime}</span>
          </div>

          <h1 className="motion-hero-title mt-4 text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.9rem]">
            {slide.title.map((line, index) => (
              <span key={line}>
                {index === 1 ? <span className="motion-hero-title-gradient">{line}</span> : line}
                {index < slide.title.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="motion-hero-sub mt-4 max-w-[32rem] text-[15px] leading-relaxed text-emerald-50/95">
            {slide.description}
          </p>

          <div className="motion-hero-ctas mt-6 flex flex-wrap gap-3">
            <Link
              href="#shop"
              className="motion-hero-cta-primary inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-emerald-700 shadow-[0_10px_28px_rgb(0_0_0/0.18)]"
            >
              Shop now <span className="motion-hero-cta-arrow">→</span>
            </Link>
            <Link
              href={categoryHref}
              className="motion-hero-cta-secondary inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/14 px-6 py-3.5 text-sm font-bold text-white"
            >
              Browse categories
            </Link>
          </div>

          <div className="motion-hero-proof mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-amber-200 text-xs">😊</span>
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-emerald-200 text-xs">🥰</span>
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-sky-200 text-xs">😎</span>
              </div>
              <div className="text-xs leading-none">
                <div className="flex items-center gap-1 font-extrabold text-white">
                  <span className="text-amber-300">★★★★★</span> 4.8/5
                </div>
                <div className="text-emerald-100">2,400+ happy customers</div>
              </div>
            </div>
            <span className="hidden h-8 w-px bg-white/20 sm:block" aria-hidden="true" />
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-100">
              <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">✓ Free delivery over $25</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">✓ Cash on delivery</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-none text-emerald-100/80">*Estimated delivery time — illustrative only, not a guarantee.</p>
        </div>

        <div className="motion-hero-visual" aria-hidden="true">
          <div className="motion-hero-connector motion-hero-connector-one" />
          <span className="motion-hero-basket">🧺</span>
          {slide.foods.map((food, index) => (
            <span key={food} className={`motion-hero-food motion-hero-food-${["one", "two", "three", "four"][index]}`}>
              {food}
            </span>
          ))}
          {slide.cards.map((card, index) => (
            <div key={card} className={`motion-hero-float-card motion-hero-float-card-${["one", "two", "three"][index]}`}>
              {card}
            </div>
          ))}
        </div>
      </div>

      <div className="motion-hero-controls absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        <button
          type="button"
          aria-label={rotationEnabled ? "Pause automatic slide rotation" : "Resume automatic slide rotation"}
          onClick={() => setRotationEnabled((enabled) => !enabled)}
          className="motion-hero-control grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-emerald-950/20 text-sm font-bold text-white"
        >
          {rotationEnabled ? "Ⅱ" : "▶"}
        </button>
        <button
          type="button"
          aria-label="Previous featured offer"
          onClick={() => showSlide(activeSlide - 1)}
          className="motion-hero-control grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-emerald-950/20 text-lg font-bold text-white"
        >
          ←
        </button>
        <div className="flex items-center gap-2" role="group" aria-label="Choose featured offer">
          {slides.map((item, index) => (
            <button
              key={item.badge}
              type="button"
              aria-label={`Show offer ${index + 1} of ${slides.length}`}
              aria-current={index === activeSlide ? "true" : undefined}
              onClick={() => showSlide(index)}
              className={`motion-hero-indicator h-2.5 rounded-full bg-white ${index === activeSlide ? "is-active w-6" : "w-2.5 opacity-60"}`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next featured offer"
          onClick={() => showSlide(activeSlide + 1)}
          className="motion-hero-control grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-emerald-950/20 text-lg font-bold text-white"
        >
          →
        </button>
      </div>
    </section>
  );
}
