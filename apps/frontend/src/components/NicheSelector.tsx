import { motion } from 'framer-motion';

type NicheSelectorProps = {
  niches: string[];
  selectedNiche: string;
  onChange: (niche: string) => void;
};

export default function NicheSelector({ niches, selectedNiche, onChange }: NicheSelectorProps) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Filter by niche"
    >
      {niches.map((niche) => {
        const selected = selectedNiche === niche;
        return (
          <button
            key={niche}
            type="button"
            onClick={() => onChange(niche)}
            className={`relative whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/35 ${
              selected
                ? 'border-accent bg-accent text-background shadow-[0_0_0_4px_rgba(163,230,53,0.16)]'
                : 'border-border bg-card text-muted hover:border-accent/35 hover:text-text'
            }`}
          >
            {selected && (
              <motion.span
                layoutId="niche-pill"
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative z-10">{niche}</span>
          </button>
        );
      })}
    </nav>
  );
}
