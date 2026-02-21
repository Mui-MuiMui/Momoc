import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";

interface CraftFormProps {
  width?: string;
  height?: string;
  className?: string;
}

export const CraftForm: UserComponent<CraftFormProps> = ({
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
      className={cn("space-y-4", className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Username</label>
        <input
          type="text"
          placeholder="Enter username"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-[0.8rem] text-muted-foreground">This is your public display name.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">Email</label>
        <input
          type="email"
          placeholder="Enter email"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border-destructive"
        />
        <p className="text-[0.8rem] text-destructive">Please enter a valid email address.</p>
      </div>
      <button type="button" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 py-2 shadow hover:bg-primary/90">
        Submit
      </button>
    </div>
  );
};

CraftForm.craft = {
  displayName: "Form",
  props: {
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
