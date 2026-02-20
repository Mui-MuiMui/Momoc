import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftPlaceholderImageProps {
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftPlaceholderImage: UserComponent<CraftPlaceholderImageProps> = ({
  src = "https://placehold.co/300x200/e2e8f0/64748b?text=Image",
  alt = "Placeholder",
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
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
        display: "inline-block",
      }}
    >
      <img
        src={src}
        alt={alt}
        className={cn("max-w-full", className)}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
};

CraftPlaceholderImage.craft = {
  displayName: "Placeholder Image",
  props: {
    src: "https://placehold.co/300x200/e2e8f0/64748b?text=Image",
    alt: "Placeholder",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
