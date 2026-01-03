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
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-sm !bg-[hsl(var(--card-bg))] !text-[hsl(var(--foreground))] !border-[hsl(var(--border))]/20 data-[type=success]:[&_[data-icon]]:!text-emerald-500 data-[type=error]:[&_[data-icon]]:!text-red-500",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "!bg-gray-800 !text-white hover:!bg-red-600 hover:!border-red-500",
          title: "text-[15px] font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
