import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftImageProps {
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftImage: UserComponent<CraftImageProps> = ({
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
    <img
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      src={src}
      alt={alt}
      className={cn("max-w-full", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    />
  );
};

CraftImage.craft = {
  displayName: "Image",
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
