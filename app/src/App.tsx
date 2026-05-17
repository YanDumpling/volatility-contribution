import { useState, useMemo } from 'react';
import { parseFile, type ParseResult } from './utils/parser';
import { calculateContribution, type ContributionRow, type AnalysisResult } from './utils/contribution';

type Step = 'upload' | 'config' | 'result';

function App() {
  const [step, setStep] = useState<Step>('upload');
  const [fileData, setFileData] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [dimCols, setDimCols] = useState<string[]>([]);
  const [timeCol, setTimeCol] = useState('');
  const [baseLabel, setBaseLabel] = useState('');
  const [currentLabel, setCurrentLabel] = useState('');
  const [indicatorCol, setIndicatorCol] = useState('');
  const [denominatorCol, setDenominatorCol] = useState('');

  const [result, setResult] = useState<AnalysisResult | null>(null);

  const timeValues = useMemo(() => {
    if (!fileData || !timeCol) return [];
    const vals = new Set<string>();
    for (const row of fileData.rows) {
      vals.add(String(row[timeCol]).trim());
    }
    return [...vals];
  }, [fileData, timeCol]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await parseFile(file);
      setFileData(data);
      setStep('config');
      setDimCols([]);
      setTimeCol('');
      setIndicatorCol('');
      setDenominatorCol('');
      setBaseLabel('');
      setCurrentLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
    }
    setLoading(false);
  }

  function runAnalysis() {
    if (!fileData || !timeCol || !indicatorCol || !denominatorCol) return;
    if (!baseLabel || !currentLabel) return;
    setError('');
    try {
      const r = calculateContribution(
        fileData.rows, dimCols, timeCol, baseLabel, currentLabel, indicatorCol, denominatorCol,
      );
      setResult(r);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算失败');
    }
  }

  function reset() {
    setStep('upload');
    setFileData(null);
    setResult(null);
    setError('');
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>波动贡献分析</h1>
        <p className="subtitle">Structural Decomposition Analysis</p>
        {step !== 'upload' && <button className="btn-link" onClick={reset}>← 重新上传</button>}
      </header>

      {error && <div className="error-msg">{error}</div>}

      {step === 'upload' && (
        <div className="upload-area">
          <label className="upload-zone">
            <p className="upload-icon">📂</p>
            <p className="upload-main">点击选择文件，或拖拽到此处</p>
            <p className="upload-hint">支持 CSV、Excel (.xlsx / .xls)</p>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="upload-input" />
          </label>
          {loading && <p className="loading-msg">解析中...</p>}
        </div>
      )}

      {step === 'config' && fileData && (
        <div className="config-area">
          <div className="data-preview">
            <h3>📋 数据预览</h3>
            <p className="preview-info">{fileData.rowCount} 行 × {fileData.columns.length} 列（仅展示前 5 行）</p>
            <div className="table-scroll">
              <table className="preview-table">
                <thead>
                  <tr>{fileData.columns.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {fileData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>{fileData.columns.map(c => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="config-panel">
            <h3>⚙️ 分析配置</h3>

            <div className="config-field">
              <label>分析维度（可多选）</label>
              <div className="checkbox-group">
                {fileData.columns.map(c => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" checked={dimCols.includes(c)}
                      onChange={e => e.target.checked ? setDimCols([...dimCols, c]) : setDimCols(dimCols.filter(d => d !== c))} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="config-field">
              <label>时间字段</label>
              <select value={timeCol} onChange={e => setTimeCol(e.target.value)}>
                <option value="">-- 请选择 --</option>
                {fileData.columns.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {timeValues.length > 0 && (
              <div className="config-row">
                <div className="config-field">
                  <label>基期标签</label>
                  <select value={baseLabel} onChange={e => setBaseLabel(e.target.value)}>
                    <option value="">-- 请选择 --</option>
                    {timeValues.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="config-field">
                  <label>本期标签</label>
                  <select value={currentLabel} onChange={e => setCurrentLabel(e.target.value)}>
                    <option value="">-- 请选择 --</option>
                    {timeValues.filter(v => v !== baseLabel).map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="config-field">
              <label>指标字段</label>
              <select value={indicatorCol} onChange={e => setIndicatorCol(e.target.value)}>
                <option value="">-- 请选择 --</option>
                {fileData.columns.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="config-field">
              <label>分母字段</label>
              <select value={denominatorCol} onChange={e => setDenominatorCol(e.target.value)}>
                <option value="">-- 请选择 --</option>
                {fileData.columns.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <button className="btn-primary" onClick={runAnalysis}
              disabled={!timeCol || !indicatorCol || !denominatorCol || !baseLabel || !currentLabel}>
              开始分析
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="result-area">
          <h3>📊 分析结果</h3>
          <div className="table-scroll">
            <table className="result-table">
              <thead>
                <tr>
                  <th>维度</th>
                  <th>本期分母占比</th>
                  <th>基期分母占比</th>
                  <th>Δ分母占比</th>
                  <th>本期指标值</th>
                  <th>基期指标值</th>
                  <th>Δ指标值</th>
                  <th>组内贡献</th>
                  <th>组间贡献</th>
                  <th>交叉贡献</th>
                  <th>波动贡献</th>
                  <th>贡献度</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="dim-cell">{row.dimension}</td>
                    <td>{row.currentWeight.toFixed(4)}</td>
                    <td>{row.baseWeight.toFixed(4)}</td>
                    <td className={row.deltaWeight >= 0 ? 'positive' : 'negative'}>{row.deltaWeight.toFixed(4)}</td>
                    <td>{row.currentValue.toFixed(4)}</td>
                    <td>{row.baseValue.toFixed(4)}</td>
                    <td className={row.deltaValue >= 0 ? 'positive' : 'negative'}>{row.deltaValue.toFixed(4)}</td>
                    <td>{row.withinContribution.toFixed(4)}</td>
                    <td>{row.betweenContribution.toFixed(4)}</td>
                    <td>{row.crossContribution.toFixed(4)}</td>
                    <td className={row.totalContribution >= 0 ? 'positive' : 'negative'}>{row.totalContribution.toFixed(4)}</td>
                    <td>{row.contributionRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><SummaryRow result={result} /></tfoot>
            </table>
          </div>
          <div className="verify-section">
            <p>总指标变动 = 本期总指标 − 基期总指标 = {result.totalCurrentValue.toFixed(4)} − {result.totalBaseValue.toFixed(4)} = <strong>{result.totalDelta.toFixed(4)}</strong></p>
            <p>Σ 波动贡献 = <strong>{result.sumContribution.toFixed(4)}</strong>
              {Math.abs(result.totalDelta - result.sumContribution) < 0.001
                ? <span className="verify-pass"> ✓ 验证通过</span>
                : <span className="verify-fail"> ✗ 验证不通过</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ result }: { result: AnalysisResult }) {
  const rows = result.rows;
  const sum = (fn: (r: ContributionRow) => number) => rows.reduce((a, r) => a + fn(r), 0);
  return (
    <tr className="summary-row">
      <td><strong>合计</strong></td>
      <td>{sum(r => r.currentWeight).toFixed(4)}</td>
      <td>{sum(r => r.baseWeight).toFixed(4)}</td>
      <td>{sum(r => r.deltaWeight).toFixed(4)}</td>
      <td>—</td><td>—</td><td>—</td>
      <td>{sum(r => r.withinContribution).toFixed(4)}</td>
      <td>{sum(r => r.betweenContribution).toFixed(4)}</td>
      <td>{sum(r => r.crossContribution).toFixed(4)}</td>
      <td>{sum(r => r.totalContribution).toFixed(4)}</td>
      <td>—</td>
    </tr>
  );
}

export default App;
