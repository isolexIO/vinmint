import React from 'react';

export default function WalletOnlyNotice() {
  return (
    <p role="status" className="my-4 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground">
      Your wallet is connected without email or Google sign-in. Public balances and blockchain history are available; private VINmint records and saving registrations still require an account session.
    </p>
  );
}