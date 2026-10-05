import { base44 } from '@/api/base44Client';

export const exportInvoiceToPdf = (payload = {}) => base44.functions.invoke('exportInvoiceToPdf', payload);
export default exportInvoiceToPdf;