type NicheName = 'all' | 'startup' | 'ai' | 'fullstack' | 'artist' | 'philosophy' | 'editorial';

type NicheStyle = {
  leftAccent: string;
  leftAccentHover: string;
  gradient: string;
  chip: string;
};

const NICHE_STYLES: Record<NicheName, NicheStyle> = {
  all: {
    leftAccent: 'bg-border/80',
    leftAccentHover: 'group-hover:bg-muted',
    gradient: 'bg-gradient-to-r from-zinc-700/80 via-zinc-600/80 to-zinc-500/80',
    chip: 'border-border bg-input text-text',
  },
  startup: {
    leftAccent: 'bg-amber-500/70',
    leftAccentHover: 'group-hover:bg-amber-400',
    gradient: 'bg-gradient-to-r from-amber-600/80 via-amber-500/70 to-orange-500/70',
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  ai: {
    leftAccent: 'bg-violet-500/70',
    leftAccentHover: 'group-hover:bg-violet-400',
    gradient: 'bg-gradient-to-r from-violet-700/80 via-violet-500/70 to-fuchsia-500/70',
    chip: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  },
  fullstack: {
    leftAccent: 'bg-accent/70',
    leftAccentHover: 'group-hover:bg-accent',
    gradient: 'bg-gradient-to-r from-lime-700/80 via-lime-500/70 to-emerald-500/70',
    chip: 'border-lime-500/30 bg-lime-500/10 text-lime-200',
  },
  artist: {
    leftAccent: 'bg-rose-500/70',
    leftAccentHover: 'group-hover:bg-rose-400',
    gradient: 'bg-gradient-to-r from-rose-700/80 via-rose-500/70 to-pink-500/70',
    chip: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
  philosophy: {
    leftAccent: 'bg-sky-500/70',
    leftAccentHover: 'group-hover:bg-sky-400',
    gradient: 'bg-gradient-to-r from-sky-700/80 via-sky-500/70 to-cyan-500/70',
    chip: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  },
  editorial: {
    leftAccent: 'bg-orange-500/70',
    leftAccentHover: 'group-hover:bg-orange-400',
    gradient: 'bg-gradient-to-r from-orange-700/80 via-orange-500/70 to-amber-500/70',
    chip: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  },
};

export function getNicheColor(niche: string): NicheStyle {
  return NICHE_STYLES[niche as NicheName] ?? NICHE_STYLES.all;
}
