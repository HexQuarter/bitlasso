/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BREEZ_API_KEY: string
    readonly VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: string
    readonly VITE_PUBLIC_POSTHOG_HOST: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}