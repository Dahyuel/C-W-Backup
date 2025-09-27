import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Scan, Camera, RefreshCw } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = "html5qr-code-full-region";

  // Check camera permissions first
  const checkCameraPermissions = useCallback(async (): Promise<boolean> => {
    try {
      // Request camera access directly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' 
        } 
      });
      
      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      console.error('Camera permission error:', err);
      return false;
    }
  }, []);

  // Reset all states
  const resetStates = useCallback(() => {
    setError(null);
    setIsScanning(false);
    setScanSuccess(false);
    setCameraStarted(false);
    setHasPermission(null);
    setIsInitializing(false);
  }, []);

  // Stop scanner and cleanup
  const stopScanner = useCallback(() => {
    console.log('Stopping QR scanner...');
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.warn('Error during scanner cleanup:', err);
      }
    }
    setCameraStarted(false);
    setIsScanning(false);
  }, []);

  // Handle successful scan
  const handleScanSuccess = useCallback((decodedText: string, decodedResult: any) => {
    const data = decodedText?.trim();
    
    if (!data) {
      console.log('Empty QR code data');
      return;
    }

    console.log('QR Code scanned:', data);
    
    setIsScanning(false);
    setScanSuccess(true);
    
    // Stop scanning
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    
    // Provide feedback and close
    setTimeout(() => {
      onScan(data);
      onClose();
    }, 1000);
  }, [onScan, onClose]);

  // Handle scan errors
  const handleScanFailure = useCallback((error: string) => {
    // Ignore common errors that occur during normal scanning
    if (error.includes('No MultiFormat Readers') || 
        error.includes('NotFoundException') ||
        error.includes('NotReadableError') ||
        error === '' ||
        error.includes('No QR code found')) {
      return;
    }
    console.log('Scan error:', error);
  }, []);

  // Start the QR scanner
  const startScanner = useCallback(async () => {
    if (!isOpen) return;
    
    setIsInitializing(true);
    setError(null);

    try {
      console.log('Checking camera permissions...');
      
      // First, check and request camera permissions
      const hasCameraAccess = await checkCameraPermissions();
      
      if (!hasCameraAccess) {
        setError('Camera permission denied. Please allow camera access to scan QR codes.');
        setHasPermission(false);
        setIsInitializing(false);
        return;
      }

      setHasPermission(true);
      
      // Check if container exists
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error('Scanner container not found');
      }

      // Clear any existing scanner
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      console.log('Initializing Html5QrcodeScanner...');

      // Create scanner instance with better configuration
      const scanner = new Html5QrcodeScanner(
        containerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false // verbose mode off
      );

      scannerRef.current = scanner;

      // Render the scanner
      scanner.render(
        handleScanSuccess,
        handleScanFailure
      );

      // Set a timeout to check if scanner started successfully
      setTimeout(() => {
        setCameraStarted(true);
        setIsScanning(true);
        setIsInitializing(false);
      }, 1000);

      console.log('Html5QrcodeScanner started successfully');

    } catch (err: any) {
      console.error('Failed to start QR scanner:', err);
      setIsInitializing(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings and try again.');
        setHasPermission(false);
      } else if (err.name === 'NotFoundError' || err.message?.includes('camera')) {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps and try again.');
      } else if (err.message?.includes('container')) {
        setError('Scanner initialization failed. Please try closing and reopening the scanner.');
      } else {
        setError(`Scanner error: ${err.message || 'Failed to initialize scanner'}`);
      }
    }
  }, [isOpen, handleScanSuccess, handleScanFailure, checkCameraPermissions]);

  // Handle manual permission request
  const requestPermissionAndRetry = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      // Direct permission request
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      // Retry scanner after permission granted
      setTimeout(() => {
        handleRetry();
      }, 500);
      
    } catch (err: any) {
      setIsInitializing(false);
      if (err.name === 'NotAllowedError') {
        setError('Permission denied. Please allow camera access in your browser settings and refresh the page.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  }, []);

  // Handle retry button
  const handleRetry = useCallback(() => {
    stopScanner();
    resetStates();
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      startScanner();
    }, 500);
  }, [stopScanner, resetStates, startScanner]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('QR Scanner modal opening...');
      resetStates();
      
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        startScanner();
      }, 200);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      console.log('QR Scanner modal closing...');
      stopScanner();
      resetStates();
    }
  }, [isOpen, resetStates, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

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
                        disabled={isInitializing}
                        className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:bg-orange-300 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <Camera className="h-4 w-4" />
                        <span>{isInitializing ? 'Requesting...' : 'Allow Camera Access'}</span>
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
                    disabled={isInitializing}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 disabled:bg-orange-300 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isInitializing ? 'animate-spin' : ''}`} />
                    <span>{isInitializing ? 'Retrying...' : 'Try Again'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : isInitializing || !cameraStarted ? (
            /* Loading State */
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <Camera className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              </div>
              <p className="text-gray-600 font-medium">
                {isInitializing ? 'Requesting camera access...' : 'Starting camera...'}
              </p>
              <p className="text-xs text-gray-500">
                Please allow camera access when prompted
              </p>
              
              {/* Browser permission dialog will appear here */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">
                  If no permission prompt appears:
                </p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• Check your browser's address bar for a camera icon</li>
                  <li>• Ensure your browser allows pop-ups for this site</li>
                  <li>• Click "Allow" when the permission dialog appears</li>
                </ul>
              </div>
              
              {/* Loading indicator */}
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            </div>
          ) : (
            /* Scanner View */
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">{description}</p>
              
              {/* Scanner Container */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square">
                <div 
                  id={containerId}
                  className="w-full h-full"
                />
                
                {/* Status indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded-full text-sm flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                    <span>{isScanning ? 'Scanning...' : 'Camera ready'}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-xs text-gray-500 leading-relaxed mb-2">
                  Hold your device steady and position the QR code clearly within the frame.
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