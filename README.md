# TXT 小说去广告 Studio · PWA

一个完全在浏览器本地处理 TXT 小说的静态网页工具。小说正文不会上传到 GitHub 或任何服务器。

## 功能

- HTML / `<img ...>` / 图片链接 / 网页链接清理
- 已验证广告字段与 Unicode 乱码污染块识别
- `群 / 群聊 / 裙聊 / 群撩` + 乱码邻域识别
- 发布者/整理者不要求用户填写，扫描时在后台自动识别相关整理、校对、外群、中转群结构
- 整本书预扫描：跨章节重复广告、章节边界模板、平台残留、固定反采集注入
- 平台残留识别：`求鲜花 / 求月票 / 求评价票 / 求收藏 / 求打赏 / 求推荐票`
- 章节边界重复广告识别，避免只依赖完整字符串规则
- 反采集注入识别，例如重复括号水印、数字/汉字注入；正常剧情括号表达有额外保护
- 拼音化广告优先识别：`ling meng / 灵 meng / Qun / qun / 数字拼音群号`，支持圈号数字、罗马数字、Unicode 同形字符与标点拆分
- 数字拼音重点关注：`ling / yi / yao / er / liang / san / si / wu / liu / qi / ba / jiu`
- 已确认广告主体族重点关注：`灵梦/凌梦/玲梦/铃梦/陵梦/ling meng`、`月漪/yue yi`、`若水/ruo shui`、`若曦/ruo xi`
- 聊天群剧情负向保护：正常 `【群提示】/聊天群系统/群消息` 不因“群”字本身直接判广告
- 电竞/游戏英文数字上下文保护，降低 `EDG / LPL / SKT / S7 / ADC / BP` 等正常正文误报
- Garble Gate：广告拼音、乱码或高污染行未清干净时，禁止普通拼音自动修复，避免“把广告垃圾修漂亮”
- 广告/乱码复核支持单条“删除 / 保留”
- 广告/乱码复核支持按识别类型“同类全部删除 / 同类全部保留”
- 自动清理、自动拼音修复均可在复核页查看并恢复
- 罗马数字重点复核
- 拼音 + 汉字混写修复，例如 `jin乎 → 近乎`、`靠jin → 靠近`
- 低置信拼音支持自定义替换并学习到个人拼音规则；普通“保留原文”默认只影响当前一次，不自动写入 `pinyinKeep`
- 英文、缩写、专名优先保护，例如 `Master`、`boss`、`Girls-side`、`JOJO2`
- 规则页同时展示默认内置规则和个人规则
- 个人规则可点击编辑、修改、删除、添加；内置规则保持只读，可创建个人“保留覆盖”
- “待同步规则”可单独筛选查看
- 所有个人经验统一存放于根目录 `rules.json`
- 浏览器本地规则副本 + 手动 GitHub 同步
- PWA / Service Worker，首次加载后可离线使用

## 明确不处理的范围

本工具定位为 **TXT 去广告 / 去污染工具**，不做一般性的小说正文“文本修复”。以下内容不作为自动改写目标：

- 普通缺字、漏字恢复
- 语法润色
- 小说正文改写
- 普通错别字纠正

只有与广告、乱码、反采集污染、拼音混写直接相关的字符处理才进入清理流程。

## 规则目录

默认内置广告经验统一位于：

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

个人“保留覆盖”优先于内置精确删除规则，因此无需直接修改内置文件。默认内置规则可在网页规则页查看，个人规则可以编辑和同步。

拼音处理优先级：

```text
来源/结构广告
→ 拼音化广告与拼音群号
→ 乱码/反采集污染
→ Garble Gate
→ 普通拼音修复
```

## 隐私

网页通过浏览器 File API 读取 TXT。扫描、广告识别、乱码评分和拼音模型均在本机执行。

只有点击“保存学习规则到 GitHub”时才调用 GitHub API，上传内容仅为 `rules.json`。小说正文、文件名和清理结果不会进入 GitHub API 请求。

GitHub Token 只写入浏览器 `localStorage`，不写入仓库代码和 `rules.json`。

## GitHub Token

建议创建 Fine-grained Personal Access Token：

- Repository access: 仅选择本仓库
- Repository permissions → Contents: Read and write

网页“设置”中填入仓库、分支和 Token 即可。

如果读取正常但保存返回 HTTP 403，优先检查网页中使用的 Fine-grained Token 是否真正对本仓库授予 `Contents: Read and write`。网页 Token 与 ChatGPT/GitHub App 授权是两套独立权限。

## Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**。`.github/workflows/pages.yml` 会在发布前校验 JavaScript 和 JSON 资源，再自动部署本站。
