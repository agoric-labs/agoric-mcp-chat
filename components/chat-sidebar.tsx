"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, PlusCircle, Trash2, ServerIcon, Settings, Sparkles, ChevronsUpDown, Copy, Pencil, Github, Key } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuBadge,
    useSidebar
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { MCPServerManager } from "./mcp-server-manager";
import { ApiKeyManager } from "./api-key-manager";
import { ThemeToggle } from "./theme-toggle";
import { getUserId, updateUserId } from "@/lib/user-id";
import { useChats } from "@/lib/hooks/use-chats";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMCP } from "@/lib/context/mcp-context";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "motion/react";
export function ChatSidebar() {
    const [mcpSettingsOpen, setMcpSettingsOpen] = useState(false);
    const [apiKeySettingsOpen, setApiKeySettingsOpen] = useState(false);
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
  
    // Get MCP server data from context
    const {
      mcpServers,
      setMcpServers,
      selectedMcpServers,
      setSelectedMcpServers,
    } = useMCP();
  
    // Get active MCP servers status
    const activeServersCount = selectedMcpServers.length;
  
    return (
      <Sidebar
        className="shadow-sm bg-background/80 dark:bg-background/40 ocean:bg-background/40 backdrop-blur-md"
        collapsible="icon"
      >
        <SidebarHeader className="p-4 border-b border-border/40">
          <div className="flex items-center justify-start">
            <div
              className={`flex items-center gap-2 ${
                isCollapsed ? "justify-center w-full" : ""
              }`}
            >
              <div
                className={`relative rounded-full bg-primary/70 flex items-center justify-center ${
                  isCollapsed ? "size-5 p-3" : "size-6"
                }`}
              >
                <img
                  src="/logo.png"
                  alt="Agoric ChatBot Logo"
                  width={24}
                  height={24}
                  className="absolute transform scale-75"
                />
              </div>
              {!isCollapsed && (
                <div className="font-semibold text-lg text-foreground/90">
                  Agoric AI Chat
                </div>
              )}
            </div>
          </div>
        </SidebarHeader>
  
        <SidebarContent className="flex flex-col h-[calc(100vh-8rem)]">
          <SidebarGroup className="flex-shrink-0 pl-0 h-full">
            <SidebarGroupContent className="h-full flex flex-col">
              <SidebarMenu className="h-full flex flex-col">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setMcpSettingsOpen(true)}
                    className={cn(
                      "w-full flex items-center gap-2 transition-all",
                      "hover:bg-secondary/50 active:bg-secondary/70 cursor-pointer",
                    )}
                    tooltip={isCollapsed ? "MCP Servers" : undefined}
                  >
                    <ServerIcon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        activeServersCount > 0
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="flex-grow text-sm text-foreground/80">
                        MCP Servers
                      </span>
                    )}
                    {activeServersCount > 0 && !isCollapsed ? (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] px-1.5 py-0 h-5 bg-secondary/80"
                      >
                        {activeServersCount}
                      </Badge>
                    ) : activeServersCount > 0 && isCollapsed ? (
                      <SidebarMenuBadge className="bg-secondary/80 text-secondary-foreground">
                        {activeServersCount}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <div className="border-b border-border/40 w-full" />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setApiKeySettingsOpen(true)}
                    className="w-full flex items-center gap-2 transition-all hover:bg-secondary/50 active:bg-secondary/70 cursor-pointer"
                  >
                    <Key className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-grow text-sm text-foreground/80">
                      API Keys
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className="mt-auto">
                  <SidebarMenuButton
                    onClick={() =>
                      window.open("https://github.com/agoric/agoric-sdk", "_blank")
                    }
                    className="w-full flex items-center gap-2 transition-all hover:bg-secondary/50 active:bg-secondary/70 cursor-pointer"
                  >
                    <Github className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-grow text-sm text-foreground/80">
                      GitHub
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="w-full p-2 flex items-center justify-between gap-2 transition-all hover:bg-secondary/50 active:bg-secondary/70 cursor-default"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="text-sm text-foreground/80">Theme</span>
                    </div>
                    <ThemeToggle className="h-6 w-6" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-border/40 mt-auto">
          <div className="flex flex-col gap-4 items-center">
            {!isCollapsed && (
              <p className="text-xs text-muted-foreground">
                Built with{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://git.new/s-mcp"
                  className="text-primary hover:text-primary/80"
                >
                  Scira Chat
                </a>
              </p>
            )}
          </div>
          <MCPServerManager
            servers={mcpServers}
            onServersChange={setMcpServers}
            selectedServers={selectedMcpServers}
            onSelectedServersChange={setSelectedMcpServers}
            open={mcpSettingsOpen}
            onOpenChange={setMcpSettingsOpen}
          />
  
          <ApiKeyManager
            open={apiKeySettingsOpen}
            onOpenChange={setApiKeySettingsOpen}
          />
        </SidebarFooter>
      </Sidebar>
    );
  }
  