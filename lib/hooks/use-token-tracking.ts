import { useState, useCallback } from 'react';
import { DefaultChatTransport } from 'ai';

export function useTokenTracking() {
  const [tokenUsage, setTokenUsage] = useState<number | undefined>(undefined);

  const resetTokenUsage = useCallback(() => {
    setTokenUsage(undefined);
  }, []);

  const createTokenTrackingTransport = useCallback(
    (config: ConstructorParameters<typeof DefaultChatTransport>[0]) => {
      const originalFetch = config?.fetch || fetch;

      return new DefaultChatTransport({
        ...config,
        async fetch(input, init) {
          const response = await originalFetch(input, init);

          // Only intercept SSE streams
          if (!response.headers.get('content-type')?.includes('text/event-stream')) {
            return response;
          }

          const reader = response.body?.getReader();
          if (!reader) return response;

          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let buffer = '';

          const stream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    controller.close();
                    break;
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  const filtered: string[] = [];
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'data-token-usage' && data.inputTokens) {
                          setTokenUsage(data.inputTokens);
                          continue;
                        }
                      } catch {
                        // Not JSON, pass through
                      }
                    }
                    filtered.push(line);
                  }

                  if (filtered.length > 0) {
                    controller.enqueue(encoder.encode(filtered.join('\n') + '\n'));
                  }
                }
              } catch (error) {
                controller.error(error);
              }
            },
          });

          return new Response(stream, {
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
          });
        },
      });
    },
    []
  );

  return { tokenUsage, resetTokenUsage, createTokenTrackingTransport };
}

