"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { useSearchParams } from "next/navigation";

// Define types for MCP server
export interface KeyValuePair {
  key: string;
  value: string;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  type: "sse" | "stdio";
  command?: string;
  args?: string[];
  env?: KeyValuePair[];
  headers?: KeyValuePair[];
  description?: string;
}

// Type for processed MCP server config for API
export interface MCPServerApi {
  type: "sse" | "stdio";
  url: string;
  command?: string;
  args?: string[];
  env?: KeyValuePair[];
  headers?: KeyValuePair[];
}

interface MCPContextType {
  mcpServers: MCPServer[];
  setMcpServers: (servers: MCPServer[]) => void;
  selectedMcpServers: string[];
  setSelectedMcpServers: (serverIds: string[]) => void;
  mcpServersForApi: MCPServerApi[];
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);
const DEFAULT_MCP_SERVER_ID = "agoric-mcp-server";

const DEFAULT_MCP_SERVER: MCPServer = {
  id: DEFAULT_MCP_SERVER_ID,
  name: "Agoric MCP Server",
  type: "sse",
  url: "https://ymax-mcp-server.agoric-core.workers.dev/sse",
};

export function MCPProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const searchParams = useSearchParams();
  const useAgoricWebsiteMCP =
    decodeURIComponent(
      searchParams.get("useAgoricWebsiteMCP") || "",
    ).toLowerCase() === "true";

  if (useAgoricWebsiteMCP) {
    DEFAULT_MCP_SERVER.url =
      "https://agoric-mcp-devops-server.agoric-core.workers.dev/sse";
  }
  const [_mcpServers, setMcpServers] = useLocalStorage<MCPServer[]>(
    STORAGE_KEYS.MCP_SERVERS,
    [DEFAULT_MCP_SERVER],
  );
  const [_selectedMcpServers, setSelectedMcpServers] = useLocalStorage<
    string[]
  >(STORAGE_KEYS.SELECTED_MCP_SERVERS, [DEFAULT_MCP_SERVER_ID]);
  const [mcpServersForApi, setMcpServersForApi] = useState<MCPServerApi[]>([]);

  const mcpServers = !_mcpServers.find(({ id }) => id === DEFAULT_MCP_SERVER_ID)
    ? [DEFAULT_MCP_SERVER, ..._mcpServers]
    : _mcpServers;
  const selectedMcpServers = !_selectedMcpServers.find(
    (id) => id === DEFAULT_MCP_SERVER_ID,
  )
    ? [DEFAULT_MCP_SERVER_ID, ..._selectedMcpServers]
    : _selectedMcpServers;

  // Process MCP servers for API consumption whenever server data changes
  useEffect(() => {
    if (!selectedMcpServers.length) {
      setMcpServersForApi([]);
      return;
    }

    const processedServers: MCPServerApi[] = selectedMcpServers
      .map((id) => mcpServers.find((server) => server.id === id))
      .filter((server): server is MCPServer => Boolean(server))
      .map((server) => ({
        type: server.type,
        url: server.url,
        command: server.command,
        args: server.args,
        env: server.env,
        headers: server.headers,
      }));

    setMcpServersForApi(processedServers);
  }, [mcpServers, selectedMcpServers]);

  return (
    <MCPContext.Provider
      value={{
        mcpServers,
        setMcpServers: (servers) =>
          setMcpServers(
            !servers.find(({ id }) => id === DEFAULT_MCP_SERVER_ID)
              ? [DEFAULT_MCP_SERVER, ...servers]
              : servers,
          ),
        selectedMcpServers,
        setSelectedMcpServers: (serverIds) =>
          setSelectedMcpServers(
            !serverIds.find((id) => id === DEFAULT_MCP_SERVER_ID)
              ? [DEFAULT_MCP_SERVER_ID, ...serverIds]
              : serverIds,
          ),
        mcpServersForApi,
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCP must be used within an MCPProvider");
  }
  return context;
}
