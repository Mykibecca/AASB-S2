import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  FileCheck, 
  ClipboardList, 
  BarChart3, 
  Download,
  ChevronRight
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Welcome", url: "/", icon: Home },
  { title: "Classification Information", url: "/readiness", icon: FileCheck },
  { title: "Disclosure Questions", url: "/questionnaire", icon: ClipboardList },
  { title: "Summary Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Export & Share", url: "/export", icon: Download },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isCollapsed = state === "collapsed";
  
  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) => {
    const baseClasses = "w-full justify-start transition-all duration-200";
    if (isActive(path)) {
      return `${baseClasses} bg-primary text-primary-foreground shadow-sm`;
    }
    return `${baseClasses} hover:bg-accent hover:text-accent-foreground`;
  };

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarContent className="bg-card">
        {/* App Brand */}
        <div className="p-4 border-b border-border">
          <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img
              src="/logo.png"
              alt="AASB S2 Readiness"
              className="w-10 h-10 object-contain rounded-xl flex-shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-lg text-foreground truncate">AASB S2 Toolkit</h1>
                <p className="text-xs text-muted-foreground tuncate">Climate Disclosure Guide</p>
              </div>
            )}
          </NavLink>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4 py-2">
            {!isCollapsed ? "Main Navigation" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {navigationItems.map((item, index) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild className="p-0">
                    <NavLink to={item.url} className={getNavClasses(item.url)}>
                      <div className="flex items-center gap-3 w-full px-3 py-2.5">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="font-medium truncate">{item.title}</span>
                            {isActive(item.url) && (
                              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                            )}
                          </>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}