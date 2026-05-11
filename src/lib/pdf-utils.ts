
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

export const generateHistoryPDF = async (
  receipts: Receipt[], 
  userName: string | null, 
  options: { type: 'summary' | 'detailed' } = { type: 'summary' }
) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  // Helper to draw pie chart
  const drawPieChart = (categoryTotals: Record<string, number>) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    let startAngle = 0;
    const colors = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#64748b', '#ef4444'];
    
    ctx.clearRect(0, 0, 400, 400);
    const entries = Object.entries(categoryTotals);
    
    entries.forEach(([cat, value], i) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(200, 200);
      ctx.arc(200, 200, 180, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      startAngle += sliceAngle;
    });
    
    return canvas.toDataURL('image/png');
  };

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

  const totalsByCategory = receipts.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.totalAmount;
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
    yPos += 8;
  });

  // Category Pie Chart
  const pieChartData = drawPieChart(totalsByCategory);
  if (pieChartData) {
    doc.text('Spending by Category', 140, 50);
    doc.addImage(pieChartData, 'PNG', 135, 55, 60, 60);
    
    // Pie Chart Legend
    let legendY = 120;
    const colors = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#64748b', '#ef4444'];
    Object.keys(totalsByCategory).forEach((cat, i) => {
      doc.setFillColor(colors[i % colors.length]);
      doc.rect(140, legendY - 3, 4, 4, 'F');
      doc.text(cat, 146, legendY);
      legendY += 6;
    });
  }

  yPos = Math.max(yPos + 10, 160);

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
    startY: yPos,
    head: tableHead,
    body: tableData,
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 20 },
    styles: { overflow: 'linebreak', cellWidth: 'auto' },
    columnStyles: options.type === 'detailed' ? {
      4: { cellWidth: 50 } // Items column
    } : undefined
  });

  doc.save(`receipt-history-${dateStr.replace(/\//g, '-')}.pdf`);
};
