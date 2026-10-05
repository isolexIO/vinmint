import { base44 } from '@/api/base44Client';

export const adminCreateUser = (payload = {}) => base44.functions.invoke('adminCreateUser', payload);
export default adminCreateUser;