# 画图提示词与图表类型（Drawing Prompts & Diagram Types）

> 项目：AI Diagram Hub（`ai-draw-nexus`）
> 文档范围：三套系统提示词的内容与约束、它们在生成链路中的位置、渲染层实际支持的图表类型、
> 提示词与渲染能力之间的差距。
> 本文件仅为说明文档，不改动任何代码。

---

## 1. 文档目的

回答两个问题：

1. **AI 画图时收到的是什么样的指令？** —— 三份系统提示词各自约束了什么（语法防错、视觉规范、输出格式）。
2. **到底能画哪些图？** —— 提示词引导产出什么，渲染层实际支持什么，两者差在哪里。

图表类型清单不是凭记忆写的，而是用应用自己的校验器
（`src/lib/validators/index.ts` 的 `validateMermaid`，底层是 mermaid 11.12.2 的 `mermaid.parse()`）
逐个跑过最小样例得到的，见 §6.3。

---

## 2. 提示词在生成链路中的位置

```
用户输入
  ↓
ChatPanel.handleSend()
  ↓
useAIGenerate.generate()
  ├─ 系统提示词：SYSTEM_PROMPTS[engineType]        ← src/lib/promptBuilder.ts
  ├─ 用户提示词：buildInitialPrompt() / buildEditPrompt()
  ├─ 多模态内容：buildMultimodalContent()（文本 + 附件 + 当前画布缩略图）
  ↓
aiService.streamChat() → /api/chat → 模型
  ↓
extractCode() 剥掉 markdown 代码围栏
  ↓
validateContent()  ← src/lib/validators/index.ts
  ├─ Mermaid 失败 → attemptMermaidAutoFix() 最多 3 轮让模型自修
  └─ Excalidraw / Draw.io 失败 → 直接报错
  ↓
写入画布 + 版本快照 + 缩略图
```

### 2.1 三份系统提示词

| 文件 | 引擎 | 核心定位 |
|---|---|---|
| `src/lib/prompts/mermaid.ts` | Mermaid | **语法防错为主**：JSON 引号、连线符号、节点 ID、subgraph 规范 |
| `src/lib/prompts/drawio.ts` | Draw.io | **XML 结构为主**：`mxGraphModel` 骨架、标签闭合、id 规则、连线避障 |
| `src/lib/prompts/excalidraw.ts` | Excalidraw | **JSON 元素为主**：数组格式、元素必需字段、箭头 id 绑定 |

三者结尾都有一句「图表文本语言：中文」，即**无论界面语言是什么，生成的图内文字都是中文**
（见 §8 改进项 ①）。

### 2.2 两个用户提示词模板

`src/lib/promptBuilder.ts`：

- `buildInitialPrompt(userInput, useTwoPhase, phase?, elementsOutput?)` —— 首次生成。
  `useTwoPhase` 目前恒为 `false`（`useAIGenerate.ts` 中硬编码），所以实际只走单阶段分支，
  两阶段（先元素后连线）的代码路径保留但未启用。
- `buildEditPrompt(currentCode, userInput)` —— 增量修改，**会把当前画布源码原文带进提示词**，
  模型据此改写而不是重画。

### 2.3 校验与自动修复

`src/lib/validators/index.ts`：

| 引擎 | 校验方式 | 失败后的处理 |
|---|---|---|
| Mermaid | 动态 `import('mermaid')` → `mermaid.parse(code)` | `attemptMermaidAutoFix()`：把错误信息回灌给模型，最多重试 3 次（`MAX_MERMAID_FIX_ATTEMPTS`），每次重新校验 |
| Excalidraw | `JSON.parse` + 逐元素检查 `type` 存在、`x`/`y` 是数字 | 无自动修复，直接报错 |
| Draw.io | `DOMParser` 解析 → 必须有 `mxGraphModel` → 必须有 `root` → 至少一个 `mxCell` | 无自动修复，直接报错 |

> 校验是**同步拦截**而非渲染兜底：Excalidraw / Draw.io 的内容一旦校验不过就不会进画布，
> 用户会看到错误提示而不是一个坏图。

---

## 3. Mermaid 提示词要点

文件：`src/lib/prompts/mermaid.ts`

### 3.1 语法约束（防错关键）

