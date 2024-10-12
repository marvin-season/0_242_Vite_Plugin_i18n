import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "@babel/parser";
import * as babelTraverse from "@babel/traverse";
import * as babelGenerate from "@babel/generator";

const traverse = babelTraverse.default;
const generate = babelGenerate.default;

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

        traverse.default(ast, {
          JSXElement(path) {
            path.node.children.forEach((child) => {
              if (child.type === "JSXText" && child.value.trim().length > 0) {
                // 为文本增加计数器
                console.log("文本内容", child.value);
                child.value = `${child.value}@marked`;
              }
            });
          },
        });

        // 使用 @babel/generator 生成修改后的代码
        const output = generate.default(ast, {}, code).code;

        // 写入修改后的代码到文件
        // fs.writeFileSync(id, output, "utf-8");

        return output; // 返回修改后的代码
      }

      return code;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tagText()],
});
