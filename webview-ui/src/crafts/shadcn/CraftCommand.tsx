import { useNode, type UserComponent } from "@craftjs/core";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "../../utils/cn";

export type CommandItemDef =
  | { type: "item"; label: string; icon?: string; shortcut?: string }
  | { type: "separator" }
  | { type: "group"; label: string; items: CommandItemDef[] };

export const DEFAULT_COMMAND_DATA: CommandItemDef[] = [
  {
    type: "group",
    label: "Suggestions",
    items: [
      { type: "item", label: "Calendar", icon: "Calendar", shortcut: "" },
      { type: "item", label: "Search Emoji", icon: "Smile", shortcut: "" },
      { type: "item", label: "Settings", icon: "Settings", shortcut: "⌘S" },
    ],
  },
  { type: "separator" },
  {
    type: "group",
    label: "Settings",
    items: [
      { type: "item", label: "Profile", icon: "User", shortcut: "⌘P" },
      { type: "item", label: "Billing", icon: "CreditCard", shortcut: "" },
    ],
  },
];

export function parseCommandData(raw: string): CommandItemDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CommandItemDef[];
    return DEFAULT_COMMAND_DATA;
  } catch {
    return DEFAULT_COMMAND_DATA;
  }
}

interface CraftCommandProps {
  commandData?: string;
  placeholder?: string;
  width?: string;
  height?: string;
  className?: string;
  // Item styling
  itemBgClass?: string;
  itemTextClass?: string;
  itemBorderClass?: string;
  itemBorderWidth?: string;
  itemShadowClass?: string;
  hoverBgClass?: string;
  hoverTextClass?: string;
  // Icon/shortcut/heading styling
  iconClass?: string;
  shortcutTextClass?: string;
  groupHeadingClass?: string;
  // Input border styling
  inputBorderClass?: string;
  inputBorderWidth?: string;
  inputRoundedClass?: string;
  // Separator styling
  separatorClass?: string;
  separatorShadowClass?: string;
  separatorBorderClass?: string;
  separatorBorderWidth?: string;
}

export const CraftCommand: UserComponent<CraftCommandProps> = ({
  commandData = JSON.stringify(DEFAULT_COMMAND_DATA),
  placeholder = "Type a command or search...",
  width = "auto",
  height = "auto",
  className = "",
  itemBgClass = "",
  itemTextClass = "",
  itemBorderClass = "",
  itemBorderWidth = "",
  itemShadowClass = "",
  hoverBgClass = "",
  hoverTextClass = "",
  iconClass = "",
  shortcutTextClass = "",
  groupHeadingClass = "",
  inputBorderClass = "",
  inputBorderWidth = "",
  inputRoundedClass = "",
  separatorClass = "",
  separatorShadowClass = "",
  separatorBorderClass = "",
  separatorBorderWidth = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const items = parseCommandData(commandData);

  const itemBwClass =
    itemBorderWidth === "0" ? "border-0"
    : itemBorderWidth === "2" ? "border-2"
    : itemBorderWidth === "4" ? "border-4"
    : itemBorderWidth === "8" ? "border-8"
    : itemBorderWidth === "1" ? "border"
    : "";

  const inputBwClass =
    inputBorderWidth === "0" ? "border-0"
    : inputBorderWidth === "2" ? "border-2"
    : inputBorderWidth === "4" ? "border-4"
    : inputBorderWidth === "8" ? "border-8"
    : inputBorderWidth === "1" ? "border"
    : "";

  const sepBwClass =
    separatorBorderWidth === "0" ? "border-0"
    : separatorBorderWidth === "2" ? "border-2"
    : separatorBorderWidth === "4" ? "border-4"
    : separatorBorderWidth === "8" ? "border-8"
    : separatorBorderWidth === "1" ? "border"
    : "";

  const itemCls = cn(
    "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
    itemBgClass,
    itemTextClass,
    itemBwClass,
    itemBorderClass,
    itemShadowClass,
    hoverBgClass ? `hover:${hoverBgClass}` : "hover:bg-accent",
    hoverTextClass ? `hover:${hoverTextClass}` : "hover:text-accent-foreground",
  );

  const sepCls = cn(
    "-mx-1 my-1 h-px",
    separatorClass || "bg-border",
    separatorShadowClass,
    sepBwClass,
    separatorBorderClass,
  );

  function renderItems(defs: CommandItemDef[], depth = 0): React.ReactNode {
    return defs.map((def, i) => {
      if (def.type === "separator") {
        return <div key={i} className={sepCls} />;
      }
      if (def.type === "group") {
        return (
          <div key={i} className="overflow-hidden p-1 text-foreground">
            <div className={cn("px-2 py-1.5 text-xs font-medium", groupHeadingClass || "text-muted-foreground")}>
              {def.label}
            </div>
            {renderItems(def.items, depth + 1)}
          </div>
        );
      }
      // type === "item"
      const IconComp = def.icon
        ? (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[def.icon]
        : null;
      return (
        <div key={i} className={itemCls}>
          {IconComp && <IconComp className={cn("h-4 w-4 shrink-0", iconClass || "opacity-60")} />}
          {!IconComp && <span className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{def.label}</span>
          {def.shortcut && (
            <span className={cn("ml-auto text-xs tracking-widest", shortcutTextClass || "text-muted-foreground")}>
              {def.shortcut}
            </span>
          )}
        </div>
      );
    });
  }

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(width && width !== "auto" ? "block" : "inline-grid", "flex flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground", className)}
      style={{ width: width && width !== "auto" ? width : undefined, height: height && height !== "auto" ? height : undefined }}
    >
      <div className={cn("flex items-center border-b px-3", inputBorderClass, inputBwClass, inputRoundedClass)}>
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          type="text"
          placeholder={placeholder}
          readOnly
          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
        {renderItems(items)}
      </div>
    </div>
  );
};

CraftCommand.craft = {
  displayName: "Command",
  props: {
    commandData: JSON.stringify(DEFAULT_COMMAND_DATA),
    placeholder: "Type a command or search...",
    width: "auto",
    height: "auto",
    className: "",
    itemBgClass: "",
    itemTextClass: "",
    itemBorderClass: "",
    itemBorderWidth: "",
    itemShadowClass: "",
    hoverBgClass: "",
    hoverTextClass: "",
    iconClass: "",
    shortcutTextClass: "",
    groupHeadingClass: "",
    inputBorderClass: "",
    inputBorderWidth: "",
    inputRoundedClass: "",
    separatorClass: "",
    separatorShadowClass: "",
    separatorBorderClass: "",
    separatorBorderWidth: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
