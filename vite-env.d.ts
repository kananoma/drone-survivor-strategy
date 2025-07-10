interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 他のカスタム環境変数があればここに追記
  // 例: readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
