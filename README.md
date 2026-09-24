# 生活进度

给自己用的本地生活进度板：事项、步骤看板、日志、备注、按日剪影。页面能直接改，刷新还在。

本机真实进度写在 `data/current.json` 和 `data/snaps/`，**不会**进 git、也不会上传。仓库里只有脱敏演示 `data/demo.json`。克隆后若没有 `current.json`，页面会用 `src/seed.ts` 里的同一套演示事项。已有本地文件时，导入演示：顶栏「导入」选 `data/demo.json`。

## 运行

需要 [Node.js](https://nodejs.org/)（建议 20 或以上）。

```powershell
cd 生活进度
npm install
npm run dev
```

浏览器打开终端里提示的地址（一般是 http://localhost:5173 ）。请用 `npm run dev` 启动，这样才会把进度写进 `data/`；只打开静态页面时只能暂存在浏览器。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发，并写入 `data/` |
| `npm run build` | 打包 |
| `npm run preview` | 预览打包结果（不含本地文件写入） |

## 里面有什么

- **总览**：正在做、这周、月轴和热力
- **事项**：列表；点进去改标题、分类、状态
- **步骤**：看板拖拽；总标题 + 可勾选子项（`-` 列表，Tab 缩进）
- **日志 / 备注**：标题、列表、有序列表
- **剪影**：按日备份，最多约 90 天
- 顶栏可导出 / 导入 JSON

时区按 **Asia/Shanghai**。

`src/seed.ts` 与 `data/demo.json` 是虚构演示（收拾阳台、走路、读书等），不是真实生活记录。

## 技术

Vite 8、React 19、TypeScript。样式是普通 CSS。看板拖拽用 `@dnd-kit`。没有后端框架：开发时由 Vite 插件把 JSON 写到 `data/current.json` 和 `data/snaps/`。

## 许可

私人小工具，未单独声明开源协议。
