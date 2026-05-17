export interface ContributionRow {
  /** 维度值 */
  dimension: string;
  /** 本期分母占比 */
  currentWeight: number;
  /** 基期分母占比 */
  baseWeight: number;
  /** delta 分母占比 */
  deltaWeight: number;
  /** 本期指标值 */
  currentValue: number;
  /** 基期指标值 */
  baseValue: number;
  /** delta 指标值 */
  deltaValue: number;
  /** 组内贡献 */
  withinContribution: number;
  /** 组间贡献 */
  betweenContribution: number;
  /** 交叉贡献 */
  crossContribution: number;
  /** 波动贡献值 */
  totalContribution: number;
  /** 贡献度 (%) */
  contributionRate: number;
}

export interface AnalysisResult {
  rows: ContributionRow[];
  totalCurrentValue: number;
  totalBaseValue: number;
  totalDelta: number;
  sumContribution: number;
  /** 总绝对波动贡献（用于计算贡献度） */
  sumAbsContribution: number;
}

/**
 * 计算波动贡献
 *
 * @param rows - 原始数据行
 * @param dimCols - 维度列名
 * @param timeCol - 时间列名
 * @param baseTimeLabel - 基期标签
 * @param currentTimeLabel - 本期标签
 * @param indicatorCol - 指标列名
 * @param denominatorCol - 分母列名
 */
export function calculateContribution(
  rows: Record<string, string | number>[],
  dimCols: string[],
  timeCol: string,
  baseTimeLabel: string,
  currentTimeLabel: string,
  indicatorCol: string,
  denominatorCol: string,
): AnalysisResult {
  // 1. 分组聚合
  const baseMap = new Map<string, { weight: number; value: number }>();
  const currentMap = new Map<string, { weight: number; value: number }>();
  let totalBaseWeight = 0;
  let totalCurrentWeight = 0;

  for (const row of rows) {
    const timeVal = String(row[timeCol]).trim();
    const isBase = timeVal === baseTimeLabel;
    const isCurrent = timeVal === currentTimeLabel;
    if (!isBase && !isCurrent) continue;

    const dimKey = dimCols.map(c => String(row[c] ?? '')).join('|');
    const weight = Number(row[denominatorCol]) || 0;
    const value = Number(row[indicatorCol]) || 0;

    const map = isBase ? baseMap : currentMap;
    const existing = map.get(dimKey);
    if (existing) {
      existing.weight += weight;
      // 加权平均：按权重合并指标值
      existing.value = (existing.value * (existing.weight - weight) + value * weight) / existing.weight;
    } else {
      map.set(dimKey, { weight, value });
    }

    if (isBase) totalBaseWeight += weight;
    else totalCurrentWeight += weight;
  }

  // 2. 收集所有维度
  const allDims = new Set([...baseMap.keys(), ...currentMap.keys()]);

  // 3. 计算总指标值
  let totalBaseValue = 0;
  let totalCurrentValue = 0;

  for (const dim of allDims) {
    const baseData = baseMap.get(dim) || { weight: 0, value: 0 };
    const currentData = currentMap.get(dim) || { weight: 0, value: 0 };
    totalBaseValue += (baseData.weight / totalBaseWeight) * baseData.value;
    totalCurrentValue += (currentData.weight / totalCurrentWeight) * currentData.value;
  }

  const totalDelta = totalCurrentValue - totalBaseValue;

  // 4. 逐维度计算贡献
  const rows_result: ContributionRow[] = [];
  let sumContribution = 0;
  let sumAbsContribution = 0;

  for (const dim of allDims) {
    const baseData = baseMap.get(dim) || { weight: 0, value: 0 };
    const currentData = currentMap.get(dim) || { weight: 0, value: 0 };

    const baseWeight = totalBaseWeight > 0 ? baseData.weight / totalBaseWeight : 0;
    const currentWeight = totalCurrentWeight > 0 ? currentData.weight / totalCurrentWeight : 0;
    const deltaWeight = currentWeight - baseWeight;
    const baseValue = baseData.value;
    const currentValue = currentData.value;
    const deltaValue = currentValue - baseValue;

    const withinContribution = baseWeight * deltaValue;
    const betweenContribution = deltaWeight * baseValue;
    const crossContribution = deltaWeight * deltaValue;
    const totalContribution = withinContribution + betweenContribution + crossContribution;

    sumContribution += totalContribution;
    sumAbsContribution += Math.abs(totalContribution);

    rows_result.push({
      dimension: dim,
      currentWeight,
      baseWeight,
      deltaWeight,
      currentValue,
      baseValue,
      deltaValue,
      withinContribution,
      betweenContribution,
      crossContribution,
      totalContribution,
      contributionRate: 0, // 先占位，等算完再填
    });
  }

  // 5. 计算贡献度
  for (const row of rows_result) {
    row.contributionRate = sumAbsContribution > 0
      ? (row.totalContribution / sumAbsContribution) * 100
      : 0;
  }

  return {
    rows: rows_result,
    totalCurrentValue,
    totalBaseValue,
    totalDelta,
    sumContribution,
    sumAbsContribution,
  };
}
