import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between px-6 bg-card border-b border-border shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-sustainability rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ESG</span>
                </div>
                <span className="font-semibold text-foreground">ESG Disclosure Suite</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Guest User
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}