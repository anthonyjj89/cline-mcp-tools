/**
 * Type declarations for external modules
 */

declare module 'stream-json/Parser.js' {
  export const Parser: {
    new(options?: { jsonStreaming?: boolean }): any;
  };
}

declare module 'stream-json/streamers/StreamArray.js' {
  export const StreamArray: {
    new(): any;
  };
}

declare module 'stream-chain' {
  export function chain(transforms: any[]): any;
}
