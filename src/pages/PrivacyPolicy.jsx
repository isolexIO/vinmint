import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Lock, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Information We Collect',
      body: 'When you create a VINmint account, we collect your email address, full name, user type (vehicle owner, dealer, or shop owner), and profile details. We also generate and store a non-custodial Solana wallet address and encrypted secret key associated with your account. For dealers and shops, we collect business name, license number, address, and contact information.'
    },
    {
      title: '2. Blockchain Data',
      body: 'VINmint operates on the Solana blockchain. Transaction data, including wallet addresses, token transfers, NFT mints, and service records, is recorded on the public Solana blockchain and is visible to anyone. This data is immutable and cannot be deleted. We do not control blockchain data once it has been recorded.'
    },
    {
      title: '3. How We Use Your Information',
      body: 'We use your information to: (a) create and manage your account; (b) generate and associate your Solana wallet; (c) process VIN registrations and service record NFTs; (d) facilitate token purchases and transfers; (e) send notifications about your account activity; (f) verify business credentials for dealers and shops; and (g) improve our services.'
    },
    {
      title: '4. Wallet Credentials',
      body: 'Your Solana wallet secret key is stored in encrypted form and is accessible only to you through your authenticated session. We use this key to sign blockchain transactions on your behalf when you initiate actions such as token transfers or VIN registrations. We never share your secret key with third parties.'
    },
    {
      title: '5. Data Sharing',
      body: 'We do not sell your personal information. We may share data with: (a) the Solana blockchain network as part of normal transaction processing; (b) service providers that help us operate the platform (e.g., hosting, analytics); and (c) legal authorities when required by law. Public blockchain data is inherently visible to all network participants.'
    },
    {
      title: '6. Cookies and Tracking',
      body: 'VINmint uses essential cookies and local storage to maintain your authentication session and remember your preferences. We use analytics to understand how the platform is used and to improve our services. No personally identifying tracking is shared with advertising networks.'
    },
    {
      title: '7. Data Retention',
      body: 'We retain your account information for as long as your account is active. You may request account deletion at any time, which will remove your personal data from our database. However, blockchain data associated with your wallet address (transactions, NFTs, token balances) cannot be deleted as it is permanently recorded on the Solana blockchain.'
    },
    {
      title: '8. Data Security',
      body: 'We implement industry-standard security measures including encrypted storage of wallet credentials, secure authentication, and access controls. However, no system is completely secure. You are responsible for safeguarding your account credentials and wallet private key.'
    },
    {
      title: '9. Your Rights',
      body: 'You have the right to: (a) access the personal data we hold about you; (b) request correction of inaccurate data; (c) request deletion of your account and associated data (subject to blockchain immutability); and (d) opt out of certain communications. To exercise these rights, contact us through the platform.'
    },
    {
      title: '10. Children\'s Privacy',
      body: 'VINmint is not intended for individuals under 18 years of age. We do not knowingly collect information from minors. If you believe a minor has provided us with personal data, please contact us so we can remove it.'
    },
    {
      title: '11. Third-Party Links',
      body: 'VINmint may link to third-party services such as Solscan for transaction verification. We are not responsible for the privacy practices of these external services. We encourage you to review their privacy policies.'
    },
    {
      title: '12. Changes to This Policy',
      body: 'We may update this Privacy Policy from time to time. We will notify users of material changes through the platform. Continued use of VINmint after changes are posted constitutes acceptance of the updated policy.'
    },
    {
      title: '13. Contact',
      body: 'For privacy-related questions or requests, contact VINmint support through the platform or via the contact information provided in your account.'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link to={createPageUrl("Home")} className="inline-flex items-center gap-2 text-purple-300 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-slate-800/50 border border-purple-500/20 backdrop-blur-xl rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-slate-400 text-sm mb-8">Last updated: October 2026</p>

          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-purple-200 mb-2">{section.title}</h2>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{section.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-700/50 text-center">
            <Link to={createPageUrl("TermsOfUse")} className="text-purple-400 hover:text-purple-300 text-sm">
              View our Terms of Use →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}