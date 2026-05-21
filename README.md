# 跳舞记录 PWA

这是一个基于 Vite + React + Tailwind 的跳舞记录 PWA 第一版。

## 功能

- 舞室下拉选择：欲非 / Simple / Newhope / Trexdance / Gsteps / 学校
- 时长快捷按钮：90 / 120 / 140 min
- 自定义分钟数
- 备注记录
- 今日 / 本周 / 本月 / 记录数统计
- 本月目标进度条
- 最近 35 天热力图
- 近 8 周训练量
- 舞室时长占比
- 本地 localStorage 保存
- CSV 导出
- PWA manifest + service worker + 手机桌面图标

## 本地运行

```bash
npm install
npm run dev
```

运行后打开终端里显示的网址，通常是：

```bash
http://localhost:5173
```

## 打包检查

```bash
npm run build
npm run preview
```

## 部署到 Vercel

1. 把整个文件夹上传到 GitHub。
2. 打开 Vercel，选择 Add New Project。
3. 导入这个 GitHub 仓库。
4. Vercel 会识别 Vite 项目，默认构建命令为 `npm run build`，输出目录为 `dist`。
5. 部署完成后，用 iPhone Safari 打开 Vercel 网址。
6. Safari 分享按钮 → 添加到主屏幕。

## 数据说明

当前版本的数据保存在浏览器 localStorage 中，不是云同步：

- 同一台手机、同一个浏览器/PWA 内可以保留记录；
- 换手机、清除浏览器数据、换浏览器可能导致记录丢失；
- 建议定期点击“导出 CSV”备份。

后续可升级为 Supabase 云数据库，实现手机与电脑同步。
