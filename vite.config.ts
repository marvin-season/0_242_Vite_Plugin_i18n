import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tagText from "./plugins/tagText";
import replaceText from "./plugins/replaceText";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tagText(), replaceText()],
});
