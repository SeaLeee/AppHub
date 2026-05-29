# AppHub

一个 Mac 风格的本地应用启动中心:扫描你指定的根目录,把每个含有 `run.bat` / `run.sh` / `run.command` / `run.cmd` 的子目录识别成一个 App,在统一的高颜值界面里启动、监控、查看实时日志,还能配置 cron 定时任务。

## 特性

- 🗂️ **多根目录扫描** — 任意添加目录,自动识别 `run.*` 启动脚本
- 🚀 **一键启动 / 停止** — 双击卡片或点击按钮,实时输出日志
- 🏷️ **分类 / 标签 / 重命名 / 置顶** — 自定义组织你的应用
- 📊 **实时监控** — CPU、内存折线图,基于 `pidusage` 1.5s 采样
- ⏰ **cron 定时任务** — `node-cron` 驱动,标准 cron 表达式
- 🎨 **Mac 原生风格** — `titleBarStyle: hiddenInset` + 毛玻璃 vibrancy + SF 字体

## 技术栈

Electron 31 · React 18 · TypeScript · Vite · TailwindCSS · Zustand · electron-store · node-cron · pidusage

## 开发

```bash
npm install
npm run dev      # 启动开发模式 (Vite + Electron 热更新)
npm run build    # 打包生产版本 (dmg / nsis)
```

## 使用

1. 启动后点击侧边栏的 **"+ 添加目录"**,选择一个包含子项目的根目录。
2. AppHub 会扫描每个直接子目录,只要里面有 `run.bat`/`run.sh`/`run.command`/`run.cmd` 就识别为 App。
3. 点击应用卡片选中,右侧出现详情面板:
   - **日志** 实时彩色输出(stdout / stderr / system)
   - **监控** CPU 与内存折线
   - **设置** 重命名 / 分类 / 标签 / 排序
   - **定时任务** 添加 cron 表达式

## 平台说明

- macOS / Linux 上 `.sh` / `.command` 用 `sh` 执行
- Windows 上 `.bat` / `.cmd` 用 `cmd.exe /c` 执行
- 在 macOS 上识别到的 `.bat` 会尝试用 `sh` 执行并给出告警(推荐同目录提供 `run.sh` 或 `run.command`)

## 目录结构

```
electron/
  main/         主进程: 窗口、IPC、扫描器、进程管理器、调度器
  preload/      预加载脚本: 通过 contextBridge 暴露 window.apphub
  shared/       主进程与渲染进程共享的类型定义
src/
  components/   Sidebar / AppGrid / DetailPanel
  store/        Zustand 状态
  utils/        格式化辅助
```
