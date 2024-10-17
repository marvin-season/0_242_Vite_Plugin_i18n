import { parse } from "@babel/parser";
import babelTraverse from "@babel/traverse";
import babelGenerate from "@babel/generator";
import * as t from "@babel/types";
import path from "path";
import fs from "fs";

const traverse = (babelTraverse as unknown as { default: typeof babelTraverse })
  .default;
const generate = (babelGenerate as unknown as { default: typeof babelGenerate })
  .default;

function createI18nCall(text: string) {
  return t.callExpression(t.identifier("t"), [t.stringLiteral(text)]);
}

export default function replaceText() {
  const translationRecords: Array<{ key: string; text: string }> = [];

  return {
    name: "vite-plugin-replace-text",
    enforce: "pre" as const,
    apply: "build" as const,
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
          JSXElement(path) {
            path.node.children.forEach((child) => {
              // <div>{"中文文本"}</div>
              if (
                child.type === "JSXExpressionContainer" &&
                child.expression.type === "StringLiteral"
              ) {
                // 为文本增加计数器
                // child.expression.value = `${
                //   child.expression.value
                // }${getMarkedText(child.expression.value)}`;

                child.expression = createI18nCall(
                  getMarkedText(child.expression.value)
                );
              }

              // //  <div>中文文本</div>
              // if (child.type === "JSXText" && child.value.trim().length > 0) {
              //   // 为文本增加计数器
              //   child.value = `${child.value}${getMarkedText(child.value)}`;
              // }
            });
          },
          // VariableDeclarator(path) {
          //   // const text = "中文文本";
          //   if (path.node.id.type === "Identifier") {
          //     if (path.node.init?.type === "StringLiteral") {
          //       path.node.init.value = `${path.node.init.value}${getMarkedText(
          //         path.node.init.value
          //       )}`;
          //     }
          //   }
          // },
          // TemplateElement(path) {
          //   // const text2 = `${text} | 中文文本`;
          //   if (path.node.value.raw.trim().length > 0) {
          //     path.node.value.raw = `${path.node.value.raw}${getMarkedText(
          //       path.node.value.raw
          //     )}`;
          //   }
          // },
          // JSXAttribute(path) {
          //   // <input type="text" value="中文文本" />
          //   if (
          //     path.node.name.name === "value" &&
          //     path.node.value?.type === "StringLiteral"
          //   ) {
          //     path.node.value.value = `${path.node.value.value}${getMarkedText(
          //       path.node.value.value
          //     )}`;
          //   }
          // },
        });

        // 使用 @babel/generator 生成修改后的代码
        const output = generate(ast, {}, code).code;

        // 获取文件的相对路径
        const relativePath = path.relative(process.cwd(), id);

        // 新的根目录，所有输出文件都会在该目录下
        const outputDir = path.join(process.cwd(), "output");

        // 生成新的输出路径，保持相同的目录结构
        const newFilePath = path.join(outputDir, relativePath);

        // 确保输出目录存在，如果不存在则创建
        const newFileDir = path.dirname(newFilePath);
        fs.mkdirSync(newFileDir, { recursive: true });

        // 写入新的文件
        fs.writeFileSync(newFilePath, output, "utf-8");

        return output; // 返回修改后的代码
      }

      return code;
    },
  };
}
