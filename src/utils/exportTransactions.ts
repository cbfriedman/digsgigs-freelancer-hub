import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  digger_payout: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  gigs: {
    title: string;
  };
  profiles: {
    full_name: string | null;
  };
}

export const exportToCSV = (
  transactions: Transaction[],
  userType: 'digger' | 'consumer',
  filename: string = 'transactions'
) => {
  // Define headers based on user type
  const headers = userType === 'digger'
    ? ['Date', 'Gig Title', 'Client', 'Total Amount', 'Commission', 'Your Payout', 'Status']
    : ['Date', 'Gig Title', 'Total Amount', 'Status'];

  // Convert transactions to CSV rows
  const rows = transactions.map(tx => {
    const date = format(new Date(tx.completed_at || tx.created_at), 'MMM dd, yyyy');
    const gigTitle = tx.gigs.title;
    const clientName = tx.profiles?.full_name || 'Anonymous';
    const totalAmount = `$${tx.total_amount.toFixed(2)}`;
    const commission = `$${tx.commission_amount.toFixed(2)}`;
    const payout = `$${tx.digger_payout.toFixed(2)}`;
    const status = tx.status;

    if (userType === 'digger') {
      return [date, gigTitle, clientName, totalAmount, commission, payout, status];
    } else {
      return [date, gigTitle, totalAmount, status];
    }
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (
  transactions: Transaction[],
  userType: 'digger' | 'consumer',
  stats?: {
    totalEarnings: number;
    totalCommission: number;
    transactionCount: number;
  },
  filename: string = 'transactions'
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text('Transaction History', 14, 20);
  
  // Add date range
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy')}`, 14, 28);
  
  let yPosition = 35;

  // Add stats for diggers
  if (userType === 'digger' && stats) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', 14, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Total Earnings: $${stats.totalEarnings.toFixed(2)}`, 14, yPosition);
    yPosition += 5;
    doc.text(`Commission Paid: $${stats.totalCommission.toFixed(2)}`, 14, yPosition);
    yPosition += 5;
    doc.text(`Total Transactions: ${stats.transactionCount}`, 14, yPosition);
    yPosition += 10;
  }

  // Prepare table data
  const headers = userType === 'digger'
    ? ['Date', 'Gig Title', 'Total', 'Commission', 'Payout', 'Status']
    : ['Date', 'Gig Title', 'Total Amount', 'Status'];

  const rows = transactions.map(tx => {
    const date = format(new Date(tx.completed_at || tx.created_at), 'MM/dd/yy');
    const gigTitle = tx.gigs.title.length > 30 
      ? tx.gigs.title.substring(0, 30) + '...' 
      : tx.gigs.title;
    const totalAmount = `$${tx.total_amount.toFixed(2)}`;
    const commission = `$${tx.commission_amount.toFixed(2)}`;
    const payout = `$${tx.digger_payout.toFixed(2)}`;
    const status = tx.status;

    if (userType === 'digger') {
      return [date, gigTitle, totalAmount, commission, payout, status];
    } else {
      return [date, gigTitle, totalAmount, status];
    }
  });

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // primary color
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 50
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    margin: { top: yPosition, left: 14, right: 14 },
    styles: {
      cellPadding: 3,
      overflow: 'linebreak'
    },
    columnStyles: userType === 'digger' 
      ? {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 22, halign: 'center' }
        }
      : {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 25, halign: 'center' }
        }
  });

  // Add footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
