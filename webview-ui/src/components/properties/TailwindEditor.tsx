import { useState, useEffect } from "react";
import { useEditor } from "@craftjs/core";

const SPACING_SCALE = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  "14", "16", "20", "24", "28", "32", "36", "40", "44", "48", "52", "56",
  "60", "64", "72", "80", "96",
];

const FONT_SIZE_SCALE = [
  "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl",
];

const THEME_COLOR_OPTIONS = [
  "background", "foreground", "primary", "secondary", "muted",
  "accent", "destructive", "card", "border", "white", "black",
];

const FONT_WEIGHT_OPTIONS = ["normal", "medium", "semibold", "bold"];
const BORDER_RADIUS_OPTIONS = ["none", "sm", "md", "lg", "xl", "2xl", "full"];

const PADDING_DIRS = [
  { label: "All", prefix: "p" },
  { label: "X", prefix: "px" },
  { label: "Y", prefix: "py" },
  { label: "T", prefix: "pt" },
  { label: "R", prefix: "pr" },
  { label: "B", prefix: "pb" },
  { label: "L", prefix: "pl" },
] as const;

const MARGIN_DIRS = [
  { label: "All", prefix: "m" },
  { label: "X", prefix: "mx" },
  { label: "Y", prefix: "my" },
  { label: "T", prefix: "mt" },
  { label: "R", prefix: "mr" },
  { label: "B", prefix: "mb" },
  { label: "L", prefix: "ml" },
] as const;

const TEXT_ALIGN_OPTIONS = [
  { label: "Left", textCls: "text-left", justifyCls: "justify-start" },
  { label: "Center", textCls: "text-center", justifyCls: "justify-center" },
  { label: "Right", textCls: "text-right", justifyCls: "justify-end" },
  { label: "Justify", textCls: "text-justify", justifyCls: "justify-between" },
];
const ALL_TEXT_ALIGN_CLASSES = TEXT_ALIGN_OPTIONS.flatMap((o) => [o.textCls, o.justifyCls]);

const ALIGN_SELF_OPTIONS = [
  { label: "Auto", cls: "self-auto" },
  { label: "Start", cls: "self-start" },
  { label: "Center", cls: "self-center" },
  { label: "End", cls: "self-end" },
  { label: "Stretch", cls: "self-stretch" },
];

const CONTENT_VALIGN_OPTIONS = [
  { label: "Top", cls: "items-start" },
  { label: "Center", cls: "items-center" },
  { label: "End", cls: "items-end" },
];

/* ---- Tailwind Color Palette ---- */

const PALETTE_FAMILIES = [
  "slate", "gray", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
] as const;

const PALETTE_SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;

