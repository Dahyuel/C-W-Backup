import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Scan, Camera, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  description?: string;
}

// QR Code detection using modern browser APIs and jsQR library
declare global {
  interface Window {
    jsQR: any;
  }
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
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const animationRef = useRef<number>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Reset all states when modal closes
  const resetStates = useCallback(() => {
    setError(null);
    setIsScanning(false);
    setScanSuccess(false);
    setCameraStarted(false);
    setPermissionState('prompt');
    scanningRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }
  }, []);

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    scanningRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Load jsQR library
  const loadQRLibrary = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.jsQR) {
        setLibraryLoaded(true);
        resolve();
        return;
      }

      console.log('Loading jsQR library...');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('jsQR library loaded successfully');
        setLibraryLoaded(true);
        resolve();
      };
      
      script.onerror = (err) => {
        console.error('Failed to load jsQR library:', err);
        reject(new Error('Failed to load QR scanner library'));
      };
      
      // Remove any existing script first
      const existingScript = document.querySelector('script[src*="jsQR"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      document.head.appendChild(script);
    });
  }, []);

  // Check camera permissions
  const checkCameraPermissions = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(permission.state);
        
        permission.onchange = () => {
          setPermissionState(permission.state);
        };
      }
    } catch (err) {
      console.log('Permissions API not supported:', err);
    }
  }, []);

  // Start camera with robust error handling
  const startCamera = useCallback(async () => {
    try {
      console.log('Starting camera...');
      setError(null);
      setCameraStarted(false);

      // First, check permissions
      await checkCameraPermissions();

      // Define constraints with fallbacks
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 } // Lower frame rate for better performance
        },
        audio: false
      };

      let stream: MediaStream;

      try {
        // Try with rear camera first
        console.log('Attempting rear camera...');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (envError) {
        console.log('Rear camera failed, trying any camera:', envError);
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { min: 320, ideal: 640 },
            height: { min: 240, ideal: 480 }
          },
          audio: false
        });
      }

      console.log('Camera stream obtained');
      streamRef.current = stream;
      setPermissionState('granted');

      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Set up video element
      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000); // 10 second timeout

        video.onloadedmetadata = () => {
          console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
          clearTimeout(timeoutId);
          resolve();
        };

        video.onerror = (err) => {
          console.error('Video error:', err);
          clearTimeout(timeoutId);
          reject(new Error('Video loading failed'));
        };
      });

      // Play video
      await video.play();
      console.log('Video playing successfully');
      
      setCameraStarted(true);
      setIsScanning(true);
      scanningRef.current = true;
      
      // Start scanning after a brief delay
      setTimeout(() => {
        if (scanningRef.current) {
          startScanning();
        }
      }, 500);

    } catch (err: any) {
      console.error('Camera startup error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is being used by another application. Please close other apps and try again.');
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        setError('Camera constraints not supported. Trying with basic settings...');
        // Retry with minimal constraints
        retryWithBasicConstraints();
      } else {
        setError(`Camera error: ${err.message || 'Unknown error occurred'}`);
      }
    }
  }, [checkCameraPermissions]);

  // Retry with minimal camera constraints
  const retryWithBasicConstraints = useCallback(async () => {
    try {
      console.log('Retrying with basic constraints...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStarted(true);
        setIsScanning(true);
        scanningRef.current = true;
        setError(null);
        startScanning();
      }
    } catch (retryErr: any) {
      console.error('Retry failed:', retryErr);
      setError('Unable to access camera. Please check your browser settings.');
    }
  }, []);

  // QR Code scanning loop
  const startScanning = useCallback(() => {
    if (!window.jsQR) {
      setError('QR scanner library not loaded');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      console.error('Canvas or video element not available');
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      setError('Canvas not supported');
      return;
    }

    let lastScanTime = 0;
    const scanInterval = 250; // Scan every 250ms for better performance

    const tick = () => {
      if (!scanningRef.current || !video || !context) {
        return;
      }

      const now = Date.now();
      if (now - lastScanTime < scanInterval) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }
      lastScanTime = now;

      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        const { videoWidth, videoHeight } = video;
        
        // Set canvas dimensions
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        try {
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, videoWidth, videoHeight);
          const imageData = context.getImageData(0, 0, videoWidth, videoHeight);
          
          // Scan for QR code
          const code = window.jsQR(imageData.data, videoWidth, videoHeight, {
            inversionAttempts: "dontInvert" // Faster processing
          });

          if (code && code.data && code.data.trim()) {
            console.log('QR Code detected:', code.data);
            handleSuccessfulScan(code.data.trim());
            return;
          }
        } catch (scanError) {
          console.warn('Scan error:', scanError);
        }
      }

      if (scanningRef.current) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    console.log('Starting QR scanning loop...');
    tick();
  }, []);

  // Handle successful QR scan
  const handleSuccessfulScan = useCallback((data: string) => {
    if (!data || data.trim() === '') {
      console.log('Invalid QR code data');
      return;
    }

    console.log('Processing scanned data:', data);
    
    scanningRef.current = false;
    setScanSuccess(true);
    setIsScanning(false);
    
    // Success feedback
    setTimeout(() => {
      onScan(data.trim());
      onClose();
    }, 1500);
  }, [onScan, onClose]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('QR Scanner opening...');
      resetStates();
      
      const initializeScanner = async () => {
        try {
          await loadQRLibrary();
          await startCamera();
        } catch (err: any) {
          console.error('Scanner initialization failed:', err);
          setError(err.message || 'Failed to initialize scanner');
        }
      };

      initializeScanner();
    } else {
      console.log('QR Scanner closing...');
      stopCamera();
      resetStates();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, resetStates, stopCamera, loadQRLibrary, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleRetry = useCallback(() => {
    setError(null);
    setCameraStarted(false);
    setIsScanning(false);
    startCamera();
  }, [startCamera]);

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
                
                {permissionState === 'denied' ? (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-800">
                        Camera access is required. Please enable camera permissions in your browser settings and refresh the page.
                      </p>
                    </div>
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
          ) : !libraryLoaded ? (
            /* Loading Library */
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600">Loading QR scanner...</p>
            </div>
          ) : !cameraStarted ? (
            /* Starting Camera */
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <Camera className="h-12 w-12 text-orange-500 mx-auto mb-3" />
              </div>
              <p className="text-gray-600 font-medium">Starting camera...</p>
              <p className="text-xs text-gray-500">
                {permissionState === 'prompt' ? 'Please allow camera access when prompted' : 'Initializing camera feed'}
              </p>
            </div>
          ) : (
            /* Camera View */
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">{description}</p>
              
              {/* Camera Viewport */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Hidden canvas for QR processing */}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-500 rounded-br-lg"></div>
                    
                    {/* Animated scanning line */}
                    {isScanning && (
                      <div className="absolute inset-0 overflow-hidden">
                        <div 
                          className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-75"
                          style={{
                            animation: 'scan 2s ease-in-out infinite',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span>{isScanning ? 'Scanning...' : 'Camera ready'}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Position the QR code clearly within the frame. Ensure good lighting and hold steady for best results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(192px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};