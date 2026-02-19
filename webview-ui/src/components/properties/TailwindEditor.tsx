import { useState, useEffect } from "react";
import { useEditor } from "@craftjs/core";

const SPACING_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"];
const COLOR_OPTIONS = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "card",
  "border",
];
const FONT_SIZE_OPTIONS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];
const FONT_WEIGHT_OPTIONS = ["normal", "medium", "semibold", "bold"];
const BORDER_RADIUS_OPTIONS = ["none", "sm", "md", "lg", "xl", "2xl", "full"];

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

  // Sync rawInput when the selected node changes
  useEffect(() => {
    setRawInput(currentClassName);
  }, [selectedNodeId, currentClassName]);

  if (!selectedNodeId) return null;

  const updateClassName = (newClassName: string) => {
    setRawInput(newClassName);
    actions.setProp(selectedNodeId, (props: Record<string, unknown>) => {
      props.className = newClassName;
    });
  };

  const toggleClass = (cls: string, groupClasses?: string[]) => {
    const classes = rawInput.split(/\s+/).filter(Boolean);
    if (groupClasses) {
      // Remove all classes in the same group, then add the new one
      const filtered = classes.filter((c) => !groupClasses.includes(c));
      if (classes.includes(cls)) {
        // Already active — just remove it (toggle off)
        updateClassName(classes.filter((c) => c !== cls).join(" "));
      } else {
        updateClassName([...filtered, cls].join(" "));
      }
    } else {
      if (classes.includes(cls)) {
        updateClassName(classes.filter((c) => c !== cls).join(" "));
      } else {
        updateClassName([...classes, cls].join(" "));
      }
    }
  };

  // Pre-compute group class lists to avoid text-color / text-size conflicts
  const textColorClasses = COLOR_OPTIONS.map((c) => `text-${c}`);
  const textSizeClasses = FONT_SIZE_OPTIONS.map((s) => `text-${s}`);
  const paddingClasses = SPACING_OPTIONS.map((v) => `p-${v}`);
  const marginClasses = SPACING_OPTIONS.map((v) => `m-${v}`);
  const fontWeightClasses = FONT_WEIGHT_OPTIONS.map((w) => `font-${w}`);
  const borderRadiusClasses = BORDER_RADIUS_OPTIONS.map((r) => `rounded-${r}`);
  const bgClasses = COLOR_OPTIONS.map((c) => `bg-${c}`);

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

      <TailwindSection title="Padding">
        <div className="flex flex-wrap gap-1">
          {SPACING_OPTIONS.slice(0, 8).map((v) => (
            <ClassButton
              key={v}
              label={`p-${v}`}
              active={rawInput.includes(`p-${v}`)}
              onClick={() => toggleClass(`p-${v}`, paddingClasses)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Margin">
        <div className="flex flex-wrap gap-1">
          {SPACING_OPTIONS.slice(0, 8).map((v) => (
            <ClassButton
              key={v}
              label={`m-${v}`}
              active={rawInput.includes(`m-${v}`)}
              onClick={() => toggleClass(`m-${v}`, marginClasses)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Text Color">
        <div className="flex flex-wrap gap-1">
          {COLOR_OPTIONS.map((c) => (
            <ClassButton
              key={c}
              label={c}
              active={rawInput.includes(`text-${c}`)}
              onClick={() => toggleClass(`text-${c}`, textColorClasses)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Background">
        <div className="flex flex-wrap gap-1">
          {COLOR_OPTIONS.map((c) => (
            <ClassButton
              key={c}
              label={c}
              active={rawInput.includes(`bg-${c}`)}
              onClick={() => toggleClass(`bg-${c}`, bgClasses)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Font Size">
        <div className="flex flex-wrap gap-1">
          {FONT_SIZE_OPTIONS.map((s) => (
            <ClassButton
              key={s}
              label={s}
              active={rawInput.includes(`text-${s}`)}
              onClick={() => toggleClass(`text-${s}`, textSizeClasses)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Font Weight">
        <div className="flex flex-wrap gap-1">
          {FONT_WEIGHT_OPTIONS.map((w) => (
            <ClassButton
              key={w}
              label={w}
              active={rawInput.includes(`font-${w}`)}
              onClick={() => toggleClass(`font-${w}`, fontWeightClasses)}
            />
          ))}
        </div>
      </TailwindSection>

      <TailwindSection title="Border Radius">
        <div className="flex flex-wrap gap-1">
          {BORDER_RADIUS_OPTIONS.map((r) => (
            <ClassButton
              key={r}
              label={r}
              active={rawInput.includes(`rounded-${r}`)}
              onClick={() => toggleClass(`rounded-${r}`, borderRadiusClasses)}
            />
          ))}
        </div>
      </TailwindSection>
    </div>
  );
}

function TailwindSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--vscode-descriptionForeground,#888)]">
        {title}
      </p>
      {children}
    </div>
  );
}

function ClassButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
