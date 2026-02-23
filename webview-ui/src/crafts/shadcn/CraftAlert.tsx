import { useNode, type UserComponent } from "@craftjs/core";
import { cn } from "../../utils/cn";
import { cva } from "class-variance-authority";
import * as Icons from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface CraftAlertProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  icon?: string;
  width?: string;
  height?: string;
  className?: string;
}

export const CraftAlert: UserComponent<CraftAlertProps> = ({
  title = "Alert",
  description = "This is an alert message.",
  variant = "default",
  icon = "AlertCircle",
  width = "auto",
  height = "auto",
  className = "",
}) => {
  const {
    connectors: { connect, drag },
  } = useNode();

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[icon];

  return (
    <div
      ref={(ref) => {
        if (ref) connect(drag(ref));
      }}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      style={{ width: width !== "auto" ? width : undefined, height: height !== "auto" ? height : undefined }}
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
      {description && <div className="text-sm [&_p]:leading-relaxed">{description}</div>}
    </div>
  );
};

CraftAlert.craft = {
  displayName: "Alert",
  props: {
    title: "Alert",
    description: "This is an alert message.",
    variant: "default",
    icon: "AlertCircle",
    width: "auto",
    height: "auto",
    className: "",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