| 约束 | 内容 | 踩坑后果 |
|---|---|---|
| JSON 双引号 | `%%{init: ...}%%` 块里键名和字符串值必须用 `"`，禁止 `'` | 整段渲染失败 |
| 连线符号一致 | 普通 `-->`、加粗 `==>`、虚线 `-.->`；禁止 `-- 文字 ==>` 这类混用 | 解析报错 |
| 节点 ID | 只能英文和数字（如 `Node1`、`process_A`），不能含空格或特殊字符 | 解析报错 |
| 特殊字符转义 | 节点文本含 `? ( ) [ ] /` 等时必须用双引号包裹，如 `Query{"Is it valid?"}` | 解析报错 |
| subgraph | `subgraph ID ["标题"]` … `end`，且 `end` 必须独占一行 | 解析报错 |
| 保留字 | 不要用 `end` / `graph` / `flowchart` 当节点 ID | 解析报错 |

### 3.2 视觉规范

- **形状**：普通处理用圆角矩形 `id["Text"]`，起止用体育场形 `id(["Start"])`，
  判断用菱形 `id{"Condition"}`，存储用圆柱 `id[("Database")]`，模块用双边矩形 `id[["Module"]]`。
- **连线语义**：默认 `-->`；核心/成功路径 `==>`；异常/回退 `-.->`；`~~~` 表示不可见连接。
- **配色**：内置 4 个 `classDef`（`main` 蓝 / `decision` 橙 / `term` 绿 / `storage` 紫），莫兰迪低饱和度。
- **曲线**：`flowchart.curve = "basis"`。
- **布局提醒**：用 LR 或 TB 减少交叉；相关步骤包进 `subgraph`；整体输出中文。

### 3.3 样式模板

提示词给出一段 `%%{init: ...}%%` 模板（`theme: base` + 主题变量 + `flowchart` 配置）。

实际渲染时，`MermaidRenderer.injectConfig()` 会**解析并合并**这段配置：

- 保留模型给的 `themeVariables`（用户自选配色不被覆盖）
- 强制注入 `layout`（dagre / elk / tidy-tree）
- 若首行是 `graph` / `flowchart`，把方向替换为工具栏选定的 `TB` / `BT` / `LR` / `RL`

也就是说**工具栏上的布局引擎与方向对所有 flowchart 类图都生效**，模型无法覆盖。

---

## 4. Draw.io 提示词要点

文件：`src/lib/prompts/drawio.ts`

### 4.1 XML 结构

```
<mxGraphModel dx="..." dy="..." grid="1" ...>
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <!-- 可见元素从 id="2" 开始 -->
  </root>
</mxGraphModel>
```

### 4.2 硬约束

| 约束 | 内容 |
|---|---|
| 标签闭合 | 无子元素的标签必须自闭合 `/>`；有子元素的必须成对闭合 |
| 属性引号 | 所有属性值用双引号包裹 |
| id 唯一 | 所有元素 id 全局唯一，从 `2` 开始递增 |
| 节点 | `vertex="1" parent="1"`，几何放在 `<mxGeometry ... as="geometry" />` |
| 连线 | `edge="1"`，必须带 `source` / `target` 指向有效节点 id |
| 输出 | 仅输出合法 mxGraph XML，禁止 markdown 代码块、说明文字、注释 |

### 4.3 视觉与防重叠

- 形状按语义选：矩形=过程/实体，圆角矩形=状态/模块，椭圆=起止，菱形=决策
- 边框：实线为常态，虚线表示可选/临时，粗边框强调重点
- 尺寸分大/中/小三档，同层一致；矩形宽高比约 2:1
- 相邻元素间距约为元素高度的 50%–100%，层级间距大于同层间距
- **防重叠**：任意两元素不得坐标重叠；连线用 `orthogonalEdgeStyle`，并设置 `exitX/exitY`、
  `entryX/entryY` 控制出入口；必须交叉时用 `jumpStyle`

---

## 5. Excalidraw 提示词要点

文件：`src/lib/prompts/excalidraw.ts`

### 5.1 JSON 格式

- 输出必须是 **JSON 数组**：`[{...}, {...}]`（不是 `{type, elements}` 对象）
- 字符串一律双引号，键名加引号，数组末尾无逗号，布尔小写，数字不加引号
- 每个元素必须带 `type` 与数值型 `x` / `y`（与 `validateExcalidraw()` 的校验规则一致）

### 5.2 元素类型（提示词只要求这几种）

| 类型 | 用途 |
|---|---|
| `rectangle` | 矩形（流程步骤、实体、状态） |
| `ellipse` | 椭圆（开始/结束、属性、初始/终止） |
| `diamond` | 菱形（判断、关系） |
| `text` | 独立文本 |
| `arrow` | 箭头，靠 `start: {id}` / `end: {id}` 绑定到已有元素 |

