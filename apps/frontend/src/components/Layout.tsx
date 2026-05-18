import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import NicheSelector from './NicheSelector';

type LayoutProps = {
  children: ReactNode;
  niches: string[];
  selectedNiche: string;
  onChangeNiche: (niche: string) => void;
};

export default function Layout({ children, niches, selectedNiche, onChangeNiche }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex flex-col leading-none text-text"
            aria-label="Signal home"
          >
            <span className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
              <span>Signal</span>
              <span
                className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_6px_rgba(163,230,53,0.12)] animate-pulse"
                style={{ animationDuration: '2s' }}
              />
            </span>
            <span className="mt-2 text-xs font-normal text-muted sm:text-sm">
              What sharp minds are converging on
            </span>
          </Link>

          <div className="hidden flex-1 justify-center md:flex">
            <NicheSelector niches={niches} selectedNiche={selectedNiche} onChange={onChangeNiche} />
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg text-text transition hover:border-accent/40 hover:text-accent md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <Link
            to="/profile"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg text-text transition hover:border-accent/40 hover:text-accent md:inline-flex"
            aria-label="Open profile"
          >
            👤
          </Link>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border/60 px-4 py-3 md:hidden">
            <NicheSelector niches={niches} selectedNiche={selectedNiche} onChange={onChangeNiche} />
            <div className="mt-3">
              <Link
                to="/profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-lg text-text transition hover:border-accent/40 hover:text-accent"
                aria-label="Open profile"
                onClick={() => setMobileMenuOpen(false)}
              >
                👤
              </Link>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
