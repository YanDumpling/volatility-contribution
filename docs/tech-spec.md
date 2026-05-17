# 技术规格 — 波动贡献分析工具

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | React 18 + TypeScript 5.6 |
| 构建 | Vite 5 |
| 表格解析 | SheetJS (xlsx) + PapaParse |
| 样式 | CSS 内联 / CSS Modules |
| 部署 | 纯静态网站 |

## 架构

```
App.tsx （状态管理：Step 流转）
├── Step 1: FileUploader （文件上传 + 预览）
├── Step 2: ConfigPanel （选择维度/时间/指标/分母）
└── Step 3: ResultTable （结果表 + 汇总行）
```

## 数据流

```
上传文件 → parseFile() → { columns, rows }
  → 用户选择字段
  → calculateContribution(rows, dimCols, timeCol, baseLabel, currentLabel, indicatorCol, denominatorCol)
  → { rows: ContributionRow[], totals }
  → ResultTable 展示
```

## 核心算法

### 组内贡献
`within_i = w_i0 × (x_i1 − x_i0)`

### 组间贡献
`between_i = (w_i1 − w_i0) × x_i0`

### 交叉贡献
`cross_i = (w_i1 − w_i0) × (x_i1 − x_i0)`

### 波动贡献
`total_i = within_i + between_i + cross_i`

### 贡献度
`rate_i = total_i / Σ|total| × 100%`
