import { useNode, type UserComponent } from "@craftjs/core";
import { Image } from "lucide-react";
import { cn } from "../../utils/cn";
import { useResolvedImageSrc } from "../../hooks/useResolvedImageSrc";

interface CraftImageProps {
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  className?: string;
}

export const CraftImage: UserComponent<CraftImageProps> = ({
  src = "",
  alt = "",
  width = "300px",
  height = "200px",
  objectFit = "cover",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const resolvedSrc = useResolvedImageSrc(src);

  const wrapperStyle: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };

  if (!resolvedSrc) {
    return (
      <div
        ref={(ref) => {
          if (ref) connect(drag(ref));
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-gray-200 text-gray-400",
          className,
        )}
        style={wrapperStyle}
      >
        <Image size={32} />
        <span className="text-xs">画像URLを設定</span>
      </div>
    );
  }

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      className={cn(className)}
      style={wrapperStyle}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit, display: "block" }}
      />
    </div>
  );
};

CraftImage.craft = {
  displayName: "Image",
  props: {
    src: "",
    alt: "",
    width: "300px",
    height: "200px",
    objectFit: "cover",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
