import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MinusCircle,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeVariant } from "./ui/badge";

// Status is never colour-only: every badge carries an icon AND a text label (docs/DESIGN.md).
const DEFAULT_ICON: Record<BadgeVariant, LucideIcon> = {
  success: ShieldCheck,
  warning: ShieldHalf,
  danger: ShieldAlert,
  info: Send,
  neutral: MinusCircle,
  default: MinusCircle,
  outline: MinusCircle,
};

export interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  icon?: LucideIcon;
}

export function StatusBadge({ variant, label, icon }: StatusBadgeProps) {
  const Icon = icon ?? DEFAULT_ICON[variant];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}

export { CheckCircle, Clock, AlertTriangle };
