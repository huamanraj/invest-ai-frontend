"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";
import { ChatContent } from "./chat-content";
import { ThemeProvider } from "./theme-provider";

function FullChatApp() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <ChatSidebar />
        <SidebarInset>
          <ChatContent />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export { FullChatApp };
