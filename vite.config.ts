import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "@babel/parser";
import * as babelTraverse from "@babel/traverse";

// import generate from "@babel/generator";

function tagText() {
  return {
    name: "vite-plugin-tag-text",
    enforce: "pre" as "pre",
    transform(code, id) {
      // 只处理 .tsx 文件
      if (id.endsWith(".tsx")) {
        console.log("处理文件", id);
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });

        babelTraverse.default.default(ast, {
          JSXElement(path) {
            path.node.children.forEach((child) => {
              if (child.type === "JSXText" && child.value.trim().length > 0) {
                // 为文本增加计数器
                console.log("文本内容", child.value);
              }
            });
          },
        });
      }

      return code;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tagText()],
});
