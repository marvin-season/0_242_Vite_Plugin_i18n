import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelGenerate from "@babel/generator";
import path from "path";
import fs from "fs";
import { stringify } from "csv-stringify/sync";

const traverse = (babelTraverse as unknown as { default: typeof babelTraverse; }).default;
const generate = (babelGenerate as unknown as { default: typeof babelGenerate; }).default;

const csvFilePath = path.relative(process.cwd(), "translation_keys.csv");

function tagText() {
  let isBuild = false;
  const translationRecords: Array<{ key: string; text: string }> = [];

  return {
    name: "vite-plugin-tag-text",
    enforce: "pre" as const,
    config(
      _: unknown,
      { command }: { command: "build" | "serve"; mode: string }
    ) {
      // 判断当前是否处于 build 模式
      isBuild = command === "build";
    },
    transform(code: string, id: string) {
      // 只处理 .tsx 文件
      if (id.endsWith(".tsx")) {
        const filename = path.relative(process.cwd(), id);

        console.log("处理文件", id);

        let idx = 0;

        const ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });

        function getMarkedText(text: string) {
          const key = `${filename}_${idx++}`;
          translationRecords.push({ key, text });
          return key;
        }

        traverse(ast, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          JSXElement(path: { node: { children: any[] } }) {
            path.node.children.forEach(
              (child: {
                type: string;
                expression: { type: string; value: string };
                value: string;
              }) => {
                // <div>{"中文文本"}</div>
                if (
                  child.type === "JSXExpressionContainer" &&
                  child.expression.type === "StringLiteral"
                ) {
                  // 为文本增加计数器
                  child.expression.value = `${
                    child.expression.value
                  }${getMarkedText(child.expression.value)}`;
                }

                //  <div>中文文本</div>
                if (child.type === "JSXText" && child.value.trim().length > 0) {
                  // 为文本增加计数器
                  child.value = `${child.value}${getMarkedText(child.value)}`;
                }
              }
            );
          },
          VariableDeclarator(path) {
            // const text = "中文文本";
            if (path.node.id.type === "Identifier") {
              if (path.node.init?.type === "StringLiteral") {
                path.node.init.value = `${path.node.init.value}${getMarkedText(
                  path.node.init.value
                )}`;
              }
            }
          },
          TemplateElement(path) {
            // const text2 = `${text} | 中文文本`;
            if (path.node.value.raw.trim().length > 0) {
              path.node.value.raw = `${path.node.value.raw}${getMarkedText(
                path.node.value.raw
              )}`;
            }
          },
          JSXAttribute(path) {
            // <input type="text" value="中文文本" />
            if (
              path.node.name.name === "value" &&
              path.node.value?.type === "StringLiteral"
            ) {
              path.node.value.value = `${path.node.value.value}${getMarkedText(
                path.node.value.value
              )}`;
            }
          },
        });

        // 使用 @babel/generator 生成修改后的代码
        const output = generate(ast, {}, code).code;

        // 写入修改后的代码到文件
        // fs.writeFileSync(id, output, "utf-8");

        // 写入 csv 文件
        if (isBuild) {
          // 生成 CSV 内容
          const csvContent = stringify(translationRecords, {
            header: true,
            columns: ["key", "text"], // 定义 CSV 列
          });
          // 写入 CSV 文件
          fs.writeFileSync(csvFilePath, csvContent, "utf-8");
        }

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
