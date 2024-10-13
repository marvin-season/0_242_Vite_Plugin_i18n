import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "@babel/parser";
import * as babelTraverse from "@babel/traverse";
import * as babelGenerate from "@babel/generator";
import path from "path";

const traverse = babelTraverse.default;
const generate = babelGenerate.default;

function tagText() {
  return {
    name: "vite-plugin-tag-text",
    enforce: "pre" as const,
    transform(code, id) {
      // 只处理 .tsx 文件
      if (id.endsWith(".tsx")) {
        const filename = path.relative(process.cwd(), id);

        console.log("处理文件", id);

        let idx = 0;

        const ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });

        function getMarkedText() {
          return `${filename}_${idx++}`;
        }

        traverse.default(ast, {
          JSXElement(path) {
            path.node.children.forEach((child) => {
              // <div>{"中文文本"}</div>
              if (
                child.type === "JSXExpressionContainer" &&
                child.expression.type === "StringLiteral"
              ) {
                // 为文本增加计数器
                child.expression.value = `${
                  child.expression.value
                }${getMarkedText()}`;
              }

              //  <div>中文文本</div>
              if (child.type === "JSXText" && child.value.trim().length > 0) {
                // 为文本增加计数器
                child.value = `${child.value}${getMarkedText()}`;
              }
            });
          },
          VariableDeclarator(path) {
            // const text = "中文文本";
            if (path.node.id.type === "Identifier") {
              if (path.node.init?.type === "StringLiteral") {
                path.node.init.value = `${
                  path.node.init.value
                }${getMarkedText()}`;
              }
            }
          },
          TemplateElement(path) {
            // const text2 = `${text} | 中文文本`;
            if (path.node.value.raw.trim().length > 0) {
              path.node.value.raw = `${path.node.value.raw}${getMarkedText()}`;
            }
          },
          JSXAttribute(path) {
            // <input type="text" value="中文文本" />
            console.log(path.node.name.name);
            if (
              path.node.name.name === "value" &&
              path.node.value?.type === "StringLiteral"
            ) {
              path.node.value.value = `${
                path.node.value.value
              }${getMarkedText()}`;
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
