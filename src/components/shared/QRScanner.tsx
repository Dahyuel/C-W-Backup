import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import jsQR from 'jsqr';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef<boolean>(false);

  const stopCamera = () => {
    scanningRef.current = false;
    setIsScanning(false);
    setCameraStarted(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScanSuccess(false);
      setError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      setScanSuccess(false);
      setCameraStarted(false);
      
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
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
                setError('Failed to start video');
              });
          }
        };

        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setError('Video playback error');
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found.');
      } else {
        setError('Unable to access camera: ' + err.message);
      }
    }
  };

  const startScanning = () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const tick = () => {
      if (!scanningRef.current || !videoRef.current || !context) return;
      
      const video = videoRef.current;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (canvas.width > 0 && canvas.height > 0) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code) {
            console.log('QR Code found:', code.data);
            handleSuccessfulScan(code.data);
            return;
          }
        }
      }
      
      if (scanningRef.current) {
        requestAnimationFrame(tick);
      }
    };
    
    tick();
  };

  const handleSuccessfulScan = (data: string) => {
    scanningRef.current = false;
    setScanSuccess(true);
    setIsScanning(false);
    
    setTimeout(() => {
      onScan(data);
      onClose();
    }, 1000);
  };

  const handleManualInput = () => {
    const input = prompt('Enter Personal ID:');
    if (input && input.trim()) {
      handleSuccessfulScan(input.trim());
    }
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
                <h3 className="text-lg font-semibold text-gray-900">Scan Successful!</h3>
                <p className="text-gray-600">Processing attendee information...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="space-y-2">
                  <button
                    onClick={startCamera}
                    className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleManualInput}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Enter Personal ID Manually
                  </button>
                </div>
              </div>
            </div>
          ) : !cameraStarted ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600">Starting camera...</p>
              <button
                onClick={handleManualInput}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Skip and enter manually
              </button>
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
                      <div className="w-full h-0.5 bg-orange-500 opacity-75 animate-pulse"></div>
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

              {/* Manual Input Option */}
              <div className="space-y-2">
                <button
                  onClick={handleManualInput}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Can't scan? Enter Personal ID manually
                </button>
                
                {/* Instructions */}
                <p className="text-xs text-gray-500 text-center">
                  Position the QR code clearly within the frame. Make sure there's adequate lighting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
