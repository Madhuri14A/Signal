type NicheSelectorProps = {
  niches: string[];
  selectedNiche: string;
  onChange: (niche: string) => void;
};

export default function NicheSelector({ niches, selectedNiche, onChange }: NicheSelectorProps) {
  function formatLabel(n: string) {
    if (n === 'all') return 'All Niches';
    return n
      .split(/[-_\s]+/)
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(' ');
  }

  return (
    <div aria-label="Filter by niche" className="niche-selector w-full">
      {niches.map((niche) => (
        <button
          key={niche}
          type="button"
          className={
            selectedNiche === niche ? 'pill pill-selected' : 'pill'
          }
          onClick={() => onChange(niche)}
        >
          {formatLabel(niche)}
        </button>
      ))}
    </div>
  );
}
