/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SMOKE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SmokeBridge {
  enterSampleStudio: () => void;
}

interface Window {
  __casebook?: SmokeBridge;
}
