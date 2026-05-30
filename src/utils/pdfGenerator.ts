import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Invoice, UserProfile } from '../types';
import { formatCurrency } from './currencyService';

const getBase64ImageFromUrl = (imageUrl: string): Promise<string> => {
    if (imageUrl.startsWith('data:')) {
        return Promise.resolve(imageUrl);
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');
            
            // Maintain absolute transparency
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            // FALLBACK A: Try to load original image directly
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = 'Anonymous';
            fallbackImg.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = fallbackImg.width;
                canvas.height = fallbackImg.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(fallbackImg, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    reject(new Error('Canvas context failed in Fallback A'));
                }
            };
            fallbackImg.onerror = () => {
                // FALLBACK B: Direct fetch binary blob and read as Data URL
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
            fallbackImg.src = imageUrl;
        };
        
        // Primary loader: route through our secure serverless redirect-following proxy
        img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    });
};

export const generateInvoicePDF = async (invoice: Invoice, profile: Partial<UserProfile>, shouldDownload = true) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // ─── Premium High-Contrast Color Palette ───
    const brandSlate = [11, 19, 43] as [number, number, number];    // #0B132B (Deep Midnight Slate)
    const mutedSlate = [100, 116, 139] as [number, number, number];  // #64748B (Cool grey)
    const brandEmerald = [4, 120, 87] as [number, number, number];   // #047857 (Tech Emerald Green)
    const cardBorder = [241, 245, 249] as [number, number, number];  // #F1F5F9 (Soft slate border)
    const cardBg = [248, 250, 252] as [number, number, number];      // #F8FAFC (Card background)

    // ─── Top Border Line Accent ───
    doc.setFillColor(...brandSlate);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // ─── Header Section ───
    
    // Large Bold Title: INVOICE
    doc.setFontSize(34); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text('INVOICE', 20, 28);
    
    // Sub-title under INVOICE: Invoice Number
    doc.setFontSize(9.5); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text(invoice.invoice_number, 20, 35);

    // Divider Line (Clean & Light)
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);

    // ─── Information Section (Clean two-column spaced grid) ───
    
    // SENDER details
    doc.setFontSize(8.5); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('SENDER', 20, 52);
    
    doc.setFontSize(12); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(profile.companyName || 'PragmaOS', 20, 59);
    
    doc.setFontSize(9.5); 
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(profile.fullName || profile.displayName || 'Authorized Contractor', 20, 64);
    doc.text(profile.professionalEmail || profile.personalEmail || '', 20, 68);

    // RECIPIENT details
    doc.setFontSize(8.5); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('RECIPIENT', 20, 80);
    
    doc.setFontSize(12); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(invoice.recipient_name, 20, 87);
    
    doc.setFontSize(9.5); 
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(invoice.type === 'client_bill' ? 'Client Bill' : 'Team Payout', 20, 92);

    // DATES (Right aligned)
    const rightColumnX = pageWidth - 20;

    // Date Issued
    doc.setFontSize(8.5); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('DATE ISSUED', rightColumnX, 52, { align: 'right' });
    
    doc.setFontSize(12); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(format(new Date(invoice.date), 'dd MMM yyyy'), rightColumnX, 59, { align: 'right' });

    // Due Date
    if (invoice.due_date) {
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mutedSlate);
        doc.text('DUE DATE', rightColumnX, 80, { align: 'right' });
        
        doc.setFontSize(12); 
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(244, 63, 94); // #F43F5E (Vercel pink accent)
        doc.text(format(new Date(invoice.due_date), 'dd MMM yyyy'), rightColumnX, 87, { align: 'right' });
    }

    // ─── Table Section (Clean items preview with card-enclosure feel) ───
    const tableData = invoice.items.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price, invoice.currency),
        formatCurrency(item.price * item.quantity, invoice.currency)
    ]);

    autoTable(doc, {
        startY: 104,
        head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL AMOUNT']],
        body: tableData,
        theme: 'plain',
        headStyles: { 
            fillColor: [248, 250, 252], 
            textColor: brandSlate, 
            fontStyle: 'bold', 
            fontSize: 9, 
            cellPadding: { top: 7, bottom: 7, left: 6, right: 6 }
        },
        styles: { 
            fontSize: 10.5, 
            textColor: brandSlate, 
            cellPadding: { top: 8, bottom: 8, left: 6, right: 6 }
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
            // Draw premium dividers between rows
            if (data.row.section === 'body') {
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.4);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // ─── Side-by-Side: Note (Left) and Total Due (Right) to secure 1-Page Layout ───
    const contentY = finalY;
    
    // Right Side: Total Amount Due
    doc.setFontSize(9.5); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('TOTAL AMOUNT DUE', rightColumnX, contentY + 2, { align: 'right' });
    
    doc.setFontSize(30); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandEmerald);
    doc.text(formatCurrency(invoice.total_amount, invoice.currency), rightColumnX, contentY + 14, { align: 'right' });
    
    const blockBottomY = contentY + 18;

    // Left Side: Invoices Note (Enclosed in elegant card)
    if (invoice.note) {
        const noteWidth = 105; // Covers left half of page
        const noteBoxY = contentY - 4;
        
        doc.setFontSize(9.5); 
        const splitNote = doc.splitTextToSize(invoice.note, noteWidth - 12);
        const noteHeight = Math.max(18, (splitNote.length * 5) + 12);
        
        // Draw soft grey card container
        doc.setFillColor(...cardBg);
        doc.setDrawColor(...cardBorder);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, noteBoxY, noteWidth, noteHeight, 3, 3, 'FD');
        
        // Clean Note label
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...brandSlate);
        doc.text('INVOICE NOTE', 26, noteBoxY + 8);
        
        // Note content
        doc.setFontSize(10); 
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...brandSlate);
        doc.text(splitNote, 26, noteBoxY + 15);
        
        finalY = Math.max(blockBottomY, noteBoxY + noteHeight + 10);
    } else {
        finalY = blockBottomY + 10;
    }

    // Divider Line above Signature
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(20, finalY, pageWidth - 20, finalY);

    // ─── Clean Digital Signature Block ───
    if (profile.signatureURL) {
        try {
            const signatureBlockY = finalY + 6;
            
            // Clean title
            doc.setFontSize(9); 
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...mutedSlate);
            doc.text('AUTHORIZED SIGNATURE', 20, signatureBlockY);
            
            // Add transparent signature (scaled perfectly)
            const base64Img = await getBase64ImageFromUrl(profile.signatureURL);
            doc.addImage(base64Img, 'PNG', 20, signatureBlockY + 4, 32, 11);
            
            // Clean baseline
            const lineY = signatureBlockY + 17;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.4);
            doc.line(20, lineY, 65, lineY);
            
            // Signatory name
            doc.setFontSize(9.5); 
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...brandSlate);
            doc.text(profile.fullName || profile.displayName || 'Authorized Signatory', 20, lineY + 5);
            
            // Date below signature name
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...mutedSlate);
            doc.text(`Date: ${format(new Date(invoice.date), 'dd MMM yyyy')}`, 20, lineY + 10);
            
        } catch (err) {
            console.error('Error rendering signature in PDF:', err);
        }
    }

    // ─── Save ───
    if (shouldDownload) {
        doc.save(`Invoice_${invoice.invoice_number}.pdf`);
    }
    return doc;
};
