import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { useResolvedImageSrc } from "../../hooks/useResolvedImageSrc";

const SIZE_CLASSES: Record<string, string> = {
  sm: "h-8 w-8",
  default: "h-10 w-10",
  lg: "h-16 w-16",
};

interface CraftAvatarProps {
  src?: string;
  fallback?: string;
  size?: "default" | "sm" | "lg";
  width?: string;
  height?: string;
  className?: string;
  tooltipText?: string;
  tooltipSide?: string;
  borderColor?: string;
}

export const CraftAvatar: UserComponent<CraftAvatarProps> = ({
  src = "",
  fallback = "AB",
  size = "default",
  width = "auto",
  height = "auto",
  className = "",
  tooltipText = "",
  tooltipSide = "",
  borderColor = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const resolvedSrc = useResolvedImageSrc(src);

  return (
    <span
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        SIZE_CLASSES[size] ?? SIZE_CLASSES.default,
        borderColor && "border-2",
        borderColor,
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {resolvedSrc ? (
        <img src={resolvedSrc} alt={fallback} className="aspect-square h-full w-full" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
          {fallback}
        </span>
      )}
    </span>
  );
};

CraftAvatar.craft = {
  displayName: "Avatar",
  props: {
    src: "",
    fallback: "AB",
    size: "default",
    width: "auto",
    height: "auto",
    className: "",
    tooltipText: "",
    tooltipSide: "",
    borderColor: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
