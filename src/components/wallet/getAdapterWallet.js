export default function getAdapterWallet(wallets, type) {
  if (type === 'mwa') {
    return wallets.find(({ adapter }) => /mobile wallet adapter|solana mobile/i.test(adapter.name))?.adapter;
  }
  if (type === 'jupiter') {
    return wallets.find(({ adapter }) => /jupiter/i.test(adapter.name) && !/mobile/i.test(adapter.name))?.adapter;
  }
  return null;
}