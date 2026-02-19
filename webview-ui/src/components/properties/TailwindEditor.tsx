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

const COLOR_OPTIONS = [
  "background", "foreground", "primary", "secondary", "muted",
  "accent", "destructive", "card", "border",
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
  const textColorGroup = COLOR_OPTIONS.map((c) => `text-${c}`);
  const bgGroup = COLOR_OPTIONS.map((c) => `bg-${c}`);
  const fontWeightGroup = FONT_WEIGHT_OPTIONS.map((w) => `font-${w}`);
  const borderRadiusGroup = BORDER_RADIUS_OPTIONS.map((r) => `rounded-${r}`);
  const alignSelfGroup = ALIGN_SELF_OPTIONS.map((o) => o.cls);
  const contentVAlignGroup = CONTENT_VALIGN_OPTIONS.map((o) => o.cls);

  const currentPaddingPrefix = PADDING_DIRS[paddingDir].prefix;
  const currentMarginPrefix = MARGIN_DIRS[marginDir].prefix;
  const currentPaddingIdx = getSpacingValue(currentPaddingPrefix);
  const currentMarginIdx = getSpacingValue(currentMarginPrefix);
  const currentFontSizeIdx = getFontSizeIndex();

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
                  // Toggle off: remove the items-* class and flex if no other items-* remains
                  const withoutCls = filtered;
                  const noFlex = withoutCls.filter((c) => c !== "flex");
                  updateClassName(noFlex.join(" "));
                } else {
                  // Toggle on: ensure flex is present, add items-*
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

      <TailwindSection title="Text Color">
        <div className="flex flex-wrap gap-1">
          {COLOR_OPTIONS.map((c) => (
            <ClassButton key={c} label={c} active={activeSet.has(`text-${c}`)} onClick={() => setGroupClass(`text-${c}`, textColorGroup)} />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Background">
        <div className="flex flex-wrap gap-1">
          {COLOR_OPTIONS.map((c) => (
            <ClassButton key={c} label={c} active={activeSet.has(`bg-${c}`)} onClick={() => setGroupClass(`bg-${c}`, bgGroup)} />
          ))}
        </div>
      </TailwindSection>

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
