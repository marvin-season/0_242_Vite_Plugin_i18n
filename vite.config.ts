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
              // <div>{"中文文本"}</div>
              if (
                child.type === "JSXExpressionContainer" &&
                child.expression.type === "StringLiteral"
              ) {
                // 为文本增加计数器
                child.expression.value = `${child.expression.value}@marked`;
              }

              //  <div>中文文本</div>
              if (child.type === "JSXText" && child.value.trim().length > 0) {
                // 为文本增加计数器
                child.value = `${child.value}@marked`;
              }
            });
          },
          VariableDeclarator(path) {
            // const text = "中文文本";
            if (path.node.id.type === "Identifier") {
              if (path.node.init?.type === "StringLiteral") {
                path.node.init.value = `${path.node.init.value}@marked`;
              }
            }
          },
          TemplateElement(path) {
            // const text2 = `${text} | 中文文本`;
            if (path.node.value.raw.trim().length > 0) {
              path.node.value.raw = `${path.node.value.raw}@marked`;
            }
          },
          JSXAttribute(path) {
            // <input type="text" value="中文文本" />
            console.log(path.node.name.name);
            if (
              path.node.name.name === "value" &&
              path.node.value?.type === "StringLiteral"
            ) {
              path.node.value.value = `${path.node.value.value}@marked`;
            }
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
