import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, MapPin } from "lucide-react";
import { geocodeAddress } from "@/functions/geocodeAddress";

export default function AddressInput({ 
  label = "Address", 
  value, 
  onChange, 
  placeholder = "Enter your address", 
  required = false,
  className = "",
  disabled = false 
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // null, 'valid', 'invalid'
  const [verificationMessage, setVerificationMessage] = useState('');
  const [coordinates, setCoordinates] = useState(null);

  const verifyAddress = async (address) => {
    if (!address || address.length < 10) {
      setVerificationStatus(null);
      setVerificationMessage('');
      setCoordinates(null);
      return;
    }

    setIsVerifying(true);
    try {
      const response = await geocodeAddress({ address });
      
      if (response.data.success && response.data.latitude && response.data.longitude) {
        setVerificationStatus('valid');
        setVerificationMessage(`✓ Address verified (${response.data.latitude.toFixed(4)}, ${response.data.longitude.toFixed(4)})`);
        setCoordinates({ lat: response.data.latitude, lng: response.data.longitude });
      } else {
        setVerificationStatus('invalid');
        setVerificationMessage('⚠️ Address could not be verified. Please check spelling and format.');
        setCoordinates(null);
      }
    } catch (error) {
      setVerificationStatus('invalid');
      setVerificationMessage('❌ Error verifying address. Please try again.');
      setCoordinates(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Debounced verification - wait for user to stop typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value && value.length >= 10) {
        verifyAddress(value);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const getStatusColor = () => {
    if (verificationStatus === 'valid') return 'border-green-500/50 focus:border-green-400';
    if (verificationStatus === 'invalid') return 'border-red-500/50 focus:border-red-400';
    return 'border-purple-500/30 focus:border-purple-300';
  };

  const getStatusIcon = () => {
    if (isVerifying) return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
    if (verificationStatus === 'valid') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (verificationStatus === 'invalid') return <XCircle className="w-4 h-4 text-red-400" />;
    return <MapPin className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className={className}>
      <Label className="text-purple-300 font-medium text-base">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      
      <div className="relative mt-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Reset verification when user starts typing
            if (verificationStatus && e.target.value !== value) {
              setVerificationStatus(null);
              setVerificationMessage('');
            }
          }}
          placeholder={placeholder}
          className={`bg-slate-700/60 text-white placeholder-slate-400 pr-10 ${getStatusColor()}`}
          required={required}
          disabled={disabled}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {getStatusIcon()}
        </div>
      </div>

      {verificationMessage && (
        <div className="mt-2">
          <p className={`text-xs ${
            verificationStatus === 'valid' ? 'text-green-400' : 
            verificationStatus === 'invalid' ? 'text-red-400' : 
            'text-slate-400'
          }`}>
            {verificationMessage}
          </p>
        </div>
      )}

      {verificationStatus === 'invalid' && (
        <Alert className="mt-2 bg-amber-500/10 border-amber-500/20">
          <AlertDescription className="text-amber-200 text-sm">
            <strong>Tips for a valid address:</strong>
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Include street number and name</li>
              <li>Add city and state/province</li>
              <li>Include postal/ZIP code</li>
              <li>Example: "123 Main St, Anytown, CA 12345"</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}