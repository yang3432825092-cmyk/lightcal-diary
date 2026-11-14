# 轻卡日记 · PWA 部署速查

一个纯静态的减脂记录应用，可装到 iPhone 主屏幕全屏运行，首次联网加载后支持离线使用。
无后端、无账号、无网络请求，数据只写入浏览器 localStorage。

## 文件清单

```
index.html            应用本体（界面 / 样式 / 脚本 / 内置食物库全部内联）
manifest.webmanifest  应用名、图标、standalone 全屏模式、主题色
sw.js                 Service Worker，离线缓存与版本管理
icons/
  icon-192.png        清单图标 192
  icon-512.png        清单图标 512
  maskable-512.png    安卓自适应图标（maskable）
  apple-touch-icon.png  iOS 主屏幕图标 180
INSTALL-GUIDE.docx    面向非技术用户的分步图文说明
README.md             本文件
```

`index.html` 必须在最外层，与 `manifest.webmanifest`、`sw.js`、`icons/` 同级。

## 本地预览

```bash
cd lightcal-diary-pwa
python -m http.server 8765
```

浏览器打开 `http://127.0.0.1:8765/`。localhost 属安全上下文，Service Worker 可正常注册，能在电脑上验证离线。
这个地址只用于电脑预览，iPhone 无法用它安装；要让手机装到桌面，必须是 HTTPS。

## 部署到 HTTPS

任选一种静态托管，把上面的文件整体上传，保持目录结构不变。

| 方案 | 做法 | 备注 |
| --- | --- | --- |
| GitHub Pages | 建仓库 → 上传文件 → Settings › Pages › 分支 main / 根目录 | 地址形如 `https://<用户名>.github.io/<仓库名>/` |
| Vercel | 新建项目，直接拖入文件夹 | 自动给 https 域名 |
| Netlify | Drag and drop 部署 | 同上 |
| 已有服务器 / 对象存储 | 上传到任意子目录，开启 https | 需正确响应 `application/manifest+json` |

工程内所有相对路径都写成 `./`（`start_url`、`scope`、`id`、缓存列表均用 `new URL(p, self.location)` 解析），
因此部署在域名根路径或任意子路径（如 `/apps/lightcal/`）都能正常工作，不需要改配置。

压缩包里的 `INSTALL-GUIDE.docx` 有 GitHub Pages 的逐步操作，可直接转给使用者。

## iPhone 安装

1. 用 **Safari** 打开部署好的 https 网址，等页面标题变成「轻卡日记」。
2. 点底部**分享**按钮 → **添加到主屏幕** → 右上角**添加**。
3. 从桌面图标进入，应是全屏、无地址栏的独立窗口。
4. 首次务必联网完整加载一次，Service Worker 才会写入缓存；之后飞行模式也能记录。

注意：必须用 Safari。Chrome、微信内置浏览器、Safari 阅读模式都不提供「添加到主屏幕」的完整能力。
通过局域网 `http://192.168.x.x:8765` 打开时，iOS 只把它当普通网页收藏，图标是截图，也不会离线。

## 更新已发布的版本

改了内容或换了图标：

1. 覆盖上传同名文件到托管平台。
2. 打开 `sw.js`，把 `const VERSION = 'v1.1.0';` 改成新值（如 `v1.1.1`）。缓存按版本号分桶，不改则手机继续用旧缓存。
3. 手机 Safari 打开网址刷新一次触发更新；桌面图标仍是旧版就先彻底关闭再从图标打开，必要时删除图标重新添加。

删除桌面图标会连同 localStorage 一起清空，重装前先在应用内「我的 › 数据备份」导出 JSON。

## 数据

- localStorage 键名：`lean.diary.db.v2`
- 结构：`{ profile, weights, diary, favorites, links }`
- 应用内「我的」提供 JSON 备份导出 / 导入，以及 CSV 导出。
- 清除网站数据或删除桌面图标会立即丢失记录，且不可恢复。

## 兼容性

需要支持 Service Worker 与 Web App Manifest 的浏览器：iOS / iPadOS Safari 16 及以上效果最佳，
Android Chrome、桌面 Chrome / Edge / Safari 也可正常使用（桌面端显示为居中窄栏布局）。