import Link from "next/link";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <main className="legal-page wrap"><header className="legal-header"><Link className="wordmark" href="/">AFFLIO</Link><Link href="/contact">Contact</Link></header><article className="legal-card"><p className="auth-eyebrow">Effective July 12, 2026</p><h1>{title}</h1><p className="legal-intro">{intro}</p><div className="legal-content">{children}</div></article><footer className="legal-footer"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refund-policy">Refunds</Link><Link href="/report-abuse">Report abuse</Link></footer></main>;
}
