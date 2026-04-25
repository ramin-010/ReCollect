"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group-[.toaster]:backdrop-blur-xl !bg-[hsl(var(--card))]/95 !text-[hsl(var(--foreground))] !border-[hsl(var(--border))] !rounded-xl overflow-hidden",
          description: "group-[.toast]:text-[hsl(var(--muted-foreground))] text-sm",
          actionButton:
            "group-[.toast]:bg-[hsl(var(--primary))] group-[.toast]:text-[hsl(var(--primary-foreground))] !rounded-md font-medium transition-colors",
          cancelButton:
            "group-[.toast]:bg-[hsl(var(--muted))] group-[.toast]:text-[hsl(var(--muted-foreground))] !rounded-md font-medium transition-colors",
          closeButton:
            "!bg-transparent !text-[hsl(var(--muted-foreground))] hover:!bg-[hsl(var(--secondary))] hover:!text-[hsl(var(--foreground))] !border-none !transition-colors left-auto right-4",
          title: "text-[14px] font-medium tracking-tight",
          icon: "text-[hsl(var(--foreground))] opacity-60",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