箭头之外的 `line` / `freedraw` / `image` / `frame` **编辑器本身支持**（用的是官方
`@excalidraw/excalidraw`），但提示词没让模型用（见 §8 改进项 ④）。

### 5.3 视觉与防重叠

- 填充 `fillStyle: "solid"`，轻量感可用 `hachure`
- 描边 `strokeStyle: "solid"`，虚线表示可选/临时
- `roughness` 默认 0（朴素专业），手绘风格设 1–2
- `fontFamily` 默认 6（标准），手写风格用 5
- 元素不得重叠；箭头必须通过 `start`/`end` 的 id 绑定，被引用的元素必须有唯一 id

---

## 6. 图表类型支持矩阵

### 6.1 总览

| 引擎 | 渲染层实际支持 | 提示词引导产出 | 差距 |
|---|---|---|---|
| **Mermaid** | 26 种图表类型（§6.3） | 主要教流程图 | 大：甘特/思维导图/时序图等靠模型自身知识，语法细节易错 |
| **Excalidraw** | 官方元素全集（rectangle / ellipse / diamond / arrow / line / text / image / freedraw / frame） | rectangle / ellipse / diamond / text / arrow 五种 | 中：手绘元素（线、自由绘制、图片）用不上 |
| **Draw.io** | 完整 draw.io 图形库（UML、网络拓扑、ER、流程等全部内置图形） | 四类：流程类 / 层级类 / 关系类 / 分析类 | 小：提示词四类已覆盖常见诉求 |

### 6.2 三套提示词共同覆盖的「图表类型规范」

`drawio.ts` 与 `excalidraw.ts` 里的这四节内容一字不差（各约 20 行）：

| 分类 | 具体图种 |
|---|---|
| 流程类 | 流程图、状态图、泳道图 |
| 层级类 | 组织架构图 / 树形图、思维导图 |
| 关系类 | 类图、ER 图、网络图 |
| 分析类 | SWOT（2×2 矩阵）、鱼骨图 |

Mermaid 提示词没有这一节（见 §8 改进项 ②）。

### 6.3 Mermaid 实际支持的类型（已逐一验证）

用应用自己的 `validateMermaid()` 跑最小样例，mermaid 11.12.2 的结果：

| 类型关键字 | 校验 | 类型关键字 | 校验 |
|---|---|---|---|
| `flowchart` / `graph` | OK | `C4Context` | OK |
| `sequenceDiagram` | OK | `C4Container` | OK |
| `classDiagram` | OK | `C4Deployment` | OK |
| `stateDiagram-v2` | OK | `C4Dynamic` | OK |
| `erDiagram` | OK | `block-beta` | OK |
| `journey` | OK | `architecture-beta` | OK |
| `gantt` | OK | `packet-beta` | OK |
| `pie` | OK | `kanban` | OK |
| `gitGraph` | OK | `radar-beta` | OK |
| `mindmap` | OK | `treemap-beta` | OK |
| `timeline` | OK | `sankey-beta` | OK |
| `quadrantChart` | OK（见下方注意） | `xychart-beta` | OK |
| `requirementDiagram` | OK（见下方注意） | | |

**两个需要额外语法条件的类型**（提示词没写，模型容易踩）：

- `quadrantChart`：`x-axis` / `y-axis` 的轴标签、以及 `quadrant-N` 的象限文字，**含中文时必须加双引号**
  （`quadrant-1 "一"`）。不加引号会报 `Lexical error`；标题 `title` 不受此限制。
- `requirementDiagram`：`text:` 的取值不能是保留词（写 `Requirement` 会与语法关键字冲突而报
  `Parse error`），写成 `Some requirement` 之类即可；`risk` / `verifymethod` 可省略。

### 6.4 Mermaid 渲染器的其他能力

| 能力 | 取值 | 位置 |
|---|---|---|
| 布局引擎 | dagre（默认）/ elk（层次化）/ tidy-tree（思维导图） | 工具栏下拉 |
| 方向 | TB / BT / LR / RL | 工具栏下拉，仅作用于 flowchart / graph |
| 主题 | Notion / Minimal / Hand Drawn / Material / Playful Doodle | 工具栏下拉，定义在 `src/lib/mermaidThemes.ts` |

---

## 7. 导入与粘贴的引擎分流

### 7.1 文件扩展名映射

定义在 `src/lib/fileUtils.ts` 的 `EXT_ENGINE_MAP`：

| 扩展名 | 引擎 |
|---|---|
| `.mmd` / `.mermaid` / `.txt` | Mermaid |
| `.excalidraw` / `.json` | Excalidraw |
| `.drawio` / `.xml` | Draw.io |

