import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Invoice, UserProfile } from '../types';
import { formatCurrency, getCurrencySymbol } from './currencyService';

const getBase64ImageFromUrl = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');
            
            // Maintain absolute transparency (no white background block)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            fetch(imageUrl)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(reject);
        };
        img.src = imageUrl;
    });
};

export const generateInvoicePDF = async (invoice: Invoice, profile: Partial<UserProfile>, shouldDownload = true) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // ─── Premium SaaS Color Palette ───
    const brandIndigo = [79, 70, 229] as [number, number, number]; // #4F46E5 (Deep Slate Accent)
    const brandSlate = [15, 23, 42] as [number, number, number];    // #0F172A (Body dark Slate)
    const mutedSlate = [100, 116, 139] as [number, number, number];  // #64748B (Muted text Slate)
    const brandEmerald = [16, 185, 129] as [number, number, number]; // #10B981 (Tech Green)

    // Top thin elegant colored decorative line
    doc.setFillColor(...brandIndigo);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // ─── Header: Title & Vector Currency Logo ───
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text('INVOICE', 20, 28);
    
    // Draw Currency Logo Badge right next to the title!
    const titleWidth = doc.getTextWidth('INVOICE');
    const badgeX = 20 + titleWidth + 5;
    const badgeY = 19;
    
    // Solid circular currency logo background
    doc.setFillColor(...brandIndigo);
    doc.circle(badgeX + 4.5, badgeY + 4.5, 4.5, 'F');
    
    // White currency symbol centered inside
    const currencyLogo = getCurrencySymbol(invoice.currency);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(currencyLogo, badgeX + 4.5, badgeY + 7.8, { align: 'center' });

    // ─── Right Aligned: Company/Sender Info ───
    const companyX = pageWidth - 20;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandIndigo);
    doc.text(profile.companyName || 'PragmaOS', companyX, 28, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(profile.fullName || profile.displayName || 'Authorized Contractor', companyX, 34, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(profile.professionalEmail || profile.personalEmail || '', companyX, 39, { align: 'right' });

    // Sleek divider line
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.5);
    doc.line(20, 47, pageWidth - 20, 47);

    // ─── Details Block: Left (Invoice details) vs Right (Recipient details) ───
    
    // Left: Metadata
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('INVOICE DETAILS', 20, 56);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text('Invoice Number:', 20, 63);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(invoice.invoice_number, 50, 63);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text('Date Issued:', 20, 69);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(format(new Date(invoice.date), 'dd MMM yyyy'), 50, 69);

    if (invoice.due_date) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...brandSlate);
        doc.text('Due Date:', 20, 75);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedSlate);
        doc.text(format(new Date(invoice.due_date), 'dd MMM yyyy'), 50, 75);
    }

    // Right: Client / Member Details inside a premium, subtle card
    const isClientBill = invoice.type === 'client_bill';
    const cardWidth = 75;
    const cardHeight = 28;
    const cardX = companyX - cardWidth;
    const cardY = 50;

    // Subtle container background with light border
    doc.setFillColor(250, 251, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandIndigo);
    doc.text(isClientBill ? 'BILL TO' : 'PAYOUT TO', cardX + 6, cardY + 7);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    const splitRecipient = doc.splitTextToSize(invoice.recipient_name, cardWidth - 12);
    doc.text(splitRecipient, cardX + 6, cardY + 15);

    // ─── Items Table ───
    const tableData = invoice.items.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price, invoice.currency),
        formatCurrency(item.price * item.quantity, invoice.currency)
    ]);

    autoTable(doc, {
        startY: 88,
        head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL AMOUNT']],
        body: tableData,
        theme: 'plain',
        headStyles: { 
            fillColor: [248, 250, 252], 
            textColor: brandIndigo, 
            fontStyle: 'bold', 
            fontSize: 8.5,
            cellPadding: { top: 7, bottom: 7, left: 6, right: 6 }
        },
        styles: { 
            fontSize: 9.5, 
            textColor: brandSlate, 
            cellPadding: { top: 7, bottom: 7, left: 6, right: 6 }
        },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: [253, 254, 255]
        },
        margin: { left: 20, right: 20 },
        willDrawCell: function (data) {
            // Draw premium thin dividers between rows
            if (data.row.section === 'body') {
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.4);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // Ensure we do not overflow the page for bottom blocks
    if (finalY > doc.internal.pageSize.height - 75) {
        doc.addPage();
        finalY = 25;
    }

    // ─── Summary / Total Section (Aligned Right) ───
    const totalBoxWidth = 75;
    const totalBoxHeight = 16;
    const totalBoxX = companyX - totalBoxWidth;
    
    // Filled total amount box
    doc.setFillColor(240, 253, 250); // emerald-50
    doc.roundedRect(totalBoxX, finalY, totalBoxWidth, totalBoxHeight, 3, 3, 'F');
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandEmerald);
    doc.text('TOTAL AMOUNT DUE', totalBoxX + 6, finalY + 10);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandEmerald);
    doc.text(formatCurrency(invoice.total_amount, invoice.currency), companyX - 6, finalY + 10.5, { align: 'right' });

    // ─── Note (Aligned Left) ───
    if (invoice.note) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...brandIndigo);
        doc.text('INVOICE NOTE', 20, finalY + 4);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedSlate);
        const splitNote = doc.splitTextToSize(invoice.note, pageWidth - totalBoxWidth - 30);
        doc.text(splitNote, 20, finalY + 10);
        
        finalY = Math.max(finalY + totalBoxHeight + 10, finalY + (splitNote.length * 5) + 12);
    } else {
        finalY = finalY + totalBoxHeight + 12;
    }

    // ─── Clean Signature Section (No backgrounds, with clean line & date below) ───
    if (profile.signatureURL) {
        try {
            if (finalY > doc.internal.pageSize.height - 55) {
                doc.addPage();
                finalY = 25;
            }
            
            const signatureY = finalY + 5;
            
            // Clean transparent signature image insertion
            const base64Img = await getBase64ImageFromUrl(profile.signatureURL);
            doc.addImage(base64Img, 'PNG', 20, signatureY, 40, 12);
            
            // Signature line
            const lineY = signatureY + 15;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.5);
            doc.line(20, lineY, 70, lineY);
            
            // Label
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...brandSlate);
            doc.text(profile.fullName || profile.displayName || 'Authorized Signatory', 20, lineY + 5);
            
            // Date below signature
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...mutedSlate);
            doc.text(`Date Signed: ${format(new Date(invoice.date), 'dd MMM yyyy')}`, 20, lineY + 9);
            
        } catch (err) {
            console.error('Error rendering signature:', err);
        }
    }

    // ─── Footer ───
    const footerY = doc.internal.pageSize.height - 15;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text('THANK YOU FOR YOUR BUSINESS', pageWidth / 2, footerY + 2, { 
        align: 'center',
        charSpace: 2
    });

    // ─── Save / Output ───
    if (shouldDownload) {
        doc.save(`Invoice_${invoice.invoice_number}.pdf`);
    }
    return doc;
};
