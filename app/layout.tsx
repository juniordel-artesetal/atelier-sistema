import type { Metadata } from "next"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import Sidebar from "@/components/Sidebar"
import NotificationBell from "@/components/NotificationBell"

export const metadata: Metadata = {
  title: "Atelie Sistema",
  description: "Sistema de Producao",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><meta charSet="utf-8" /></head>
      <body>
        <SessionProvider>
          <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-4 md:px-8 gap-3 flex-shrink-0">
                <div className="flex-1 md:hidden" />
                <NotificationBell />
              </header>
              <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {children}
              </main>
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
