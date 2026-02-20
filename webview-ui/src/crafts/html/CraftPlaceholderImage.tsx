import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftPlaceholderImageProps {
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  keepAspectRatio?: boolean;
  className?: string;
}

export const CraftPlaceholderImage: UserComponent<CraftPlaceholderImageProps> = ({
  src = "https://placehold.co/300x200/e2e8f0/64748b?text=Image",
  alt = "Placeholder",
  width = "auto",
  height = "auto",
  keepAspectRatio = false,
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
      className={cn(className)}
      style={{
        width: width !== "auto" ? width : undefined,
        height: height !== "auto" ? height : undefined,
      }}
    >
      <img
        src={src}
        alt={alt}
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
    keepAspectRatio: false,
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
