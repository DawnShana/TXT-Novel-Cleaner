# TXT 小说去广告 Studio · PWA

一个完全在浏览器本地处理 TXT 小说的静态网页工具。小说正文不会上传到 GitHub 或任何服务器。

## 功能

- HTML / `<img ...>` / 图片链接 / 网页链接清理
- 已验证广告字段与 Unicode 乱码污染块识别
- `群 / 群聊 / 裙 / 群撩` + 乱码邻域识别
- 罗马数字重点复核
- 拼音 + 汉字混写修复，例如 `jin乎 → 近乎`、`靠jin → 靠近`
- 英文、缩写、专名优先保护，例如 `Master`、`boss`、`Girls-side`、`JOJO2`
- 所有个人经验统一存放于根目录 `rules.json`
- 浏览器本地规则副本 + 手动 GitHub 同步
- PWA / Service Worker，首次加载后可离线使用

## 隐私

网页通过浏览器 File API 读取 TXT。扫描、广告识别、乱码评分和拼音模型均在本机执行。

只有点击“保存学习规则到 GitHub”时才调用 GitHub API，上传内容仅为 `rules.json`。小说正文、文件名和清理结果不会进入 GitHub API 请求。

GitHub Token 只写入浏览器 `localStorage`，不写入仓库代码和 `rules.json`。

## GitHub Token

建议创建 Fine-grained Personal Access Token：

- Repository access: 仅选择本仓库
- Repository permissions → Contents: Read and write

网页“设置”中填入仓库、分支和 Token 即可。

## Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**。随后 `.github/workflows/pages.yml` 会自动部署本站。
