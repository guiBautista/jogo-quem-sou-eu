import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// O build vai para https://guibautista.github.io/jogo-quem-sou-eu/, então os
// assets precisam do prefixo do repositório. Em dev fica na raiz, para o
// endereço de teste no celular continuar curto.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/jogo-quem-sou-eu/' : '/',
  plugins: [react(), tailwindcss()],
  server: { host: true },
}))
