# TXT 小说去广告 Studio · PWA

一个完全在浏览器本地处理 TXT 小说的静态网页工具。小说正文不会上传到 GitHub 或任何服务器。

## 功能

- HTML / `<img ...>` / 图片链接 / 网页链接清理
- 已验证广告字段与 Unicode 乱码污染块识别
- `群 / 群聊 / 裙聊 / 群撩` + 乱码邻域识别
- 发布者/整理者不要求用户填写，扫描时在后台自动识别相关整理、校对、外群、中转群结构
- 广告/乱码复核支持单条“删除 / 保留”
- 广告/乱码复核支持按识别类型“同类全部删除 / 同类全部保留”
- 罗马数字重点复核
- 拼音 + 汉字混写修复，例如 `jin乎 → 近乎`、`靠jin → 靠近`
- 英文、缩写、专名优先保护，例如 `Master`、`boss`、`Girls-side`、`JOJO2`
- 规则页同时展示默认内置规则和个人规则
- 个人规则可点击编辑、修改、删除；内置规则保持只读，可创建个人“保留覆盖”
- 所有个人经验统一存放于根目录 `rules.json`
- 浏览器本地规则副本 + 手动 GitHub 同步
- PWA / Service Worker，首次加载后可离线使用

## 规则目录

默认内置广告经验不再放在仓库根目录，而统一位于：

```text
rules/
└─ builtin/
   ├─ builtin-ad-1.json
   ├─ builtin-ad-2.json
   ├─ builtin-ad-3.json
   ├─ builtin-ad-4.json
   └─ builtin-ad-5.json
```

根目录的 `rules.json` 只保存个人学习结果，包括广告、乱码、拼音修复、英文/名称保留和对内置规则的个人覆盖。

### 优先级

个人“保留覆盖”优先于内置精确删除规则，因此无需直接修改内置文件。这样既能看懂默认规则来源，又不会因误编辑破坏基础规则库。

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

仓库 Settings → Pages → Source 选择 **GitHub Actions**。`.github/workflows/pages.yml` 会自动部署本站。
