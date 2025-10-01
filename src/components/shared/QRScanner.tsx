import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Scan, Camera, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';
import { createPortal } from 'react-dom';

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
  const [isReady, setIsReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const scanningRef = useRef<boolean>(false);

  // Reset all states
  const resetStates = useCallback(() => {
    setError(null);
    setScanSuccess(false);
    setHasPermission(null);
    setIsReady(false);
    scanningRef.current = false;
  }, []);

  // Stop scanner and cleanup
  const stopScanner = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    scanningRef.current = false;
    setIsReady(false);
  }, []);

  // Handle successful scan
  const handleScanSuccess = useCallback((data: string) => {
    console.log('QR Code scanned:', data);
    setScanSuccess(true);
    scanningRef.current = false;
    stopScanner();
    
    // Provide feedback and close
    setTimeout(() => {
      onScan(data);
      onClose();
    }, 1000);
  }, [onScan, onClose, stopScanner]);

  // Scan for QR codes
  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data from canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Scan for QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      handleScanSuccess(code.data);
      return;
    }

    // Continue scanning
    if (scanningRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanQRCode);
    }
  }, [handleScanSuccess]);

  // Start the camera and scanner
  const startScanner = useCallback(async () => {
    try {
      resetStates();
      setError(null);

      // Check if browser supports media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser');
        return;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (!videoRef.current) {
        setError('Video element not available');
        return;
      }

      // Set up video element
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().then(() => {
          setIsReady(true);
          
          // Start scanning after a short delay
          setTimeout(() => {
            scanningRef.current = true;
            animationFrameRef.current = requestAnimationFrame(scanQRCode);
          }, 500);
          
        }).catch(err => {
          setError('Failed to start video: ' + err.message);
        });
      };

      videoRef.current.onerror = () => {
        setError('Video playback error');
      };

    } catch (err: any) {
      console.error('Camera error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
        setHasPermission(false);
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps and try again.');
      } else if (err.name === 'OverconstrainedError') {
        // Try with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true // Use default constraints
          });
          streamRef.current = stream;
          setHasPermission(true);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => {
                setIsReady(true);
                setTimeout(() => {
                  scanningRef.current = true;
                  animationFrameRef.current = requestAnimationFrame(scanQRCode);
                }, 500);
              });
            };
          }
        } catch (retryErr: any) {
          setError('Unable to access camera. Please check your browser settings.');
        }
      } else {
        setError(`Camera error: ${err.message || 'Failed to access camera'}`);
      }
    }
  }, [resetStates, scanQRCode]);

  // Handle retry button
  const handleRetry = useCallback(() => {
    stopScanner();
    setTimeout(() => {
      startScanner();
    }, 300);
  }, [stopScanner, startScanner]);

  // Handle manual permission request
  const requestPermissionAndRetry = useCallback(async () => {
    try {
      setError(null);
      // Request camera access directly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      
      // Retry scanner after permission granted
      setTimeout(() => {
        handleRetry();
      }, 500);
      
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permission denied. Please allow camera access in your browser settings and refresh the page.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
      setHasPermission(false);
    }
  }, [handleRetry]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('QR Scanner modal opening...');
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    } else {
      console.log('QR Scanner modal closing...');
      stopScanner();
      resetStates();
    }
  }, [isOpen, startScanner, stopScanner, resetStates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4 modal-backdrop-blur">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-content-blur fade-in-up-blur">
        <div className="p-6 stagger-children">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 fade-in-blur">
            <div className="flex items-center space-x-3">
              <Scan className="h-6 w-6 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close scanner"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="fade-in-blur">
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
                
                {/* Camera View */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  
                  {/* Hidden canvas for QR scanning */}
                  <canvas 
                    ref={canvasRef} 
                    className="hidden" 
                  />
                  
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
                </div>

                {/* Loading State */}
                {!isReady && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Initializing camera...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};