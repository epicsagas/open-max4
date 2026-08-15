import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  // Pages는 /<repo>/ 하위 경로로 서빙된다. 상대 경로면 로컬·배포 양쪽에서 동작한다.
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true },
  plugins: [svelte()],
});
