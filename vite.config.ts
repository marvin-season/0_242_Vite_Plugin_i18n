import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tagText from "./plugins/tagText";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tagText()],
});
