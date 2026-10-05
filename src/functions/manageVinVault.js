import { base44 } from '@/api/base44Client';

export const manageVinVault = (payload = {}) => base44.functions.invoke('manageVinVault', payload);
export default manageVinVault;