import type { ReactNode } from "react";

export type ModalPresentation = "modal" | "panel";

export type ModalAnchor = "right" | "left" | "top" | "bottom";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  footerHelp?: ReactNode;
  presentation?: ModalPresentation;
  anchor?: ModalAnchor;
  size?: ModalSize;
  centerTitle?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
  className?: string;
  overlayClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  ariaLabel?: string;
}
