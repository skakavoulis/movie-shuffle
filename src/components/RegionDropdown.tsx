import { useState, useRef, useEffect } from "react";
import { useRegion } from "@/context/RegionContext";

export default function RegionDropdown() {
  const { region, setRegion, regions, loading } = useRegion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const handleSelect = (iso: string) => {
    setRegion(iso);
    setOpen(false);
  };

  const filteredRegions = regions.filter(
    (r) =>
      r.english_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.native_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.iso_3166_1.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-white transition-colors"
        aria-label="Select region"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        <span>{region}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && regions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-56 max-h-72 overflow-hidden flex flex-col bg-bg-card border border-border rounded-lg shadow-xl z-50">
          <div className="p-2 border-b border-border flex-shrink-0">
            <input
              type="search"
              placeholder="Search regions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-border text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>
          <div className="overflow-y-auto py-1 flex-1 min-h-0">
            {filteredRegions.map((r) => (
              <button
                key={r.iso_3166_1}
                onClick={() => handleSelect(r.iso_3166_1)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  region === r.iso_3166_1
                    ? "text-accent font-medium bg-accent/10"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                {r.english_name} ({r.iso_3166_1})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
