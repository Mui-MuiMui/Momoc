import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftSonnerProps {
  triggerText?: string;
  text?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftSonner: UserComponent<CraftSonnerProps> = ({
  triggerText = "Show Toast",
  text = "Event has been created.",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn("flex flex-col gap-2", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-fit"
      >
        {triggerText}
      </button>
      <div className="rounded-lg border bg-background p-4 shadow-lg">
        <div className="text-sm font-semibold">{text}</div>
      </div>
    </div>
  );
};

CraftSonner.craft = {
  displayName: "Sonner",
  props: {
    triggerText: "Show Toast",
    text: "Event has been created.",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
