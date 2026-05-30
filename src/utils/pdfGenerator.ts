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
            
            // Clean transparent background (no white background block)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            // FALLBACK A: Try to load original image directly (CORS might pass if direct headers exist)
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
        
        // Primary loader: route through our secure serverless proxy
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

    // ─── Header: Title & Vector Currency Logo ───
    doc.setFontSize(34); // Increased size
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text('INVOICE', 20, 28);
    
    // Sub-title under INVOICE: Invoice Number
    doc.setFontSize(9.5); // Increased size
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text(invoice.invoice_number, 20, 35); // Removed charSpace to prevent alignment issues

    // Decorative top right accent (Currency Badge Logo)
    const badgeX = pageWidth - 29;
    const badgeY = 17;
    doc.setFillColor(241, 245, 249);
    doc.circle(badgeX + 4.5, badgeY + 4.5, 4.5, 'F');
    
    const symbol = getCurrencySymbol(invoice.currency);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(symbol, badgeX + 4.5, badgeY + 7.8, { align: 'center' });

    // Divider Line (Clean & Light)
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);

    // ─── Information Section (Clean two-column spaced grid) ───
    
    // SENDER details
    doc.setFontSize(8.5); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('SENDER', 20, 52);
    
    doc.setFontSize(12); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(profile.companyName || 'PragmaOS', 20, 59);
    
    doc.setFontSize(9.5); // Increased
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(profile.fullName || profile.displayName || 'Authorized Contractor', 20, 64);
    doc.text(profile.professionalEmail || profile.personalEmail || '', 20, 68);

    // RECIPIENT details
    doc.setFontSize(8.5); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('RECIPIENT', 20, 80);
    
    doc.setFontSize(12); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(invoice.recipient_name, 20, 87);
    
    doc.setFontSize(9.5); // Increased
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedSlate);
    doc.text(invoice.type === 'client_bill' ? 'Client Bill' : 'Team Payout', 20, 92);

    // DATES (Right aligned - NO charSpace to prevent jsPDF alignment bugs)
    const rightColumnX = pageWidth - 20;

    // Date Issued
    doc.setFontSize(8.5); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('DATE ISSUED', rightColumnX, 52, { align: 'right' });
    
    doc.setFontSize(12); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandSlate);
    doc.text(format(new Date(invoice.date), 'dd MMM yyyy'), rightColumnX, 59, { align: 'right' });

    // Due Date
    if (invoice.due_date) {
        doc.setFontSize(8.5); // Increased
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mutedSlate);
        doc.text('DUE DATE', rightColumnX, 80, { align: 'right' });
        
        doc.setFontSize(12); // Increased
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
            fontSize: 9, // Increased
            cellPadding: { top: 7, bottom: 7, left: 6, right: 6 }
        },
        styles: { 
            fontSize: 10.5, // Increased
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

    // Check height to prevent page break overflow
    if (finalY > doc.internal.pageSize.height - 75) {
        doc.addPage();
        finalY = 25;
    }

    // ─── Invoice Note Card (Clean Slate styling, removed AI mentions) ───
    if (invoice.note) {
        const noteWidth = pageWidth - 40;
        const noteBoxY = finalY;
        
        // Calculate note text height to size the card dynamically
        doc.setFontSize(9.5); // Increased
        const splitNote = doc.splitTextToSize(invoice.note, noteWidth - 12);
        const noteHeight = (splitNote.length * 5) + 16;
        
        // Draw soft grey card container
        doc.setFillColor(...cardBg);
        doc.setDrawColor(...cardBorder);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, noteBoxY, noteWidth, noteHeight, 4, 4, 'FD');
        
        // Note label in Clean Slate font (removed AI wording)
        doc.setFontSize(8.5); // Increased
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...brandSlate);
        doc.text('INVOICE NOTE', 26, noteBoxY + 8);
        
        // Note content inside card
        doc.setFontSize(10); // Increased
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...brandSlate);
        doc.text(splitNote, 26, noteBoxY + 15);
        
        finalY = finalY + noteHeight + 10;
    }

    // Check again before bottom blocks
    if (finalY > doc.internal.pageSize.height - 50) {
        doc.addPage();
        finalY = 25;
    }

    // ─── Massive Total Amount Due Section (NO charSpace for right alignment) ───
    const totalY = finalY + 5;
    doc.setFontSize(9.5); // Increased
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedSlate);
    doc.text('TOTAL AMOUNT DUE', rightColumnX, totalY, { align: 'right' });
    
    doc.setFontSize(30); // Increased massive premium typography
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brandEmerald);
    doc.text(formatCurrency(invoice.total_amount, invoice.currency), rightColumnX, totalY + 12, { align: 'right' });

    // Divider Line above Signature
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.5);
    doc.line(20, totalY + 18, pageWidth - 20, totalY + 18);

    // ─── Clean Digital Signature Block ───
    if (profile.signatureURL) {
        try {
            const signatureBlockY = totalY + 24;
            
            if (signatureBlockY > doc.internal.pageSize.height - 40) {
                doc.addPage();
                finalY = 25;
            }
            
            // Clean title (no charSpace to prevent overlapping / alignment bugs)
            doc.setFontSize(9); // Increased
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...mutedSlate);
            doc.text('AUTHORIZED SIGNATURE', 20, signatureBlockY);
            
            // Add transparent signature (scaled perfectly)
            const base64Img = await getBase64ImageFromUrl(profile.signatureURL);
            doc.addImage(base64Img, 'PNG', 20, signatureBlockY + 4, 32, 11);
            
            // Clean baseline
            const lineY = signatureBlockY + 18;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.4);
            doc.line(20, lineY, 65, lineY);
            
            // Signatory name
            doc.setFontSize(9.5); // Increased
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...brandSlate);
            doc.text(profile.fullName || profile.displayName || 'Authorized Signatory', 20, lineY + 5);
            
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
