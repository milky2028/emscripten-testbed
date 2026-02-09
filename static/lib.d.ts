// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
declare namespace RuntimeExports {
    let HEAPF32: any;
    let HEAPF64: any;
    let HEAP_DATA_VIEW: any;
    let HEAP8: any;
    let HEAPU8: any;
    let HEAP16: any;
    let HEAPU16: any;
    let HEAP32: any;
    let HEAPU32: any;
    let HEAP64: any;
    let HEAPU64: any;
}
interface WasmModule {
  _malloc(_0: number): number;
  _free(_0: number): void;
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export type Stuff = {
  s1: EmbindString,
  s2: number,
  s3: number
};

export type PointDouble = {
  x: number,
  y: number
};

interface EmbindModule {
  get_from_main_thread(): void;
  get_from_thread(): void;
  fn_takes_string(_0: EmbindString): void;
  fn_takes_const_string_ref(_0: EmbindString): void;
  takes_class_const_ref(_0: Stuff): void;
  takes_val(_0: any): void;
  takes_val_ref(_0: any): void;
  takes_val_move(_0: any): void;
  convert_map(): any;
}

export type MainModule = WasmModule & typeof RuntimeExports & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
