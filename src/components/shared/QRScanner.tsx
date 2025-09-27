import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Scan, Camera, RefreshCw } from 'lucide-react';
import QrScanner from 'qr-scanner';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch (err) {
        console.warn('Error during scanner cleanup:', err);
      }
      qrScannerRef.current = null;
    }
    setCameraStarted(false);
    setIsScanning(false);
  }, []);

  // Handle successful scan
  const handleScanResult = useCallback((result: QrScanner.ScanResult) => {
    const data = result.data?.trim();
    
    if (!data) {
      console.log('Empty QR code data');
      return;
    }

    console.log('QR Code scanned:', data);
    
    setIsScanning(false);
    setScanSuccess(true);
    
    // Stop scanning
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    
    // Provide feedback and close
    setTimeout(() => {
      onScan(data);
      onClose();
    }, 1500);
  }, [onScan, onClose]);

  // Handle scan errors
  const handleScanError = useCallback((err: string | Error) => {
    console.log('Scan error (this is normal - just means no QR code found):', err);
    // Don't show error for normal "no QR code found" situations
  }, []);

  // Check if video element is ready
  const isVideoElementReady = useCallback(() => {
    if (!videoRef.current) {
      console.error('Video element reference is null');
      return false;
    }
    
    if (!containerRef.current) {
      console.error('Container element reference is null');
      return false;
    }
    
    // Check if video element is in DOM
    if (!document.body.contains(videoRef.current)) {
      console.error('Video element is not in DOM');
      return false;
    }
    
    return true;
  }, []);

  // Start the QR scanner
  const startScanner = useCallback(async () => {
    setIsInitializing(true);
    
    // Check if video element is ready
    if (!isVideoElementReady()) {
      setError('Camera view not ready. Please try again.');
      setIsInitializing(false);
      return;
    }

    try {
      console.log('Initializing QR scanner...');
      setError(null);
      
      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setError('No camera found on this device');
        setIsInitializing(false);
        return;
      }

      // Ensure video element is properly reset
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load();
      }

      // Create QR scanner instance
      const qrScanner = new QrScanner(
        videoRef.current!,
        handleScanResult,
        {
          onDecodeError: handleScanError,
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        }
      );

      qrScannerRef.current = qrScanner;

      // Start scanning
      console.log('Starting QR scanner...');
      await qrScanner.start();
      
      setCameraStarted(true);
      setIsScanning(true);
      setHasPermission(true);
      setIsInitializing(false);
      
      console.log('QR scanner started successfully');

    } catch (err: any) {
      console.error('Failed to start QR scanner:', err);
      setIsInitializing(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
        setHasPermission(false);
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Camera constraints not supported. Trying again with different settings...');
        // Retry with different camera
        setTimeout(() => retryWithFrontCamera(), 500);
      } else if (err.message?.includes('video element')) {
        setError('Camera view not available. Please try closing and reopening the scanner.');
      } else {
        setError(`Camera error: ${err.message || 'Failed to access camera'}`);
      }
    }
  }, [handleScanResult, handleScanError, isVideoElementReady]);

  // Retry with front camera if back camera fails
  const retryWithFrontCamera = useCallback(async () => {
    if (!videoRef.current || !qrScannerRef.current) {
      setError('Scanner not ready for retry');
      return;
    }

    try {
      console.log('Retrying with front camera...');
      setError(null);
      setIsInitializing(true);
      
      // Stop current scanner
      qrScannerRef.current.stop();
      
      // Try to switch to front camera
      const cameras = await QrScanner.listCameras(true);
      const frontCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('front') || 
        camera.label.toLowerCase().includes('user')
      );

      if (frontCamera) {
        await qrScannerRef.current.setCamera(frontCamera.id);
        await qrScannerRef.current.start();
      } else {
        // Just try with default camera
        await qrScannerRef.current.start();
      }
      
      setError(null);
      setCameraStarted(true);
      setIsScanning(true);
      setIsInitializing(false);
    } catch (retryErr: any) {
      console.error('Retry failed:', retryErr);
      setIsInitializing(false);
      setError('Unable to access any camera. Please check your browser settings.');
    }
  }, []);

  // Handle retry button
  const handleRetry = useCallback(() => {
    stopScanner();
    resetStates();
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      startScanner();
    }, 300);
  }, [stopScanner, resetStates, startScanner]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('QR Scanner modal opening...');
      resetStates();
      
      // Wait for DOM to be ready and modal to be fully rendered
      const initializeScanner = () => {
        if (isVideoElementReady()) {
          startScanner();
        } else {
          // Retry after a short delay if video element isn't ready
          setTimeout(() => {
            if (isVideoElementReady()) {
              startScanner();
            } else {
              setError('Camera view failed to initialize. Please try again.');
            }
          }, 200);
        }
      };

      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(initializeScanner, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      console.log('QR Scanner modal closing...');
      stopScanner();
      resetStates();
    }
  }, [isOpen, resetStates, startScanner, stopScanner, isVideoElementReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div ref={containerRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
                      <p className="text-xs text-yellow-800">
                        Camera access is required. Please enable camera permissions in your browser settings and refresh the page.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Close
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
                {isInitializing ? 'Initializing camera...' : 'Starting camera...'}
              </p>
              <p className="text-xs text-gray-500">
                Please allow camera access when prompted
              </p>
              
              {/* Loading indicator */}
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            </div>
          ) : (
            /* Scanner View */
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">{description}</p>
              
              {/* Camera View */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                
                {/* Scanning overlay will be added by qr-scanner library */}
                
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