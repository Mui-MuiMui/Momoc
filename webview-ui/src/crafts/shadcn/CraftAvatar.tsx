import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftAvatarProps {
  src?: string;
  fallback?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftAvatar: UserComponent<CraftAvatarProps> = ({
  src = "",
  fallback = "AB",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <span
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {src ? (
        <img src={src} alt={fallback} className="aspect-square h-full w-full" />
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
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
