type NicheSelectorProps = {
  niches: string[];
  selectedNiche: string;
  onChange: (niche: string) => void;
};

export default function NicheSelector({ niches, selectedNiche, onChange }: NicheSelectorProps) {
  return (
    <section className="niche-selector" aria-label="Niche selector">
      {niches.map((niche) => {
        const selected = selectedNiche === niche;

        return (
          <button
            key={niche}
            type="button"
            className={`pill ${selected ? 'pill-selected' : ''}`}
            onClick={() => onChange(niche)}
          >
            {niche}
          </button>
        );
      })}
    </section>
  );
}