导入对话框（`src/features/project/ImportDialog.tsx`）按扩展名定引擎，一个文件建一个项目，
项目名取文件名（去扩展名）。内容同样要过 `validateContent()`。

### 7.2 粘贴源码的识别

`looksLikeDiagramSource(text)`（`src/lib/fileUtils.ts`）的判定顺序：

1. 含 `<mxGraphModel` 或 `<mxfile` → Draw.io
2. 首行匹配 Mermaid 图表关键字（`graph` / `flowchart` / `sequenceDiagram` / `classDiagram` /
   `stateDiagram` / `erDiagram` / `journey` / `gantt` / `pie` / `gitGraph` / `mindmap` /
   `timeline` / `quadrantChart` / `requirementDiagram` / `C4*` / `block-beta` /
   `architecture-beta` / `packet-beta` / `kanban` / `radar` / `treemap` / `sankey-beta` /
   `xychart-beta`）→ Mermaid
3. 能解析成 JSON 且含 `elements` 数组（或本身就是元素数组）→ Excalidraw
4. 都不匹配 → 当作普通消息文本处理

命中时 `usePasteSource` 会拦下默认行为，弹出「导入为新项目」提示条（`PasteSourceBanner`），
而不是把源码当消息发给模型。

---

## 8. 已知的能力脱节与改进项

调研中发现的四个问题，均**不影响功能正确性**，但会让模型做出次优选择：

### ① 输出语言硬编码为中文

三份提示词结尾都写着「图表文本语言：中文」。用户在英文界面下生成的图，节点文字仍是中文，
与界面语言割裂。

*改进方向*：改成占位符，由 `promptBuilder.ts` 按当前 i18n 语言注入。

### ② Mermaid 提示词没有列举支持的图表类型

提示词详细教了流程图，但没告诉模型「甘特图、思维导图、时序图、架构图这些也支持」。
模型只能靠自身知识，于是：类型选错、语法细节出错（尤其 `gantt` 的 `dateFormat`、
`mindmap` 的缩进层级、`quadrantChart` 的中文引号规则）。

*改进方向*：在提示词里补一节「可选图表类型」，并对流程图以外的类型给最小可用骨架。

### ③ Excalidraw 与 Draw.io 的类型规范完全重复

两处「流程类 / 层级类 / 关系类 / 分析类」四节一字不差，改动时容易漏改一处。

*改进方向*：抽到 `src/lib/prompts/shared.ts`，两边各留差异部分。

### ④ Excalidraw 可用元素比渲染层窄

编辑器支持 `line` / `freedraw` / `image` / `frame`，提示词只让模型用五种元素，
手绘风格的图因此受限。

*改进方向*：在提示词里补上这几种元素的最小 JSON 片段。

---

## 9. 待确认配图清单

以下配图**尚未绘制**，等确认要哪些之后再补进本文档。

| 编号 | 图意 | 建议形式 | 落位 |
|---|---|---|---|
| 图 1 | 生成主链路：输入 → 提示词拼装 → 模型 → 校验 →（失败）自动修复 → 渲染 → 落库 | Mermaid 流程图 | §2 |
| 图 2 | Mermaid 校验失败的三轮修复循环 | Mermaid 流程图 | §2.3 |
| 图 3 | 三引擎能力对照：渲染层支持 vs 提示词引导 | 表格（当前 §6.1 已用表格，可选图示化） | §6.1 |
| 图 4 | 导入与粘贴的分流决策（扩展名 / 粘贴内容 → 引擎 → 校验 → 建项目） | Mermaid 流程图 | §7 |
| 图 5 | 能力脱节四点的现状与改进方向 | 可选（纯文字表格可能更清楚） | §8 |

> 说明：本项目用 Mermaid 自身渲染图表，因此上面的配图若用 Mermaid 代码块，
> 需要确认放在哪个页面查看（文档本身不被 Mermaid 渲染）。

---

## 10. 相关文档

| 文档 | 与本文的关系 |
|---|---|
| [01-system-architecture.md](./01-system-architecture.md) | 生成链路的整体位置、鉴权与请求模式 |
| [02-technical-architecture.md](./02-technical-architecture.md) | 提示词模块、校验器、SSE 解析的技术细节 |
| [03-deployment-architecture.md](./03-deployment-architecture.md) | 上游模型服务的配置方式 |
| [04-application-architecture.md](./04-application-architecture.md) | 编辑器与引擎抽象、聊天持久化语义 |
