import React from 'react';
import { Smartphone, Orbit, ArrowRight, Loader2 } from 'lucide-react';

const options = [
  { type: 'mwa', label: 'Mobile Wallet Adapter', detail: 'Connect an installed wallet in a supported Android browser', Icon: Smartphone },
  { type: 'jupiter', label: 'Jupiter', detail: 'Connect the Jupiter Wallet browser extension', Icon: Orbit },
];

export default function AdapterWalletOptions({ onConnect, isConnecting }) {
  return (
    <>
      {options.map(({ type, label, detail, Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onConnect(type)}
          disabled={isConnecting}
          className="w-full p-4 rounded-xl bg-card/50 border border-primary/20 hover:border-primary/50 flex items-center gap-4 disabled:opacity-50"
        >
          <Icon className="w-8 h-8 shrink-0 text-primary" />
          <div className="text-left flex-1">
            <p className="text-card-foreground font-semibold">{label}</p>
            <p className="text-muted-foreground text-xs">{detail}</p>
          </div>
          {isConnecting ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ArrowRight className="w-5 h-5 text-muted-foreground" />}
        </button>
      ))}
    </>
  );
}