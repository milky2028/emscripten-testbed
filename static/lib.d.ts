// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

interface EmbindModule {
  create_memory(): void;
}

export type MainModule = WasmModule & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
