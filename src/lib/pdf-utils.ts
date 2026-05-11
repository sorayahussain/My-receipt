
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

interface Receipt {
  id: string;
  merchantName: string;
  category: string;
  summary: string;
  date: string;
  totalAmount: number;
  currency: string;
  lineItems?: LineItem[];
}

export const generateHistoryPDF = (
  receipts: Receipt[], 
  userName: string | null, 
  options: { type: 'summary' | 'detailed' } = { type: 'summary' }
) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text('Receipt History Report', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated for: ${userName || 'User'}`, 14, 30);
  
  const rangeStr = receipts.length > 0 
    ? `${receipts[receipts.length - 1].date} to ${receipts[0].date}`
    : 'No data';
    
  doc.text(`Date Range: ${rangeStr}`, 14, 35);
  doc.text(`Report Type: ${options.type === 'detailed' ? 'Detailed' : 'Summary'}`, 14, 40);

  // Stats Summary
  const totalsByCurrency = receipts.reduce((acc, curr) => {
    acc[curr.currency] = (acc[curr.currency] || 0) + curr.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  let yPos = 50;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Summary by Currency', 14, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  Object.entries(totalsByCurrency).forEach(([curr, amount]) => {
    doc.text(`${curr}: ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, yPos);
    yPos += 5;
  });

  // Table Data
  let tableData: any[] = [];
  let tableHead: string[][] = [];

  if (options.type === 'detailed') {
    tableHead = [['Date', 'Merchant', 'Category', 'Amount', 'Items']];
    tableData = receipts.map(r => {
      const itemsList = r.lineItems 
        ? r.lineItems.map(i => `${i.quantity}x ${i.name} (${i.price.toLocaleString()})`).join('\n')
        : 'N/A';
        
      return [
        r.date,
        r.merchantName,
        r.category,
        `${r.currency} ${r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        itemsList
      ];
    });
  } else {
    tableHead = [['Date', 'Merchant', 'Category', 'Amount']];
    tableData = receipts.map(r => [
      r.date,
      r.merchantName,
      r.category,
      `${r.currency} ${r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);
  }

  autoTable(doc, {
    startY: yPos + 10,
    head: tableHead,
    body: tableData,
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 20 },
    styles: { overflow: 'linebreak', cellWidth: 'auto' },
    columnStyles: options.type === 'detailed' ? {
      4: { cellWidth: 60 } // Items column
    } : undefined
  });

  doc.save(`receipt-history-${dateStr.replace(/\//g, '-')}.pdf`);
};
