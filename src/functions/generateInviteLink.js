import { base44 } from '@/api/base44Client';

export const generateInviteLink = (payload = {}) => base44.functions.invoke('generateInviteLink', payload);
export default generateInviteLink;