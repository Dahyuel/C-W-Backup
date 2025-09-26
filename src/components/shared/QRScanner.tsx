import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Scan } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  description?: string;
}

declare global {
  interface Window {
    ZXing: any;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);
  const animationRef = useRef<number>();
  const codeReaderRef = useRef<any>(null);

  const stopCamera = () => {
    scanningRef.current = false;
    setIsScanning(false);
    setCameraStarted(false);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        console.log('Error resetting code reader:', e);
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadZXingLibrary();
    } else {
      stopCamera();
      setScanSuccess(false);
      setError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const loadZXingLibrary = () => {
    if (!window.ZXing) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
      script.onload = () => {
        console.log('ZXing library loaded');
        startCamera();
      };
      script.onerror = () => {
        console.error('Failed to load ZXing library');
        setError('Failed to load QR scanner library');
      };
      document.head.appendChild(script);
    } else {
      startCamera();
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setScanSuccess(false);
      setCameraStarted(false);
      
      console.log('Requesting camera access...');
      
      // Get camera stream
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 320, ideal: 640, max: 1920 },
          height: { min: 240, ideal: 480, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (envError) {
        console.log('Environment camera failed, trying any camera:', envError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { min: 320, ideal: 640, max: 1920 },
            height: { min: 240, ideal: 480, max: 1080 }
          },
          audio: false
        });
      }
      
      console.log('Camera access granted');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video playing');
                setCameraStarted(true);
                setIsScanning(true);
                scanningRef.current = true;
                startScanning();
              })
              .catch((err) => {
                console.error('Error playing video:', err);
                setError('Failed to start video preview');
              });
          }
        };

        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setError('Camera error occurred');
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application.');
      } else {
        setError(`Camera access failed: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const startScanning = () => {
    if (!window.ZXing) {
      setError('QR scanner library not loaded');
      return;
    }

    try {
      // Initialize ZXing code reader
      const codeReader = new window.ZXing.BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        setError('Canvas not supported');
        return;
      }

      const tick = () => {
        if (!scanningRef.current || !videoRef.current || !context) {
          return;
        }
        
        const video = videoRef.current;
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const { videoWidth, videoHeight } = video;
          
          if (videoWidth > 0 && videoHeight > 0) {
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            try {
              context.drawImage(video, 0, 0, videoWidth, videoHeight);
              const imageData = context.getImageData(0, 0, videoWidth, videoHeight);
              
              // Use ZXing to decode QR code
              const luminanceSource = new window.ZXing.RGBLuminanceSource(
                new Uint8ClampedArray(imageData.data.buffer),
                videoWidth,
                videoHeight
              );
              const binaryBitmap = new window.ZXing.BinaryBitmap(
                new window.ZXing.HybridBinarizer(luminanceSource)
              );
              
              try {
                const result = codeReader.decode(binaryBitmap);
                if (result && result.text) {
                  console.log('QR Code found:', result.text);
                  handleSuccessfulScan(result.text);
                  return;
                }
              } catch (decodeError) {
                // No QR code found in this frame, continue scanning
              }
            } catch (drawError) {
              console.error('Drawing/decoding error:', drawError);
            }
          }
        }
        
        if (scanningRef.current) {
          animationRef.current = requestAnimationFrame(tick);
        }
      };
      
      tick();
    } catch (scanError) {
      console.error('Scanner initialization error:', scanError);
      setError('Failed to initialize QR scanner');
    }
  };

  const handleSuccessfulScan = (data: string) => {
    if (!data || data.trim() === '') {
      console.log('Invalid QR code data');
      return;
    }

    console.log('Processing scanned UUID/ID:', data);
    
    scanningRef.current = false;
    setScanSuccess(true);
    setIsScanning(false);
    
    setTimeout(() => {
      onScan(data.trim());
      onClose();
    }, 1000);
  };

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
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {scanSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">QR Code Scanned!</h3>
                <p className="text-gray-600">Loading attendee information...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Scanner Error</h3>
                <p className="text-gray-600 mb-4 text-sm">{error}</p>
                <button
                  onClick={startCamera}
                  className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : !cameraStarted ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600">Starting camera...</p>
              <p className="text-xs text-gray-500">
                Please allow camera access when prompted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">{description}</p>
              
              {/* Camera View */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-500 rounded-br-lg"></div>
                    
                    {/* Scanning Line Animation */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-0.5 bg-orange-500 opacity-75 animate-pulse transform translate-y-24"></div>
                    </div>
                  </div>
                </div>

                {/* Scanning Status */}
                {isScanning && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span>Scanning for QR codes...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Position the QR code clearly within the frame. Ensure good lighting for best results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};