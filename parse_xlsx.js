import xlsx from 'xlsx';

const workbook = xlsx.readFile('precious_spain_pedido.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log(JSON.stringify(data.slice(0, 50), null, 2));