const P: Record<string, Record<string, string>> = {
  slate:   { "50":"#f8fafc","100":"#f1f5f9","200":"#e2e8f0","300":"#cbd5e1","400":"#94a3b8","500":"#64748b","600":"#475569","700":"#334155","800":"#1e293b","900":"#0f172a","950":"#020617" },
  gray:    { "50":"#f9fafb","100":"#f3f4f6","200":"#e5e7eb","300":"#d1d5db","400":"#9ca3af","500":"#6b7280","600":"#4b5563","700":"#374151","800":"#1f2937","900":"#111827","950":"#030712" },
  red:     { "50":"#fef2f2","100":"#fee2e2","200":"#fecaca","300":"#fca5a5","400":"#f87171","500":"#ef4444","600":"#dc2626","700":"#b91c1c","800":"#991b1b","900":"#7f1d1d","950":"#450a0a" },
  orange:  { "50":"#fff7ed","100":"#ffedd5","200":"#fed7aa","300":"#fdba74","400":"#fb923c","500":"#f97316","600":"#ea580c","700":"#c2410c","800":"#9a3412","900":"#7c2d12","950":"#431407" },
  amber:   { "50":"#fffbeb","100":"#fef3c7","200":"#fde68a","300":"#fcd34d","400":"#fbbf24","500":"#f59e0b","600":"#d97706","700":"#b45309","800":"#92400e","900":"#78350f","950":"#451a03" },
  yellow:  { "50":"#fefce8","100":"#fef9c3","200":"#fef08a","300":"#fde047","400":"#facc15","500":"#eab308","600":"#ca8a04","700":"#a16207","800":"#854d0e","900":"#713f12","950":"#422006" },
  lime:    { "50":"#f7fee7","100":"#ecfccb","200":"#d9f99d","300":"#bef264","400":"#a3e635","500":"#84cc16","600":"#65a30d","700":"#4d7c0f","800":"#3f6212","900":"#365314","950":"#1a2e05" },
  green:   { "50":"#f0fdf4","100":"#dcfce7","200":"#bbf7d0","300":"#86efac","400":"#4ade80","500":"#22c55e","600":"#16a34a","700":"#15803d","800":"#166534","900":"#14532d","950":"#052e16" },
  emerald: { "50":"#ecfdf5","100":"#d1fae5","200":"#a7f3d0","300":"#6ee7b7","400":"#34d399","500":"#10b981","600":"#059669","700":"#047857","800":"#065f46","900":"#064e3b","950":"#022c22" },
  teal:    { "50":"#f0fdfa","100":"#ccfbf1","200":"#99f6e4","300":"#5eead4","400":"#2dd4bf","500":"#14b8a6","600":"#0d9488","700":"#0f766e","800":"#115e59","900":"#134e4a","950":"#042f2e" },
  cyan:    { "50":"#ecfeff","100":"#cffafe","200":"#a5f3fc","300":"#67e8f9","400":"#22d3ee","500":"#06b6d4","600":"#0891b2","700":"#0e7490","800":"#155e75","900":"#164e63","950":"#083344" },
  sky:     { "50":"#f0f9ff","100":"#e0f2fe","200":"#bae6fd","300":"#7dd3fc","400":"#38bdf8","500":"#0ea5e9","600":"#0284c7","700":"#0369a1","800":"#075985","900":"#0c4a6e","950":"#082f49" },
  blue:    { "50":"#eff6ff","100":"#dbeafe","200":"#bfdbfe","300":"#93c5fd","400":"#60a5fa","500":"#3b82f6","600":"#2563eb","700":"#1d4ed8","800":"#1e40af","900":"#1e3a8a","950":"#172554" },
  indigo:  { "50":"#eef2ff","100":"#e0e7ff","200":"#c7d2fe","300":"#a5b4fc","400":"#818cf8","500":"#6366f1","600":"#4f46e5","700":"#4338ca","800":"#3730a3","900":"#312e81","950":"#1e1b4b" },
  violet:  { "50":"#f5f3ff","100":"#ede9fe","200":"#ddd6fe","300":"#c4b5fd","400":"#a78bfa","500":"#8b5cf6","600":"#7c3aed","700":"#6d28d9","800":"#5b21b6","900":"#4c1d95","950":"#2e1065" },
  purple:  { "50":"#faf5ff","100":"#f3e8ff","200":"#e9d5ff","300":"#d8b4fe","400":"#c084fc","500":"#a855f7","600":"#9333ea","700":"#7e22ce","800":"#6b21a8","900":"#581c87","950":"#3b0764" },
  fuchsia: { "50":"#fdf4ff","100":"#fae8ff","200":"#f5d0fe","300":"#f0abfc","400":"#e879f9","500":"#d946ef","600":"#c026d3","700":"#a21caf","800":"#86198f","900":"#701a75","950":"#4a044e" },
  pink:    { "50":"#fdf2f8","100":"#fce7f3","200":"#fbcfe8","300":"#f9a8d4","400":"#f472b6","500":"#ec4899","600":"#db2777","700":"#be185d","800":"#9d174d","900":"#831843","950":"#500724" },
  rose:    { "50":"#fff1f2","100":"#ffe4e6","200":"#fecdd3","300":"#fda4af","400":"#fb7185","500":"#f43f5e","600":"#e11d48","700":"#be123c","800":"#9f1239","900":"#881337","950":"#4c0519" },
};

