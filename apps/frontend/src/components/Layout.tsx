import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import NicheSelector from './NicheSelector';

type LayoutProps = {
  children: ReactNode;
  niches: string[];
  selectedNiche: string;
  onChangeNiche: (niche: string) => void;
};

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Layout({ children, niches, selectedNiche, onChangeNiche }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/96 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex flex-col leading-none text-text shrink-0" aria-label="Signal home">
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

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:border-border hover:text-text md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <IconClose /> : <IconMenu />}
            </button>

            <Link
              to="/profile"
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:border-border hover:text-text md:inline-flex"
              aria-label="Open profile"
            >
              <IconUser />
            </Link>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border/50 px-4 py-3 md:hidden">
            <NicheSelector niches={niches} selectedNiche={selectedNiche} onChange={onChangeNiche} />
            <div className="mt-3">
              <Link
                to="/profile"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:text-text"
                aria-label="Open profile"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconUser />
              </Link>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
