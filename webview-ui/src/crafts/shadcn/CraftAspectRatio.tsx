import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftAspectRatioProps {
  ratio?: number;
  width?: string;
  className?: string;
  children?: React.ReactNode;
  /** RenderNode がリサイズ時に比率を維持するために使用 (常に true) */
  keepAspectRatio?: boolean;
}

export const CraftAspectRatio: UserComponent<CraftAspectRatioProps> = ({
  ratio = 16 / 9,
  width = "auto",
  className = "",
  children,
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      // w-full は width="auto" の時のみ適用。明示的な width がある場合は inline style が制御する
      className={cn("relative", width === "auto" && "w-full", className)}
      style={{
        width: width !== "auto" ? width : undefined,
        // height は常に "auto" にして CSS aspect-ratio が機能するようにする。
        // RenderNode がドラッグ中に dom.style.height を直接書き換えても、
        // React の再レンダリング時に "auto" で上書きされる。
        height: "auto",
        aspectRatio: ratio,
      }}
    >
      {children ?? (
        <div className="flex min-h-[60px] items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
          コンポーネントをドロップ
        </div>
      )}
    </div>
  );
};

CraftAspectRatio.craft = {
  displayName: "AspectRatio",
  props: {
    ratio: 16 / 9,
    width: "auto",
    className: "",
    // RenderNode がこの prop を読んでリサイズ時に比率を維持する
    keepAspectRatio: true,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
};
