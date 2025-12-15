/**
 * Determines the API base URL based on search parameters
 */
export function getApiBase(
  useAgoricWebsiteMCP: string | null,
  theme: string | null
): string {
  if (useAgoricWebsiteMCP) {
    return "/api/support";
  }
  if (theme === "ymax") {
    return "/api/ymax";
  }
  return "/api/chat";
}

/**
 * Builds the full API URL with query parameters
 */
export function buildApiUrl(
  apiBase: string,
  queryParams: URLSearchParams
): string {
  const queryString = queryParams.toString();
  return queryString ? `${apiBase}?${queryString}` : apiBase;
}

/**
 * Decodes and returns the chat title with a default fallback
 */
export function decodeTitle(
  titleParam: string | null,
): string {
  const defaultTitle = "Agoric AI Chat";
  if (!titleParam) {
    return defaultTitle;
  }
  try {
    return decodeURIComponent(titleParam);
  } catch {
    return defaultTitle;
  }
}

/**
 * Determines if the chat is in a loading state based on status
 */
export function isLoadingState(status: string): boolean {
  return status === "streaming" || status === "submitted";
}

/**
 * Safely parses JSON from a message event data
 */
export function parseMessageData(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

/**
 * Checks if a message event is an ORBIT_CHAT submission
 */
export function isOrbitChatSubmission(
  data: unknown
): data is { type: string; payload: { input: string } } {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data as { type: string }).type === "ORBIT_CHAT/SET_AND_SUBMIT"
  );
}

/**
 * Determines if code should be submitted based on state
 */
export function shouldSubmitCode(
  submittedCode: string | null,
  submissionKey: number,
  lastSubmittedKey: number,
  isLoading: boolean
): boolean {
  return (
    Boolean(submittedCode) &&
    submissionKey > 0 &&
    submissionKey !== lastSubmittedKey &&
    !isLoading
  );
}

/**
 * Builds the new URL for chat navigation after first message
 */
export function buildChatUrl(
  chatId: string,
  searchParams: URLSearchParams
): string {
  const queryString = searchParams.toString();
  const query = queryString ? `?${queryString}` : "";
  return `/chat/${chatId}${query}`;
}
