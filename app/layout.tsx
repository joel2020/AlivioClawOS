import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Clawbot Operator Dashboard",
  description: "Multi-agent orchestration operator dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-screen h-full bg-slate-950 text-slate-100">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
