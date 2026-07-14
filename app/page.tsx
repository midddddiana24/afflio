"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const FAQS = [
  {
    q: "Does this work with Shopee, Lazada, and TikTok Shop links?",
    a: "Yes — Afflio wraps any URL, including affiliate links from Shopee, Lazada, TikTok Shop, and standalone stores. If it's a link, it can get a card.",
  },
  {
    q: "Do tokens expire?",
    a: "No. Buy them once, use them whenever. A token is only spent when you create a new card.",
  },
  {
    q: "How does GCash payment work?",
    a: "Send payment to the GCash number shown at checkout, upload your reference number, and tokens land in your account once it's confirmed — usually within a few hours.",
  },
  {
    q: "Can I see who clicked, not just how many?",
    a: "You get click counts, timestamps, and referrer (which platform sent the click) — not personal viewer data. That's by design.",
  },
  {
    q: "What image sizes are allowed?",
    a: "JPG, PNG, or WebP up to 10MB. We resize it automatically so the preview card looks right on every platform.",
  },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ctaState, setCtaState] = useState<"" | "loading" | "success">("");
  const revealRootRef = useScrollReveal();

  function handleDemoClick() {
    if (ctaState === "loading") return;
    setCtaState("loading");
    setTimeout(() => {
      setCtaState("success");
      setTimeout(() => setCtaState(""), 1600);
    }, 900);
  }

  return (
    <div ref={revealRootRef}>
      <nav className="nav-pill" aria-label="Primary">
        <a className="wordmark" href="#top">
          AFFLIO
        </a>
        <ul className="nav-pill__links">
          <li>
            <a href="#how">How it works</a>
          </li>
          <li>
            <a href="#pricing">Pricing</a>
          </li>
          <li>
            <a href="#faq">FAQ</a>
          </li>
        </ul>
        <Link
          className="btn btn-outline btn-outline-nav"
          href="/login"
          style={{ padding: "0.55rem 1rem" }}
        >
          Log in
        </Link>
        <a className="btn btn-fill" href="#pricing">
          Start free
        </a>
        <button
          className="nav-pill__toggle"
          aria-label="Open menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </nav>
      <div className={`nav-drawer${navOpen ? " is-open" : ""}`}>
        <a href="#how" onClick={() => setNavOpen(false)}>
          How it works
        </a>
        <a href="#pricing" onClick={() => setNavOpen(false)}>
          Pricing
        </a>
        <a href="#faq" onClick={() => setNavOpen(false)}>
          FAQ
        </a>
        <Link href="/login" onClick={() => setNavOpen(false)}>
          Log in
        </Link>
      </div>

      <main id="top">
        <section className="hero wrap">
          <div className="hero-grid">
            <h1>Turn product photos into trackable links.</h1>
            <div className="hero-side">
              <p>
                Paste a Shopee, Lazada, or TikTok Shop link, drop in a photo,
                and Afflio hands you a clean card that previews properly on
                Facebook, TikTok bio, and group chats — with every click
                counted.
              </p>
              <div className="hero-cta-row">
                <button
                  className="btn btn-fill"
                  type="button"
                  data-state={ctaState}
                  onClick={handleDemoClick}
                >
                  <span className="spinner" />
                  <span className="btn-label">
                    {ctaState === "success" ? "Redirecting…" : "Start free"}
                  </span>
                </button>
                <a className="btn btn-outline" href="#how">
                  See how it works
                </a>
              </div>
              <span className="hero-note">
                5 free cards to start · no credit card
              </span>
            </div>
          </div>
        </section>

        <section className="stages wrap" id="how">
          <div className="stages-head" data-reveal>
            <h2>Four steps. No dashboard tour needed.</h2>
          </div>

          <div className="stage" data-reveal>
            <div className="stage-text">
              <span className="stage-num">1.0</span>
              <h3>Upload the photo.</h3>
              <p>
                Any product shot works — a screenshot from the Shopee app, a
                phone photo, a Canva export. JPG, PNG, or WebP, up to 10MB.
              </p>
            </div>
            <div className="stage-visual">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect
                  x="14"
                  y="24"
                  width="92"
                  height="72"
                  rx="8"
                  stroke="var(--color-rule-2)"
                  strokeWidth={2}
                />
                <circle
                  cx="38"
                  cy="48"
                  r="7"
                  stroke="var(--color-neutral)"
                  strokeWidth={2}
                />
                <path
                  d="M14 82L44 58L64 74L84 54L106 82"
                  stroke="var(--color-neutral)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <path
                  d="M60 14V2M60 2L52 10M60 2L68 10"
                  stroke="var(--color-ink)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="stage" data-reveal>
            <div className="stage-text">
              <span className="stage-num">2.0</span>
              <h3>Afflio wraps the link.</h3>
              <p>
                You get a short URL that carries your photo and caption in
                its preview, so it shows a real card instead of a raw
                checkout link.
              </p>
            </div>
            <div className="stage-visual">
              <div className="mock-card">
                <div className="mock-card__img">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-muted)"
                    strokeWidth={1.6}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div className="mock-card__body">
                  <p className="mock-card__title">
                    Matte tumbler, 500ml — ₱249
                  </p>
                  <p className="mock-card__domain">afflio.link/k3m9q</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stage" data-reveal>
            <div className="stage-text">
              <span className="stage-num">3.0</span>
              <h3>Share it anywhere.</h3>
              <p>
                Bio link, Facebook post, seller group chat, SMS — the card
                renders the same way everywhere, so viewers see the product
                before they tap.
              </p>
            </div>
            <div className="stage-visual">
              <svg width="180" height="90" viewBox="0 0 180 90" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="80"
                  height="36"
                  rx="8"
                  stroke="var(--color-rule-2)"
                  strokeWidth={2}
                />
                <text
                  x="44"
                  y="27"
                  textAnchor="middle"
                  fontFamily="Inter"
                  fontSize="12"
                  fill="var(--color-neutral)"
                >
                  Bio link
                </text>
                <rect
                  x="96"
                  y="4"
                  width="80"
                  height="36"
                  rx="8"
                  stroke="var(--color-rule-2)"
                  strokeWidth={2}
                />
                <text
                  x="136"
                  y="27"
                  textAnchor="middle"
                  fontFamily="Inter"
                  fontSize="12"
                  fill="var(--color-neutral)"
                >
                  FB post
                </text>
                <rect
                  x="50"
                  y="50"
                  width="80"
                  height="36"
                  rx="8"
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                />
                <text
                  x="90"
                  y="73"
                  textAnchor="middle"
                  fontFamily="Inter"
                  fontSize="12"
                  fill="var(--color-ink)"
                >
                  Group chat
                </text>
              </svg>
            </div>
          </div>

          <div className="stage" data-reveal>
            <div className="stage-text">
              <span className="stage-num">4.0</span>
              <h3>Watch the clicks land.</h3>
              <p>
                Every tap is logged the moment it happens — see totals per
                card, and which one to post again.
              </p>
            </div>
            <div className="stage-visual">
              <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
                <line
                  x1="10"
                  y1="90"
                  x2="170"
                  y2="90"
                  stroke="var(--color-rule-2)"
                  strokeWidth={1.5}
                />
                <rect
                  x="20"
                  y="62"
                  width="18"
                  height="28"
                  rx="2"
                  fill="var(--color-rule-2)"
                />
                <rect
                  x="50"
                  y="46"
                  width="18"
                  height="44"
                  rx="2"
                  fill="var(--color-rule-2)"
                />
                <rect
                  x="80"
                  y="58"
                  width="18"
                  height="32"
                  rx="2"
                  fill="var(--color-rule-2)"
                />
                <rect
                  x="110"
                  y="30"
                  width="18"
                  height="60"
                  rx="2"
                  fill="var(--color-ink)"
                />
                <rect
                  x="140"
                  y="18"
                  width="18"
                  height="72"
                  rx="2"
                  fill="var(--color-ink)"
                />
              </svg>
            </div>
          </div>
        </section>

        <section className="pricing wrap" id="pricing">
          <div className="pricing-head" data-reveal>
            <h2>Pay for cards, not seats.</h2>
            <p className="muted">
              Tokens don&apos;t expire. One token makes one card. GCash and
              Maya accepted.
            </p>
          </div>
          <div className="pricing-grid">
            <div className="price-card" data-reveal>
              <h3>Starter</h3>
              <p className="price-amount">Free</p>
              <ul className="price-list">
                <li>5 tokens, one time</li>
                <li>Basic click counter</li>
                <li>Afflio-branded short links</li>
              </ul>
              <Link className="btn btn-outline" href="/signup">
                Start free
              </Link>
            </div>
            <div className="price-card is-featured" data-reveal>
              <h3>Creator</h3>
              <p className="price-amount">
                ₱299<span>/ 60 tokens</span>
              </p>
              <ul className="price-list">
                <li>60 tokens, no expiry</li>
                <li>Click analytics by day + referrer</li>
                <li>Custom captions per card</li>
              </ul>
              <Link className="btn btn-fill" href="/signup?plan=creator">
                Buy tokens
              </Link>
            </div>
            <div className="price-card" data-reveal>
              <h3>Agency</h3>
              <p className="price-amount">
                ₱899<span>/ 250 tokens</span>
              </p>
              <ul className="price-list">
                <li>250 tokens, no expiry</li>
                <li>Up to 5 team members</li>
                <li>Bulk upload from a spreadsheet</li>
              </ul>
              <Link className="btn btn-outline" href="/signup?plan=agency">
                Buy tokens
              </Link>
            </div>
          </div>
          <p className="price-fine">
            Introductory pricing while Afflio is in early access — subject to
            change.
          </p>
        </section>

        <section className="faq wrap" id="faq">
          <div className="faq-head" data-reveal>
            <h2>Questions we actually get</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((item, i) => (
              <div className="faq-item" data-open={openFaq === i} key={item.q}>
                <button
                  className="faq-q"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span className="plus" />
                </button>
                <div className="faq-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-strip wrap">
          <div className="cta-strip-inner">
            <h2>Your next post could be a card.</h2>
            <Link className="btn btn-fill" href="/signup">
              Start free — takes 2 minutes
            </Link>
          </div>
        </section>
      </main>

      <footer className="foot-mast wrap">
        <p className="wordmark">AFFLIO</p>
        <div className="foot-mast-row">
          <p className="tagline">
            Built for Filipino affiliates who&apos;d rather post than fight
            with link previews.
          </p>
          <ul className="foot-links">
            <li>
              <Link href="/terms">Terms</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
