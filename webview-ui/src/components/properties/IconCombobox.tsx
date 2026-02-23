import { useRef, useState } from "react";
import * as LucideIcons from "lucide-react";

/** Popular icons shown when search is empty */
const POPULAR_ICONS = [
  "AlertCircle", "AlertTriangle", "Info", "Terminal",
  "Bell", "CheckCircle2", "XCircle", "ShieldAlert",
  "CircleCheck", "CircleX", "Megaphone", "Siren",
  "Heart", "Star", "Zap", "Flame",
];

/** All PascalCase icon component names from lucide-react (forwardRef components are objects, not functions) */
const ALL_ICON_NAMES: string[] = Object.keys(LucideIcons)
  .filter((key) => /^[A-Z]/.test(key))
  .sort();

const MAX_RESULTS = 50;

const INPUT_CLASS =
  "rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]";

interface IconComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconCombobox({ value, onChange }: IconComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const candidates = search
    ? ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(search.toLowerCase())).slice(0, MAX_RESULTS)
    : POPULAR_ICONS;

  const CurrentIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[value];

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        {CurrentIcon && <CurrentIcon className="h-4 w-4 shrink-0 text-[var(--vscode-foreground,#ccc)]" />}
        <input
          type="text"
          value={open ? search : value}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => { setOpen(true); setSearch(""); }}
          onBlur={() => { setTimeout(() => setOpen(false), 150); }}
          className={`${INPUT_CLASS} flex-1`}
          placeholder="Search icons..."
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded border border-[var(--vscode-dropdown-border,#3c3c3c)] bg-[var(--vscode-dropdown-background,#252526)] shadow-lg">
          {!search && (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--vscode-descriptionForeground,#888)]">
              Popular
            </div>
          )}
          {candidates.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-[var(--vscode-descriptionForeground,#888)]">
              No icons found
            </div>
          )}
          {candidates.map((name) => {
            const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
            return (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(name);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-2 py-1 text-xs hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)] ${
                  name === value ? "bg-[var(--vscode-list-activeSelectionBackground,#094771)] text-[var(--vscode-list-activeSelectionForeground,#fff)]" : "text-[var(--vscode-dropdown-foreground,#ccc)]"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{name}</span>
              </button>
            );
          })}
          {search && candidates.length === MAX_RESULTS && (
            <div className="px-2 py-1 text-[10px] text-[var(--vscode-descriptionForeground,#888)]">
              ...and more. Keep typing to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
