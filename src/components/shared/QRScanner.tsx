import React, { useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Scan, Camera, RefreshCw } from 'lucide-react';
import QrScanner from 'react-qr-scanner';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  description?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onClose,
  isOpen,
  title = "Scan QR Code",
  description = "Position the QR code within the frame to scan"
}) => {
  const [error, setError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Reset all states when closing
  const resetStates = useCallback(() => {
    setError(null);
    setScanSuccess(false);
    setHasPermission(null);
  }, []);

  // Handle successful scan
  const handleScan = useCallback((data: string | null) => {
    if (data) {
      console.log('QR Code scanned:', data);
      setScanSuccess(true);
      
      // Provide feedback and close
      setTimeout(() => {
        onScan(data);
        onClose();
      }, 1000);
    }
  }, [onScan, onClose]);

  // Handle scan errors
  const handleError = useCallback((err: any) => {
    console.error('QR Scanner error:', err);
    
    if (err.name === 'NotAllowedError') {
      setError('Camera permission denied. Please allow camera access and try again.');
      setHasPermission(false);
    } else if (err.name === 'NotFoundError') {
      setError('No camera found. Please ensure your device has a camera.');
    } else if (err.name === 'NotReadableError') {
      setError('Camera is being used by another application. Please close other apps and try again.');
    } else if (err.name === 'OverconstrainedError') {
      setError('Camera constraints not supported. Trying again with different settings...');
    } else {
      setError(`Camera error: ${err.message || 'Failed to access camera'}`);
    }
  }, []);

  // Handle retry button
  const handleRetry = useCallback(() => {
    resetStates();
    // Error will clear and component will re-initialize
  }, [resetStates]);

  // Handle manual permission request
  const requestPermissionAndRetry = useCallback(async () => {
    try {
      setError(null);
      // Request camera access directly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' 
        } 
      });
      
      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permission denied. Please allow camera access in your browser settings.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
      setHasPermission(false);
    }
  }, []);

  if (!isOpen) return null;

  const previewStyle = {
    height: 300,
    width: 300,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    margin: '0 auto'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scan className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-200 transition-colors"
            aria-label="Close scanner"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {scanSuccess ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">QR Code Scanned!</h3>
                <p className="text-gray-600">Processing information...</p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Scanner Error</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">{error}</p>
                
                {hasPermission === false ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800 mb-3">
                        Camera access is required to scan QR codes. Please allow camera permissions.
                      </p>
                      <button
                        onClick={requestPermissionAndRetry}
                        className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Allow Camera Access</span>
                      </button>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Close Scanner
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRetry}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Try Again</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Scanner View */
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">{description}</p>
              
              {/* Scanner Container */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex justify-center items-center bg-black">
                  <QrScanner
                    delay={300}
                    onError={handleError}
                    onScan={handleScan}
                    constraints={{
                      facingMode: 'environment'
                    }}
                    style={previewStyle}
                    className="qr-scanner"
                  />
                </div>
                
                {/* Scanning frame overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="border-2 border-white border-dashed rounded-lg w-64 h-64 flex items-center justify-center">
                    <div className="w-full h-full relative">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white"></div>
                    </div>
                  </div>
                </div>
                
                {/* Status indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-full text-sm flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Ready to scan</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-xs text-gray-500 leading-relaxed mb-2">
                  Hold your device steady and position the QR code within the frame.
                </p>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    Tips for best results:
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Ensure good lighting</li>
                    <li>• Keep the QR code flat and unfolded</li>
                    <li>• Maintain steady hands</li>
                    <li>• Clean your camera lens if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};