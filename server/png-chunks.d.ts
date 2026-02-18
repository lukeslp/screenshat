declare module "png-chunks-extract" {
  interface Chunk { name: string; data: Uint8Array }
  function extract(buffer: Buffer | Uint8Array): Chunk[];
  export = extract;
}

declare module "png-chunks-encode" {
  interface Chunk { name: string; data: Uint8Array }
  function encode(chunks: Chunk[]): Uint8Array;
  export = encode;
}

declare module "png-chunk-text" {
  interface Chunk { name: string; data: Uint8Array }
  function encode(keyword: string, text: string): Chunk;
  function decode(chunk: Chunk): { keyword: string; text: string };
  export = { encode, decode };
}
