import parser from '@babel/parser';
import babelTraverse from '@babel/traverse';
import babelGenerate from '@babel/generator';
import types from '@babel/types';
import fs from 'fs'
import {PluginOption} from 'vite';
import {stringify} from "csv-stringify/sync";
import path from "path";

const traverse = (babelTraverse as unknown as { default: typeof babelTraverse; }).default;
const generate = (babelGenerate as unknown as { default: typeof babelGenerate; }).default;

const csvFilePath = path.relative(process.cwd(), "translation_keys.csv");
const includesChinese = (v: string) => /[\u4e00-\u9fa5]+/g.test(v);

export const i18nPlugin: () => PluginOption = () => {
    let isBuild = false;
    const translationRecords: Array<{ key: string; text: string }> = [];

    return {
        name: 'i18n-plugin',
        config: (_, {command}) => {
            isBuild = command === "build";
        },
        configResolved() {
            console.log('i18n-plugin loaded');
        },
        // 在此lifecycle中code还是开发中的源代码
        load(id) {
            // 过滤掉非 JavaScript/TypeScript 文件
            if (!id.match(/\.(tsx)$/)) return;

            const code = fs.readFileSync(id, 'utf-8');

            console.log('id', id)
            // 使用 Babel parser 解析代码成 AST
            const ast = parser.parse(code, {
                sourceType: 'module',
                plugins: ['jsx', "typescript"],
            });

            // 将匹配到的类型转换为 StringLiteral,在 StringLiteral中统一对中文进行处理
            traverse(ast, {
                JSXText(path) {
                    const {node} = path;

                    if (includesChinese(node.value)) {
                        path.replaceWith(types.jsxExpressionContainer({
                            ...types.stringLiteral(node.value),
                            loc: node.loc
                        }))
                        return
                    }
                    path.skip()
                },
                TemplateLiteral: function (path) {
                    const {node} = path;
                    const {expressions, quasis} = node;
                    // convert `hello ${name} world` to `${'hello'} ${name} ${'world'}`
                    // ast: [a,b,a] => [a,b,a,b,a,b,a], a: 空隙或者字符串, b: 表达式
                    let enCountExpressions = 0;
                    quasis.forEach((node, index) => {
                        const {
                            value: {raw},
                        } = node;
                        if (!includesChinese(raw)) {
                            // nothing
                        } else {
                            const newCall = types.stringLiteral(raw);
                            expressions.splice(index + enCountExpressions, 0, {...newCall, loc: node.loc});
                            enCountExpressions++;
                            node.value = {
                                raw: '', cooked: '',
                            };
                            // 每增添一个表达式都需要变化原始节点,并新增下一个字符节点
                            quasis.push(types.templateElement({
                                raw: '', cooked: '',
                            }, false,),);
                        }
                    });
                    quasis[quasis.length - 1].tail = true;
                },
                StringLiteral(path) {
                    const {node, parent} = path;
                    const originalValue = node.value;

                    if (!includesChinese(originalValue)) {
                        return
                    }

                    // 排除 中文枚举 key
                    if (parent.type === 'TSEnumMember' && node === parent.id) {
                        return
                    }

                    // tag of the chinese string
                    const fileName = id.replace(/^(.*)(src.*)$/, '$2').replace(/\//g, '#')
                    const position = `${node.loc?.start.line}#${node.loc?.start.column}`;

                    translationRecords.push({key: `${fileName}#${position}`, text: originalValue});

                    // 构造新的字符串，包含文件名称和位置信息
                    const newValue = `${originalValue} 【【${parent.type}】${fileName}#${position}】`;
                    // 替换原来的字符串节点
                    path.replaceWith(types.stringLiteral(newValue));

                    // 跳过当前节点的后续子节点处理
                    path.skip();
                },
            });

            // 生成新的代码
            const output = generate(ast, {}, code);
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

            return {
                code: output.code,
                map: output.map,
            };
        }
    }
}