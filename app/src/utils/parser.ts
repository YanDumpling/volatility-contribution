import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParseResult {
  columns: string[];
  rows: Record<string, string | number>[];
  rowCount: number;
}

/**
 * 解析上传的文件（CSV / Excel）
 */
export function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSV(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  }

  return Promise.reject(new Error(`不支持的文件格式: .${ext}`));
}

function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const columns = results.meta.fields || [];
        const rows = results.data as Record<string, string | number>[];
        resolve({ columns, rows, rowCount: rows.length });
      },
      error(err) {
        reject(err);
      },
    });
  });
}

function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });
        const columns = json.length > 0 ? Object.keys(json[0]) : [];
        resolve({ columns, rows: json, rowCount: json.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}
