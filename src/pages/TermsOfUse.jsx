import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, ArrowLeft } from 'lucide-react';

export default function TermsOfUse() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: 'By accessing or using the VINmint platform ("VINmint", "we", "us", or "our"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, you may not access or use our services. VINmint is operated by Isolex Corporation.'
    },
    {
      title: '2. Description of Service',
      body: 'VINmint is a decentralized application built on the Solana blockchain that transforms Vehicle Identification Numbers (VINs) into .VINmint Web3 domains and verifiable service record NFTs. Our services include VIN registration, domain minting, service record certification, and a token-based rewards system using $VIN tokens.'
    },
    {
      title: '3. Blockchain Transactions',
      body: 'VINmint facilitates transactions on the Solana blockchain. All blockchain transactions are irreversible. You acknowledge that once a transaction is submitted to the blockchain, it cannot be reversed, refunded, or modified. You are solely responsible for verifying all transaction details before confirmation.'
    },
    {
      title: '4. Wallet and Account Security',
      body: 'Upon registration, VINmint generates a non-custodial Solana wallet for your account. You are responsible for maintaining the confidentiality of your wallet credentials and private key. You agree to notify us immediately of any unauthorized use of your account or any security breach. VINmint is not liable for any losses resulting from compromised wallet credentials.'
    },
    {
      title: '5. Token Purchases',
      body: 'Users may purchase $VIN tokens by sending SOL to the VINmint vault at the admin-configured exchange rate. Token purchases are processed automatically after on-chain verification of the SOL transfer. The exchange rate is set at the discretion of VINmint administrators and may change without notice. All token purchases are final and irreversible.'
    },
    {
      title: '6. VIN Registration and NFTs',
      body: 'When you register a VIN, VINmint mints a .VINmint domain NFT to your wallet. You affirm that the VIN and vehicle information you provide is accurate and that you have the legal right to register the vehicle. VINmint reserves the right to reject or revoke registrations that contain false, misleading, or fraudulent information.'
    },
    {
      title: '7. Service Records',
      body: 'Certified shops may issue service record NFTs for vehicles. VINmint does not guarantee the accuracy of service records and relies on the certified shop for truthful reporting. Shops are responsible for the authenticity of the service information they submit.'
    },
    {
      title: '8. Prohibited Conduct',
      body: 'You agree not to: (a) use VINmint for any unlawful purpose; (b) submit false or fraudulent vehicle information; (c) attempt to register vehicles you do not own or have authority to represent; (d) manipulate the rewards system; (e) interfere with the proper functioning of the platform; or (f) reverse engineer or exploit the platform\'s code.'
    },
    {
      title: '9. Fees',
      body: 'VINmint charges fees for certain services including VIN registration and service NFT minting. Fees are paid in $VIN tokens and are non-refundable once the associated blockchain transaction is confirmed. Network transaction fees (Solana gas) are separate and borne by the user or vault as applicable.'
    },
    {
      title: '10. Disclaimers',
      body: 'VINmint is provided "as is" and "as available" without warranties of any kind. We do not guarantee uninterrupted or error-free service. Blockchain networks may experience congestion, outages, or other issues beyond our control. You use VINmint at your own risk.'
    },
    {
      title: '11. Limitation of Liability',
      body: 'To the maximum extent permitted by law, VINmint and Isolex Corporation shall not be liable for any indirect, incidental, special, or consequential damages, including loss of tokens, vehicles, data, or profits, arising from your use of or inability to use the platform.'
    },
    {
      title: '12. Modifications to Terms',
      body: 'We may update these Terms at any time. Continued use of VINmint after changes are posted constitutes acceptance of the revised Terms. We will make reasonable efforts to notify users of material changes.'
    },
    {
      title: '13. Governing Law',
      body: 'These Terms are governed by the laws of the United States. Any disputes arising from these Terms or your use of VINmint shall be resolved in the appropriate courts.'
    },
    {
      title: '14. Contact',
      body: 'For questions about these Terms, contact VINmint support through the platform or via the contact information provided in your account.'
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
            <Shield className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Terms of Use</h1>
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
            <Link to={createPageUrl("PrivacyPolicy")} className="text-purple-400 hover:text-purple-300 text-sm">
              View our Privacy Policy →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}