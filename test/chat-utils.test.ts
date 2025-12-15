import { describe, it, expect } from "vitest";
import {
  getApiBase,
  buildApiUrl,
  decodeTitle,
  isLoadingState,
  parseMessageData,
  isOrbitChatSubmission,
  shouldSubmitCode,
  buildChatUrl,
} from "@/lib/chat-utils";

describe("chat-utils", () => {
  describe("getApiBase", () => {
    it("returns /api/support when useAgoricWebsiteMCP is set", () => {
      expect(getApiBase("true", null)).toBe("/api/support");
    });

    it("returns /api/ymax when theme is ymax", () => {
      expect(getApiBase(null, "ymax")).toBe("/api/ymax");
    });

    it("returns /api/chat by default", () => {
      expect(getApiBase(null, null)).toBe("/api/chat");
    });
  });

  describe("buildApiUrl", () => {
    it("returns apiBase when no query params", () => {
      const params = new URLSearchParams();
      expect(buildApiUrl("/api/chat", params)).toBe("/api/chat");
    });

    it("appends query params to apiBase", () => {
      const params = new URLSearchParams();
      params.set("context", "test-context");
      expect(buildApiUrl("/api/chat", params)).toBe(
        "/api/chat?context=test-context"
      );
    });

    it("handles multiple query params", () => {
      const params = new URLSearchParams();
      params.set("context", "ctx");
      params.set("foo", "bar");
      expect(buildApiUrl("/api/support", params)).toBe(
        "/api/support?context=ctx&foo=bar"
      );
    });
  });

  describe("decodeTitle", () => {
    it("returns default title when titleParam is null", () => {
      expect(decodeTitle(null)).toBe("Agoric AI Chat");
    });

    it("decodes URL-encoded title", () => {
      expect(decodeTitle("Hello%20World")).toBe("Hello World");
      expect(decodeTitle("Test%26Title")).toBe("Test&Title");
    });

    it("returns default title for invalid encoding", () => {
      expect(decodeTitle("%E0%A4%A")).toBe("Agoric AI Chat");
    });

    it("handles empty string", () => {
      expect(decodeTitle("")).toBe("Agoric AI Chat");
    });
  });

  describe("isLoadingState", () => {
    it("returns true for streaming status", () => {
      expect(isLoadingState("streaming")).toBe(true);
    });

    it("returns true for submitted status", () => {
      expect(isLoadingState("submitted")).toBe(true);
    });

    it("returns false for idle status", () => {
      expect(isLoadingState("idle")).toBe(false);
    });

    it("returns false for error status", () => {
      expect(isLoadingState("error")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isLoadingState("")).toBe(false);
    });
  });

  describe("parseMessageData", () => {
    it("parses valid JSON string", () => {
      expect(parseMessageData('{"type":"test"}')).toEqual({ type: "test" });
    });

    it("returns original string for invalid JSON", () => {
      expect(parseMessageData("not json")).toBe("not json");
    });

    it("returns non-string data as-is", () => {
      const obj = { foo: "bar" };
      expect(parseMessageData(obj)).toBe(obj);
    });

    it("handles null", () => {
      expect(parseMessageData(null)).toBe(null);
    });

    it("handles arrays", () => {
      const arr = [1, 2, 3];
      expect(parseMessageData(arr)).toBe(arr);
    });

    it("parses nested JSON", () => {
      const json = '{"payload":{"input":"test"}}';
      expect(parseMessageData(json)).toEqual({ payload: { input: "test" } });
    });
  });

  describe("isOrbitChatSubmission", () => {
    it("returns true for valid ORBIT_CHAT/SET_AND_SUBMIT message", () => {
      const data = {
        type: "ORBIT_CHAT/SET_AND_SUBMIT",
        payload: { input: "test" },
      };
      expect(isOrbitChatSubmission(data)).toBe(true);
    });

    it("returns false for different type", () => {
      const data = { type: "OTHER_TYPE", payload: { input: "test" } };
      expect(isOrbitChatSubmission(data)).toBe(false);
    });

    it("returns false for string", () => {
      expect(isOrbitChatSubmission("string")).toBe(false);
    });

    it("returns false for object without type", () => {
      expect(isOrbitChatSubmission({ payload: { input: "test" } })).toBe(false);
    });

  });

  describe("shouldSubmitCode", () => {
    it("returns true when all conditions are met", () => {
      expect(shouldSubmitCode("code", 5, 4, false)).toBe(true);
    });

    it("returns false when submittedCode is null", () => {
      expect(shouldSubmitCode(null, 1, 0, false)).toBe(false);
    });

    it("returns false when submittedCode is empty string", () => {
      expect(shouldSubmitCode("", 1, 0, false)).toBe(false);
    });

    it("returns false when submissionKey is 0", () => {
      expect(shouldSubmitCode("code", 0, 0, false)).toBe(false);
    });

    it("returns false when submissionKey equals lastSubmittedKey", () => {
      expect(shouldSubmitCode("code", 5, 5, false)).toBe(false);
    });

    it("returns false when isLoading is true", () => {
      expect(shouldSubmitCode("code", 1, 0, true)).toBe(false);
    });
  });

  describe("buildChatUrl", () => {
    it("builds URL without query params", () => {
      const params = new URLSearchParams();
      expect(buildChatUrl("abc123", params)).toBe("/chat/abc123");
    });

    it("builds URL with query params", () => {
      const params = new URLSearchParams();
      params.set("context", "test");
      expect(buildChatUrl("abc123", params)).toBe("/chat/abc123?context=test");
    });

    it("builds URL with multiple query params", () => {
      const params = new URLSearchParams();
      params.set("theme", "ymax");
      params.set("context", "ctx");
      expect(buildChatUrl("xyz789", params)).toBe(
        "/chat/xyz789?theme=ymax&context=ctx"
      );
    });

    it("handles special characters in chatId", () => {
      const params = new URLSearchParams();
      expect(buildChatUrl("abc-123_xyz", params)).toBe("/chat/abc-123_xyz");
    });
  });
});