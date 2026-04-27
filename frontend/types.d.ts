/// <reference types="https://deno.land/x/types/index.d.ts" />
/// <reference lib="deno.window" />

declare global {
  namespace Deno {
    const env: {
      get(key: string): string | undefined;
    };
  }
}

export {};
