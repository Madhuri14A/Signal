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
    <div aria-label="Filter by niche" className="w-full">
      <label htmlFor="niche-select" className="sr-only">
        Select niche
      </label>
      <select
        id="niche-select"
        value={selectedNiche}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {niches.map((niche) => (
          <option key={niche} value={niche}>
            {formatLabel(niche)}
          </option>
        ))}
      </select>
    </div>
  );
}
