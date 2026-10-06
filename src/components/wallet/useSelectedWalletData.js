import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Vehicle } from '@/entities/Vehicle';
import { ServiceRecord } from '@/entities/ServiceRecord';
import { getWalletBalance } from '@/functions/getWalletBalance';
import { getSolanaTransactions } from '@/functions/getSolanaTransactions';

export default function useSelectedWalletData(address, hasAccount) {
  const queryClient = useQueryClient();
  const balances = useQuery({
    queryKey: ['wallet-assets', address, 'balances'], enabled: Boolean(address),
    queryFn: async () => {
      const { data } = await getWalletBalance({ walletAddress: address });
      if (!data?.success) throw new Error(data?.error || 'Could not load wallet balances.');
      return { sol: data.solBalance || 0, vin: data.vinTokenBalance || 0 };
    }, staleTime: 30000, retry: false,
  });
  const transactions = useQuery({
    queryKey: ['wallet-assets', address, 'transactions'], enabled: Boolean(address),
    queryFn: async () => {
      const { data } = await getSolanaTransactions({ walletAddress: address, limit: 10 });
      if (!data?.success) throw new Error(data?.error || 'Could not load wallet history.');
      return (data.transactions || []).map(tx => ({
        id: tx.signature, transaction_hash: tx.signature,
        sender_wallet: tx.balanceChange < 0 ? address : 'Multiple',
        receiver_wallet: tx.balanceChange >= 0 ? address : 'Multiple', token_type: 'SOL',
        amount: Math.abs(tx.balanceChange), balanceChange: tx.balanceChange,
        status: tx.status, created_date: new Date(tx.blockTime * 1000).toISOString(), isOnChain: true,
      })).filter(tx => tx.amount > 0);
    }, staleTime: 30000, retry: false,
  });
  const vehicles = useQuery({
    queryKey: ['wallet-assets', address, 'vehicles', hasAccount], enabled: Boolean(address && hasAccount),
    queryFn: () => Vehicle.filter({ owner_wallet: address }), retry: false,
  });
  const services = useQuery({
    queryKey: ['wallet-assets', address, 'services', hasAccount], enabled: Boolean(address && hasAccount),
    queryFn: () => ServiceRecord.filter({ nft_recipient: address }), retry: false,
  });
  return {
    balances: balances.data || { sol: 0, vin: 0 }, transactions: transactions.data || [],
    vinNfts: hasAccount ? vehicles.data || [] : [], serviceNfts: hasAccount ? services.data || [] : [],
    isBalanceLoading: balances.isFetching, isTransactionsLoading: transactions.isFetching,
    isNftsLoading: hasAccount && (vehicles.isFetching || services.isFetching),
    hasErrors: [balances, transactions, vehicles, services].some(query => query.isError),
    refreshTransactions: () => transactions.refetch(),
    refreshWalletData: () => queryClient.invalidateQueries({ queryKey: ['wallet-assets'] }),
  };
}