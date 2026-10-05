import { base44 } from '@/api/base44Client';

export const verifyInviteToken = (payload = {}) => base44.functions.invoke('verifyInviteToken', payload);
export default verifyInviteToken;