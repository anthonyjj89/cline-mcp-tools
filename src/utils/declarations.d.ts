/**
 * Type declarations for libraries without TypeScript definitions
 */

declare module 'stream-json/Parser' {
  import { Transform } from 'stream';
  
  export interface ParserOptions {
    jsonStreaming?: boolean;
    ndjson?: boolean;
    packValues?: boolean;
    packKeys?: boolean;
    streamValues?: boolean;
    streamKeys?: boolean;
    [key: string]: any;
  }
  
  export class Parser extends Transform {
    constructor(options?: ParserOptions);
  }
}

declare module 'stream-json/streamers/StreamArray' {
  import { Transform } from 'stream';
  
  export interface StreamArrayItem<T = any> {
    key: number;
    value: T;
  }
  
  export class StreamArray extends Transform {
    constructor(options?: any);
  }
}

declare module 'stream-chain' {
  import { Stream } from 'stream';
  
  export function chain(streams: (Stream | Function)[]): Stream;
}
