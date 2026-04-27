/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingBottom: 20, borderBottom: '2 solid #f97316' },
  brand: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  brandAccent: { color: '#f97316' },
  invoiceTitle: { fontSize: 28, fontWeight: 'bold', color: '#64748b', textAlign: 'right' },
  invoiceNumber: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  block: { width: '45%' },
  label: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 'bold' },
  value: { fontSize: 11, color: '#0f172a', marginBottom: 2 },
  table: { marginTop: 10, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 8, borderBottom: '1 solid #cbd5e1' },
  tableRow: { flexDirection: 'row', padding: 8, borderBottom: '1 solid #e2e8f0' },
  th: { fontSize: 9, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  td: { fontSize: 10, color: '#1e293b' },
  desc: { width: '45%' },
  qty: { width: '15%', textAlign: 'right' },
  price: { width: '20%', textAlign: 'right' },
  total: { width: '20%', textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: '40%', marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, marginTop: 4, borderTop: '2 solid #f97316', backgroundColor: '#fff7ed' },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  grandTotalValue: { fontSize: 14, fontWeight: 'bold', color: '#f97316' },
  notes: { marginTop: 30, padding: 12, backgroundColor: '#f8fafc', borderRadius: 4, fontSize: 9, color: '#475569' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  statusBadge: { padding: 4, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
});

const InvoiceDocument = ({ invoice, lineItems, supplier, contractor }: any) => {
  const fmt = (n: number) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>

        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>AggLink<Text style={styles.brandAccent}>.</Text></Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>Aggregate Logistics Platform</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={[styles.invoiceNumber, { marginTop: 8, fontWeight: 'bold', color: invoice.status === 'paid' ? '#10b981' : invoice.status === 'overdue' ? '#ef4444' : '#3b82f6' }]}>{invoice.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.block}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.value}>{supplier?.company_name}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{contractor?.company_name}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.block}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{fmtDate(invoice.issued_date) || '-'}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Due</Text>
            <Text style={styles.value}>{fmtDate(invoice.due_date) || '-'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.desc]}>Description</Text>
            <Text style={[styles.th, styles.qty]}>Quantity</Text>
            <Text style={[styles.th, styles.price]}>Unit Price</Text>
            <Text style={[styles.th, styles.total]}>Total</Text>
          </View>
          {lineItems.map((item: any, idx: number) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, styles.desc]}>{item.description}</Text>
              <Text style={[styles.td, styles.qty]}>{Number(item.quantity).toLocaleString()} {item.unit || 'ton'}</Text>
              <Text style={[styles.td, styles.price]}>{fmt(item.unit_price)}</Text>
              <Text style={[styles.td, styles.total]}>{fmt(item.line_total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ fontSize: 10, color: '#475569' }}>Subtotal</Text>
            <Text style={{ fontSize: 10, color: '#1e293b' }}>{fmt(invoice.subtotal)}</Text>
          </View>
          {invoice.tax_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ fontSize: 10, color: '#475569' }}>Tax</Text>
              <Text style={{ fontSize: 10, color: '#1e293b' }}>{fmt(invoice.tax_amount)}</Text>
            </View>
          )}
          {invoice.amount_paid > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ fontSize: 10, color: '#10b981' }}>Paid</Text>
              <Text style={{ fontSize: 10, color: '#10b981' }}>-{fmt(invoice.amount_paid)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>{invoice.amount_paid >= invoice.total_amount ? 'Total Paid' : 'Amount Due'}</Text>
            <Text style={styles.grandTotalValue}>{fmt(invoice.total_amount - invoice.amount_paid)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>Generated by AggLink  -  agglink.vercel.app</Text>
      </Page>
    </Document>
  );
};

export default function InvoicePDFButton({ invoice, lineItems, supplier, contractor, label = 'Download PDF' }: any) {
  return (
    <PDFDownloadLink
      document={<InvoiceDocument invoice={invoice} lineItems={lineItems} supplier={supplier} contractor={contractor} />}
      fileName={`${invoice.invoice_number}.pdf`}
      className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all"
    >
      {({ loading }) => (
        <>
          <i className="fa-solid fa-file-pdf"></i>
          <span>{loading ? 'Generating...' : label}</span>
        </>
      )}
    </PDFDownloadLink>
  );
}
