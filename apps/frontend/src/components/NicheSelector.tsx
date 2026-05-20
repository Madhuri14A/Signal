import { motion } from 'framer-motion';

type NicheSelectorProps = {
  niches: string[];
  selectedNiche: string;
  onChange: (niche: string) => void;
};

export default function NicheSelector({ niches, selectedNiche, onChange }: NicheSelectorProps) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Filter by niche"
    >
      {niches.map((niche) => {
        const selected = selectedNiche === niche;
        return (
          <button
            key={niche}
            type="button"
            onClick={() => onChange(niche)}
            className="relative whitespace-nowrap rounded-md px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors duration-150"
            style={{ color: selected ? 'var(--color-text)' : 'var(--color-muted)' }}
          >
            {selected && (
              <motion.span
                layoutId="niche-pill"
                className="absolute inset-0 rounded-md bg-card border border-border"
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
