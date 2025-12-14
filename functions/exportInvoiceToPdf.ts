import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2'; // autoTable plugin

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { invoiceId } = await req.json();

        // Use service role to fetch invoice to bypass RLS for PDF generation, but user must be auth'd
        const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);

        if (!invoice) {
            return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        
        // Security check: ensure the authenticated user is the owner or an admin
        if (invoice.customer_id !== user.id && user.user_type !== 'admin') {
             return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('VINmint Invoice', 20, 20);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 30);
        doc.text(`Date: ${new Date(invoice.created_date).toLocaleDateString()}`, 20, 38);

        // Billed To
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Billed To:', 140, 30);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.customer_email, 140, 38);

        // Line
        doc.setLineWidth(0.5);
        doc.line(20, 50, 190, 50);

        // Table
        const tableData = [[
            invoice.description,
            `$${invoice.amount_usd.toFixed(2)}`,
            `${invoice.final_amount_vin.toFixed(2)} VIN`
        ]];

        doc.autoTable({
            startY: 60,
            head: [['Description', 'USD Value', 'Amount (VIN)']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [63, 63, 70] },
        });

        // Total
        const finalY = doc.autoTable.previous.finalY;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Paid:', 140, finalY + 15);
        doc.text(`${invoice.final_amount_vin.toFixed(2)} VIN`, 190, finalY + 15, { align: 'right' });

        // Transaction Hash
        if (invoice.transaction_hash) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Blockchain Transaction:', 20, finalY + 30);
            doc.setTextColor(0, 0, 255);
            doc.textWithLink(invoice.transaction_hash, 20, finalY + 37, { url: `https://solscan.io/tx/${invoice.transaction_hash}` });
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`
            }
        });

    } catch (error) {
        console.error('Error exporting invoice to PDF:', error);
        return new Response(JSON.stringify({ error: 'Failed to export PDF', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});