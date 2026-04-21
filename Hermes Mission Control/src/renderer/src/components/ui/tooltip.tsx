import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  className,
  sideOffset = 4,
  side,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>): JSX.Element {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        side={side}
        className={cn(
          'z-50 overflow-hidden rounded-md border bg-card px-2.5 py-1.5 text-xs text-foreground shadow-md',
          'animate-fade-in border-border',
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}
