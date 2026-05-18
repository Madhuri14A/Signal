type NicheSelectorProps = {
  niches: string[];
  selectedNiche: string;
  onChange: (niche: string) => void;
};

export default function NicheSelector({ niches, selectedNiche, onChange }: NicheSelectorProps) {
  return (
    <section
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Niche selector"
    >
      {niches.map((niche) => {
        const selected = selectedNiche === niche;

        return (
          <button
            key={niche}
            type="button"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
              selected
                ? 'bg-accent text-background'
                : 'border-transparent bg-transparent text-muted hover:text-text'
            }`}
            onClick={() => onChange(niche)}
          >
            {niche}
          </button>
        );
      })}
    </section>
  );
}