/** Regex to match palette color classes: text-red-500, hover:bg-blue-200, etc. */
const PALETTE_CLASS_RE = /^((?:hover:)?(?:text|bg))-(\w+)-(\d{2,3})$/;

function parsePaletteClass(cls: string): { prefix: string; family: string; shade: string } | null {
  const m = cls.match(PALETTE_CLASS_RE);
  if (!m || !P[m[2]]) return null;
  return { prefix: m[1], family: m[2], shade: m[3] };
}

export function TailwindEditor() {
  const { selectedNodeId, currentClassName, actions } = useEditor((state) => {
    const nodeId = state.events.selected?.values().next().value;
    if (!nodeId) return { selectedNodeId: null, currentClassName: "" };

    const node = state.nodes[nodeId];
    return {
      selectedNodeId: nodeId,
      currentClassName: (node?.data?.props?.className as string) || "",
    };
  });

  const [rawInput, setRawInput] = useState(currentClassName);
  const [paddingDir, setPaddingDir] = useState(0);
  const [marginDir, setMarginDir] = useState(0);
  const [fontSizeMode, setFontSizeMode] = useState<"preset" | "slider">("preset");
  const [textPaletteFamily, setTextPaletteFamily] = useState<string>("blue");
  const [bgPaletteFamily, setBgPaletteFamily] = useState<string>("blue");

  useEffect(() => {
    setRawInput(currentClassName);
  }, [selectedNodeId, currentClassName]);

  if (!selectedNodeId) return null;

  const classes = rawInput.split(/\s+/).filter(Boolean);
  const activeSet = new Set(classes);

  const updateClassName = (newClassName: string) => {
    setRawInput(newClassName);
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.className = newClassName;
    });
  };

  const setGroupClass = (cls: string, groupClasses: string[]) => {
    const filtered = classes.filter((c) => !groupClasses.includes(c));
    if (activeSet.has(cls)) {
      updateClassName(filtered.join(" "));
    } else {
      updateClassName([...filtered, cls].join(" "));
    }
  };

  const getSpacingValue = (prefix: string): number => {
    for (let i = 0; i < SPACING_SCALE.length; i++) {
      if (activeSet.has(`${prefix}-${SPACING_SCALE[i]}`)) return i;
    }
    return -1;
  };

  const setSpacingValue = (prefix: string, index: number) => {
    const group = SPACING_SCALE.map((v) => `${prefix}-${v}`);
    const filtered = classes.filter((c) => !group.includes(c));
    if (index < 0) {
      updateClassName(filtered.join(" "));
    } else {
      updateClassName([...filtered, `${prefix}-${SPACING_SCALE[index]}`].join(" "));
    }
  };

  const getFontSizeIndex = (): number => {
    for (let i = 0; i < FONT_SIZE_SCALE.length; i++) {
      if (activeSet.has(`text-${FONT_SIZE_SCALE[i]}`)) return i;
    }
    return -1;
  };

  const fontSizeGroup = FONT_SIZE_SCALE.map((s) => `text-${s}`);
  const themeTextGroup = THEME_COLOR_OPTIONS.map((c) => `text-${c}`);
  const themeBgGroup = THEME_COLOR_OPTIONS.map((c) => `bg-${c}`);
  const fontWeightGroup = FONT_WEIGHT_OPTIONS.map((w) => `font-${w}`);
  const borderRadiusGroup = BORDER_RADIUS_OPTIONS.map((r) => `rounded-${r}`);
  const alignSelfGroup = ALIGN_SELF_OPTIONS.map((o) => o.cls);
  const contentVAlignGroup = CONTENT_VALIGN_OPTIONS.map((o) => o.cls);

  const currentPaddingPrefix = PADDING_DIRS[paddingDir].prefix;
  const currentMarginPrefix = MARGIN_DIRS[marginDir].prefix;
  const currentPaddingIdx = getSpacingValue(currentPaddingPrefix);
  const currentMarginIdx = getSpacingValue(currentMarginPrefix);
  const currentFontSizeIdx = getFontSizeIndex();

  // Detect active palette color for a given effective prefix (e.g. "text", "hover:bg")
  const findPaletteColor = (effectivePrefix: string) => {
    for (const cls of activeSet) {
      const parsed = parsePaletteClass(cls);
      if (parsed && parsed.prefix === effectivePrefix) return parsed;
    }
    return null;
  };

  // Apply a color: clears palette and theme colors for the given effective prefix
  const applyColor = (effectivePrefix: string, colorCls: string) => {
    const basePrefix = effectivePrefix.replace("hover:", "") as "text" | "bg";
    const themeGroup = THEME_COLOR_OPTIONS.map((c) => `${effectivePrefix}-${c}`);
    const baseThemeGroup = basePrefix === "text" ? themeTextGroup : themeBgGroup;
    const filtered = classes.filter((c) => {
      if (themeGroup.includes(c)) return false;
      // Also clear base theme colors only when effectivePrefix has no hover
      if (effectivePrefix === basePrefix && baseThemeGroup.includes(c)) return false;
      const parsed = parsePaletteClass(c);
      if (parsed && parsed.prefix === effectivePrefix) return false;
      return true;
    });
    if (activeSet.has(colorCls)) {
      updateClassName(filtered.join(" "));
    } else {
      updateClassName([...filtered, colorCls].join(" "));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs text-[var(--vscode-descriptionForeground,#888)]">
          Classes
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => updateClassName(e.target.value)}
          rows={2}
          className="w-full rounded border border-[var(--vscode-input-border,#3c3c3c)] bg-[var(--vscode-input-background,#3c3c3c)] px-2 py-1 text-xs text-[var(--vscode-input-foreground,#ccc)] focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder,#007fd4)]"
        />
      </div>

      <SpacingSlider
        title="Padding"
        directions={PADDING_DIRS}
        dirIndex={paddingDir}
        onDirChange={setPaddingDir}
        value={currentPaddingIdx}
        onChange={(idx) => setSpacingValue(currentPaddingPrefix, idx)}
      />

      <SpacingSlider
        title="Margin"
        directions={MARGIN_DIRS}
        dirIndex={marginDir}
        onDirChange={setMarginDir}
        value={currentMarginIdx}
        onChange={(idx) => setSpacingValue(currentMarginPrefix, idx)}
      />

      <TailwindSection title="Text Align">
        <div className="flex gap-1">
          {TEXT_ALIGN_OPTIONS.map((o) => (
            <ClassButton
              key={o.textCls}
              label={o.label}
              active={activeSet.has(o.textCls)}
              onClick={() => {
                const filtered = classes.filter((c) => !ALL_TEXT_ALIGN_CLASSES.includes(c));
                if (activeSet.has(o.textCls)) {
                  updateClassName(filtered.join(" "));
                } else {
                  updateClassName([...filtered, o.textCls, o.justifyCls].join(" "));
                }
              }}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Align Self">
        <div className="flex flex-wrap gap-1">
          {ALIGN_SELF_OPTIONS.map((o) => (
            <ClassButton
              key={o.cls}
              label={o.label}
              active={activeSet.has(o.cls)}
              onClick={() => setGroupClass(o.cls, alignSelfGroup)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Content V-Align">
        <div className="flex flex-wrap gap-1">
          {CONTENT_VALIGN_OPTIONS.map((o) => (
            <ClassButton
              key={o.cls}
              label={o.label}
              active={activeSet.has(o.cls)}
              onClick={() => {
                const filtered = classes.filter((c) => !contentVAlignGroup.includes(c));
                if (activeSet.has(o.cls)) {
                  const noFlex = filtered.filter((c) => c !== "flex");
                  updateClassName(noFlex.join(" "));
                } else {
                  const withFlex = filtered.includes("flex") ? filtered : ["flex", ...filtered];
                  updateClassName([...withFlex, o.cls].join(" "));
                }
              }}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Font Size">
        <div className="mb-1 flex gap-1">
          <ModeToggle label="Preset" active={fontSizeMode === "preset"} onClick={() => setFontSizeMode("preset")} />
          <ModeToggle label="Slider" active={fontSizeMode === "slider"} onClick={() => setFontSizeMode("slider")} />
        </div>
        {fontSizeMode === "preset" ? (
          <div className="flex flex-wrap gap-1">
            {FONT_SIZE_SCALE.map((s) => (
              <ClassButton
                key={s}
                label={s}
                active={activeSet.has(`text-${s}`)}
                onClick={() => setGroupClass(`text-${s}`, fontSizeGroup)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-1}
              max={FONT_SIZE_SCALE.length - 1}
              value={currentFontSizeIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const filtered = classes.filter((c) => !fontSizeGroup.includes(c));
                if (idx < 0) {
                  updateClassName(filtered.join(" "));
                } else {
                  updateClassName([...filtered, `text-${FONT_SIZE_SCALE[idx]}`].join(" "));
                }
              }}
              className="flex-1 accent-[var(--vscode-button-background,#0e639c)]"
            />
            <span className="w-10 text-right text-[10px] text-[var(--vscode-foreground,#ccc)]">
              {currentFontSizeIdx >= 0 ? FONT_SIZE_SCALE[currentFontSizeIdx] : "—"}
            </span>
          </div>
        )}
      </TailwindSection>

      {/* Text Color: theme + palette */}
      <ColorSection
        title="Text Color"
        prefix="text"
        activeSet={activeSet}
        paletteFamily={textPaletteFamily}
        onFamilyChange={setTextPaletteFamily}
        findPaletteColor={findPaletteColor}
        onApply={applyColor}
      />

      {/* Background: theme + palette */}
      <ColorSection
        title="Background"
        prefix="bg"
        activeSet={activeSet}
        paletteFamily={bgPaletteFamily}
        onFamilyChange={setBgPaletteFamily}
        findPaletteColor={findPaletteColor}
        onApply={applyColor}
      />

      <TailwindSection title="Font Weight">
        <div className="flex flex-wrap gap-1">
          {FONT_WEIGHT_OPTIONS.map((w) => (
            <ClassButton key={w} label={w} active={activeSet.has(`font-${w}`)} onClick={() => setGroupClass(`font-${w}`, fontWeightGroup)} />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Border Radius">
        <div className="flex flex-wrap gap-1">
          {BORDER_RADIUS_OPTIONS.map((r) => (
            <ClassButton key={r} label={r} active={activeSet.has(`rounded-${r}`)} onClick={() => setGroupClass(`rounded-${r}`, borderRadiusGroup)} />
          ))}
        </div>
      </TailwindSection>
    </div>
  );
}

/* ---- Sub-components ---- */

function ColorSection({
  title,
  prefix,
  activeSet,
  paletteFamily,
  onFamilyChange,
  findPaletteColor,
  onApply,
}: {
  title: string;
  prefix: "text" | "bg";
  activeSet: Set<string>;
  paletteFamily: string;
  onFamilyChange: (f: string) => void;
  findPaletteColor: (effectivePrefix: string) => { family: string; shade: string } | null;
  onApply: (effectivePrefix: string, colorCls: string) => void;
}) {
  const [mode, setMode] = useState<"normal" | "hover">("normal");
  const effectivePrefix = mode === "hover" ? `hover:${prefix}` : prefix;
  const activePalette = findPaletteColor(effectivePrefix);

  const isThemeActive = (c: string) => {
    const cls = `${effectivePrefix}-${c}`;
    return activeSet.has(cls);
  };

  const isShadeActive = (s: string) => {
    const cls = `${effectivePrefix}-${paletteFamily}-${s}`;
    return activeSet.has(cls);
  };

  return (
    <TailwindSection title={title}>
      {/* Normal / Hover toggle */}
      <div className="mb-1.5 flex gap-1">
        <ModeToggle label="Normal" active={mode === "normal"} onClick={() => setMode("normal")} />
        <ModeToggle label="Hover" active={mode === "hover"} onClick={() => setMode("hover")} />
      </div>
      {/* Theme colors */}
      <div className="mb-1.5 flex flex-wrap gap-1">
        {THEME_COLOR_OPTIONS.map((c) => (
          <ClassButton key={c} label={c} active={isThemeActive(c)} onClick={() => onApply(effectivePrefix, `${effectivePrefix}-${c}`)} />
        ))}
      </div>
      {/* Palette family selector */}
      <div className="mb-1 flex items-center gap-1">
        <div className="flex flex-wrap gap-1">
          {PALETTE_FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFamilyChange(f)}
              title={f}
              className={`h-3.5 w-3.5 rounded-sm transition-all ${
                paletteFamily === f ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-110"
              }`}
              style={{ backgroundColor: P[f]["500"] }}
            />
          ))}
        </div>
        {activePalette && (
          <span className="ml-auto shrink-0 text-[9px] text-[var(--vscode-descriptionForeground,#888)]">
            {activePalette.family}-{activePalette.shade}
          </span>
        )}
      </div>
      {/* Shade swatches */}
      <div className="flex gap-0.5">
        {PALETTE_SHADES.map((s) => {
          const cls = `${effectivePrefix}-${paletteFamily}-${s}`;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onApply(effectivePrefix, cls)}
              title={`${paletteFamily}-${s}`}
              className={`h-4 flex-1 rounded-sm transition-all ${
                isShadeActive(s) ? "ring-2 ring-[var(--vscode-focusBorder,#007fd4)] ring-offset-1 ring-offset-[var(--vscode-editor-background,#1e1e1e)]" : "hover:scale-y-125"
              }`}
              style={{ backgroundColor: P[paletteFamily][s] }}
            />
          );
        })}
      </div>
      <div className="mt-0.5 flex justify-between text-[8px] text-[var(--vscode-descriptionForeground,#666)]">
        <span>50</span><span>500</span><span>950</span>
      </div>
    </TailwindSection>
  );
}

function SpacingSlider({
  title,
  directions,
  dirIndex,
  onDirChange,
  value,
  onChange,
}: {
  title: string;
  directions: ReadonlyArray<{ label: string; prefix: string }>;
  dirIndex: number;
  onDirChange: (i: number) => void;
  value: number;
  onChange: (idx: number) => void;
}) {
  const prefix = directions[dirIndex].prefix;
  return (
    <TailwindSection title={title}>
      <div className="mb-1 flex gap-0.5">
        {directions.map((d, i) => (
          <button
            key={d.prefix}
            type="button"
            onClick={() => onDirChange(i)}
            className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              i === dirIndex
                ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
                : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={-1}
          max={SPACING_SCALE.length - 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[var(--vscode-button-background,#0e639c)]"
        />
        <span className="w-12 text-right text-[10px] text-[var(--vscode-foreground,#ccc)]">
          {value >= 0 ? `${prefix}-${SPACING_SCALE[value]}` : "—"}
        </span>
      </div>
    </TailwindSection>
  );
}

function TailwindSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--vscode-descriptionForeground,#888)]">{title}</p>
      {children}
    </div>
  );
}

function ClassButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
        active
          ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
          : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
      }`}
    >
      {label}
    </button>
  );
}

function ModeToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
        active
          ? "bg-[var(--vscode-button-background,#0e639c)] text-[var(--vscode-button-foreground,#fff)]"
          : "bg-[var(--vscode-input-background,#3c3c3c)] text-[var(--vscode-foreground,#ccc)] hover:bg-[var(--vscode-toolbar-hoverBackground,#444)]"
      }`}
    >
      {label}
    </button>
  );
}
