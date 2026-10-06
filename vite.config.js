import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// The Mobile Wallet Adapter package can't be installed at the top level (it
// peers on react-native, which conflicts with React 18), but a working copy
// is already resolved under @solana/wallet-adapter-react. Alias it so app code
// can import it cleanly, then we instantiate the adapter manually so it is
// present even inside the dApp Store review WebView (where the library's
// auto-detection skips MWA).
const mobileWalletAdapterPath = fileURLToPath(
  new URL('./node_modules/@solana/wallet-adapter-react/node_modules/@solana-mobile/wallet-adapter-mobile/lib/esm/index.js', import.meta.url)
)

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      '@solana-mobile/wallet-adapter-mobile': mobileWalletAdapterPath,
    },
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'
    }),
    react(),
  ]
});