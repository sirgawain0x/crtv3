"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      `fixed inset-0 z-45 bg-black/80  data-[state=open]:animate-in 
      data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`,
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          `fixed left-[50%] top-[50%] z-45 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background 
          p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out 
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 
          data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] 
          data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg`,
          className
        )}
        onOpenAutoFocus={(e) => {
          // When dialog opens, blur any focused elements outside the dialog
          // This prevents aria-hidden warnings when background elements retain focus
          const activeElement = document.activeElement as HTMLElement;

          // Check if the active element is outside the dialog
          if (activeElement && !activeElement.closest('[data-radix-dialog-content]')) {
            previousActiveElementRef.current = activeElement;
            // Blur the element to prevent aria-hidden warnings
            // Use setTimeout to ensure this happens after Radix processes the dialog open
            setTimeout(() => {
              if (activeElement && !activeElement.closest('[data-radix-dialog-content]')) {
                activeElement.blur();
              }
            }, 0);
          }

          // Prevent auto-focus conflicts that can cause aria-hidden warnings
          // This helps avoid accessibility warnings with third-party scripts that inject buttons
          if (
            activeElement &&
            (activeElement.closest('[data-radix-dialog-content]') ||
              activeElement.tagName === 'BUTTON' ||
              activeElement.closest('script'))
          ) {
            e.preventDefault();
          }
        }}
        onCloseAutoFocus={(e) => {
          // Restore focus when dialog closes (optional, but good UX)
          if (previousActiveElementRef.current) {
            e.preventDefault();
            previousActiveElementRef.current.focus();
            previousActiveElementRef.current = null;
          }
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={`absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 
        focus:outline-none focus:ring-2 focus:ring-ring 
        focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground`}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
