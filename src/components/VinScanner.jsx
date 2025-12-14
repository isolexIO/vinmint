import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, ScanLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VinScanner({ onVinScanned, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setError(null);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied. Please allow camera access and try again.");
    }
  }, []);

  useEffect(() => {
    if (isScanning) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScanning, startCamera, stopCamera]);

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg');
      
      // Simulate scanning with a timeout
      setTimeout(() => {
        if (isScanning) {
          const mockScannedVin = generateMockVin();
          if (Math.random() > 0.3) { // 70% success rate for demo
            onVinScanned(mockScannedVin);
            stopCamera();
            onClose();
          } else {
            // Continue scanning
            setTimeout(() => captureAndScan(), 1000);
          }
        }
      }, 1000);
    } catch (err) {
      console.error("Error during scanning:", err);
      setError("Error during scanning. Please try again.");
    }
  }, [isScanning, onVinScanned, onClose, stopCamera]);

  const generateMockVin = () => {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = '';
    for (let i = 0; i < 17; i++) {
      vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
  };

  const handleStartScanning = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => captureAndScan(), 2000);
  }, [captureAndScan]);

  const handleStop = useCallback(() => {
    setIsScanning(false);
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <Card className="bg-slate-900 border-purple-500/30 w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-400" />
                Scan VIN Barcode
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStop}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {error ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-300 mb-4">{error}</p>
                <Button
                  onClick={() => {
                    setError(null);
                    handleStartScanning();
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {isScanning ? (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                        autoPlay
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-2 border-purple-400 rounded-lg" style={{ width: '80%', height: '40%' }}>
                          <motion.div
                            animate={{ y: [0, 60, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-full h-0.5 bg-purple-400 relative top-1/2"
                          >
                            <ScanLine className="absolute right-0 -top-2 w-4 h-4 text-purple-400" />
                          </motion.div>
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                </div>

                <p className="text-slate-300 text-sm text-center">
                  {isScanning 
                    ? "Position the VIN barcode within the scanning area" 
                    : "Tap 'Start Scanning' to begin"
                  }
                </p>

                <div className="flex gap-3">
                  {!isScanning ? (
                    <Button
                      onClick={handleStartScanning}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Start Scanning
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      className="flex-1 border-red-500 text-red-300 hover:bg-red-500/20"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Stop Scanning
                    </Button>
                  )}
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Note: This is a demonstration. In production, this would use advanced OCR/barcode scanning technology.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}