import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  X,
  DollarSign
} from "lucide-react";
import { UploadFile } from '@/integrations/Core';
import { bulkUploadVehicles } from '@/functions/bulkUploadVehicles.js';

export default function BulkUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [uploadStep, setUploadStep] = useState('select'); // select, uploading, processing, complete
  const [file, setFile] = useState(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const registrationFeeVIN = 490;
  const dealerDiscount = 0.5;
  const discountedFee = registrationFeeVIN * (1 - dealerDiscount);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          if (text && typeof text === 'string') {
            const lines = text.split(/\r\n|\n/).filter(line => line && line.trim() !== '');
            const count = lines.length > 1 ? lines.length - 1 : 0; // Subtract header
            setVehicleCount(count);
          } else {
            setError('Unable to read CSV file content');
            setFile(null);
            setVehicleCount(0);
          }
        } catch (err) {
          console.error('Error parsing CSV:', err);
          setError('Error parsing CSV file');
          setFile(null);
          setVehicleCount(0);
        }
      };
      reader.onerror = () => {
        setError('Error reading file');
        setFile(null);
        setVehicleCount(0);
      };
      reader.readAsText(selectedFile);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
      setVehicleCount(0);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `vin,make,model,year,color,mileage,owner_wallet
1HGCM82633A123456,Honda,Accord,2023,Black,15000,
2FMDK3GC5DBA12345,Ford,Escape,2022,White,25000,
3GNAXUEF0KL123456,Chevrolet,Equinox,2021,Silver,35000,`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'vehicle_bulk_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploadStep('uploading');
      setUploadProgress(20);

      // Upload file to get URL
      const uploadResult = await UploadFile({ file });
      setUploadProgress(50);

      setUploadStep('processing');
      
      // Process the CSV
      const processResult = await bulkUploadVehicles({ 
        fileUrl: uploadResult.file_url 
      });
      
      setUploadProgress(100);
      setUploadStep('complete');
      setResults(processResult.data.results);
      
      if (onUploadComplete) {
        onUploadComplete(processResult.data.results);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error.response?.data?.error || error.message}`);
      setUploadStep('select');
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setUploadStep('select');
    setFile(null);
    setUploadProgress(0);
    setResults(null);
    setError(null);
    setVehicleCount(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-purple-500/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-6 h-6 text-purple-400" />
            Bulk Upload Vehicle Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {uploadStep === 'select' && (
            <>
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <FileText className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  Upload a CSV file with your vehicle inventory. Required columns: VIN, Make, Model, Year. 
                  Optional: Color, Mileage, Owner_Wallet.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="border-green-500/50 text-green-300 hover:bg-green-500/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-white font-medium">Select CSV File</p>
                  <p className="text-slate-400 text-sm">Upload your vehicle inventory CSV file</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Choose File
                  </label>
                  {file && (
                    <p className="text-green-400 mt-2">✓ {file.name}</p>
                  )}
                </div>
              </div>

              {file && vehicleCount > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4 my-4 border border-purple-500/20">
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-400" />
                        Registration Cost Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                              <span className="text-slate-400">Vehicles Detected:</span>
                              <span className="text-white font-bold">{vehicleCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-slate-400">Standard Fee:</span>
                              <span className="text-white font-mono line-through">{registrationFeeVIN} $VIN</span>
                          </div>
                          <div className="flex justify-between items-center text-green-400">
                              <span>Dealer Discount (50%):</span>
                              <span className="font-mono font-bold">-{registrationFeeVIN * dealerDiscount} $VIN</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-600/50 pt-2 mt-2">
                              <span className="text-slate-400">Discounted Fee per Vehicle:</span>
                              <span className="text-white font-mono font-bold">{discountedFee} $VIN</span>
                          </div>
                          <div className="flex justify-between items-center text-xl border-t-2 border-purple-500/30 pt-2 mt-2">
                              <span className="text-purple-300 font-bold">Total Estimated Cost:</span>
                              <span className="text-purple-300 font-mono font-bold">{(discountedFee * vehicleCount).toLocaleString()} $VIN</span>
                          </div>
                      </div>
                      <Alert className="bg-blue-900/50 border-blue-500/20 mt-4">
                        <AlertDescription className="text-blue-300 text-xs">
                          The total cost will be charged to your dealer wallet. Please ensure you have a sufficient $VIN token balance before proceeding.
                        </AlertDescription>
                      </Alert>
                  </div>
              )}

              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  Upload & Process
                </Button>
              </div>
            </>
          )}

          {(uploadStep === 'uploading' || uploadStep === 'processing') && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-purple-400 mx-auto animate-spin" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {uploadStep === 'uploading' ? 'Uploading File...' : 'Processing Vehicles...'}
                </h3>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-slate-400 mt-2">{uploadProgress}% Complete</p>
              </div>
            </div>
          )}

          {uploadStep === 'complete' && results && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Upload Complete!</h3>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-white">{results.total}</p>
                  <p className="text-slate-400 text-sm">Total Processed</p>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-400">{results.successful?.length || 0}</p>
                  <p className="text-slate-400 text-sm">Successful</p>
                </div>
                <div className="bg-red-500/20 rounded-lg p-4">
                  <p className="text-2xl font-bold text-red-400">{results.failed?.length || 0}</p>
                  <p className="text-slate-400 text-sm">Failed</p>
                </div>
              </div>

              {results.failed?.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <h4 className="font-semibold text-red-400 mb-2">Failed Records:</h4>
                  <div className="space-y-1">
                    {results.failed.map((item, index) => (
                      <div key={index} className="text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
                        <span className="font-mono">{item.vin}</span>: {item.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}