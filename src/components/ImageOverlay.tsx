import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, X, Download, SunMedium, Contrast, HelpCircle, Droplet, Rotate3D, FlipHorizontal2, FlipVertical2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { useDrag } from '@use-gesture/react';
import { animated, useSpring } from '@react-spring/web';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImageOverlayProps {
  fileName?: string | null;
  imageData?: number[][] | null;
  width?: number;
  height?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageOverlay = ({ fileName, imageData, width, height, isOpen, onClose }: ImageOverlayProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [rotate, setRotate] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [colorMap, setColorMap] = useState<string>('default');
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [histogramData, setHistogramData] = useState<number[]>([]);
  const [histogramMin, setHistogramMin] = useState<number>(0);
  const [histogramMax, setHistogramMax] = useState<number>(255);
  const [histogramLoading, setHistogramLoading] = useState(false);

  const colorMaps = [
    { value: 'default', label: 'Default' },
    { value: 'viridis', label: 'Viridis' },
    { value: 'magma', label: 'Magma' },
    { value: 'gray', label: 'Grayscale' },
    { value: 'inferno', label: 'Inferno' },
    { value: 'plasma', label: 'Plasma' }
  ];
  
  const getColorMapGradient = (colorMap: string) => {
    switch (colorMap) {
      case 'gray':
        return 'black, white';
      case 'viridis':
        return '#440154, #21908C, #FDE725';
      case 'magma':
        return '#000004, #51127C, #FB8861, #FCFDBF';
      case 'inferno':
        return '#000004, #57106E, #BC3754, #FBA238, #FCFFA4';
      case 'plasma':
        return '#0D0887, #7E03A8, #CC4778, #F89540, #F0F921';
      default:
        return 'black, white';
    }
  };

  const getColorMapFilter = (colorMap: string) => {
    switch (colorMap) {
      case 'gray':
        return 'grayscale(100%)';
      case 'viridis':
        return 'hue-rotate(240deg) saturate(200%)';
      case 'magma':
        return 'hue-rotate(300deg) saturate(180%)';
      case 'inferno':
        return 'hue-rotate(30deg) saturate(200%) brightness(120%)';
      case 'plasma':
        return 'hue-rotate(120deg) saturate(180%) contrast(110%)';
      default:
        return '';
    }
  };
  
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));
  const imageRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Add touch gesture bindings
  const bind = useDrag(({ down, movement: [mx, my], first, last }) => {
    if (first) {
      startPosRef.current = { x: x.get(), y: y.get() };
    }
    if (down) {
      api.start({ 
        x: startPosRef.current.x + mx, 
        y: startPosRef.current.y + my,
        immediate: true 
      });
    }
    if (last) {
      // Optional: Add bounce-back if image is dragged too far
      const bounds = imageRef.current?.getBoundingClientRect();
      if (bounds) {
        const maxX = bounds.width * (scale - 1) / 2;
        const maxY = bounds.height * (scale - 1) / 2;
        api.start({ 
          x: Math.max(Math.min(x.get(), maxX), -maxX),
          y: Math.max(Math.min(y.get(), maxY), -maxY)
        });
      }
    }
  }, {
    bounds: { left: -1000, right: 1000, top: -1000, bottom: 1000 },
    rubberband: true
  });

  const handleMiniMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Convert click position to percentage
    const percentX = (clickX / rect.width - 0.5) * 2;
    const percentY = (clickY / rect.height - 0.5) * 2;
    
    // Calculate max bounds
    const bounds = imageRef.current.getBoundingClientRect();
    const maxX = bounds.width * (scale - 1) / 2;
    const maxY = bounds.height * (scale - 1) / 2;
    
    // Update position with smooth animation
    api.start({ 
      x: -percentX * maxX,
      y: -percentY * maxY,
      config: { tension: 120, friction: 14 }
    });
  };

  const generateHistogram = async (img: HTMLImageElement) => {
    try {
      setHistogramLoading(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const histogram = new Array(256).fill(0);
      
      // Count pixel intensities (using grayscale conversion)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const intensity = Math.floor((r * 0.299 + g * 0.587 + b * 0.114));
        histogram[intensity]++;
      }

      // Normalize histogram
      const maxCount = Math.max(...histogram);
      const normalizedHistogram = histogram.map(count => count / maxCount);
      
      setHistogramData(normalizedHistogram);
      setHistogramMin(histogram.findIndex(count => count > 0));
      setHistogramMax(255 - [...histogram].reverse().findIndex(count => count > 0));
    } catch (err) {
      console.error('Error generating histogram:', err);
      // Set empty histogram data
      setHistogramData(new Array(256).fill(0));
      setHistogramMin(0);
      setHistogramMax(255);
    } finally {
      setHistogramLoading(false);
    }
  };

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Add this useEffect to fetch the presigned URL
  useEffect(() => {
    const loadImage = async () => {
      if (!fileName || !isOpen) {
        setImageUrl(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const url = `http://localhost:5003/api/fits-image/?file=${encodeURIComponent(fileName)}`;
        console.log('Requesting FITS image from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Server response data:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        if (!data.url) {
          throw new Error('No image URL returned');
        }
        
        // Test the presigned URL directly
        console.log('Testing presigned URL:', data.url);
        const imageResponse = await fetch(data.url);
        if (!imageResponse.ok) {
          throw new Error('Failed to load image from presigned URL');
        }
        
        setImageUrl(data.url);
        console.log('Image URL set successfully');
      } catch (err) {
        console.error('Error loading image:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
        toast.error('Failed to load image. Check console for details.');
        setLoading(false);
      }
    };

    loadImage();
  }, [fileName, isOpen]);

  // Handle direct imageData
  useEffect(() => {
    if (imageData && isOpen) {
      setLoading(false);
      setError(null);
      // Convert imageData to canvas and then to data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Could not create canvas context');
        return;
      }

      canvas.width = width || imageData[0]?.length || 100;
      canvas.height = height || imageData.length || 100;

      // Find min and max values for normalization
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < imageData.length; i++) {
        for (let j = 0; j < imageData[i].length; j++) {
          const value = imageData[i][j];
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }

      // Create image data
      const imageDataObj = ctx.createImageData(canvas.width, canvas.height);
      const data = imageDataObj.data;

      for (let i = 0; i < imageData.length; i++) {
        for (let j = 0; j < imageData[i].length; j++) {
          const value = imageData[i][j];
          const normalizedValue = Math.floor(((value - min) / (max - min)) * 255);
          const index = (i * canvas.width + j) * 4;
          data[index] = normalizedValue;     // R
          data[index + 1] = normalizedValue; // G
          data[index + 2] = normalizedValue; // B
          data[index + 3] = 255;             // A
        }
      }

      ctx.putImageData(imageDataObj, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setImageUrl(dataUrl);
    }
  }, [imageData, width, height, isOpen]);

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName?.replace('.fits', '')}_processed.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded successfully');
    } catch (err) {
      toast.error('Failed to download image');
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch(e.key) {
        case '+':
        case '=':
          setScale(s => s * 1.2);
          break;
        case '-':
          setScale(s => s / 1.2);
          break;
        case '0':
          setScale(1);
          setBrightness(100);
          setContrast(100);
          break;
        case 'ArrowUp':
          setBrightness(b => Math.min(200, b + 10));
          break;
        case 'ArrowDown':
          setBrightness(b => Math.max(0, b - 10));
          break;
        case 'ArrowRight':
          setContrast(c => Math.min(200, c + 10));
          break;
        case 'ArrowLeft':
          setContrast(c => Math.max(0, c - 10));
          break;
        case 'Escape':
          onClose();
          break;
        case 'r':
          setRotate(r => (r + 90) % 360);
          break;
        case 'h':
          setFlip(f => ({ ...f, horizontal: !f.horizontal }));
          break;
        case 'v':
          setFlip(f => ({ ...f, vertical: !f.vertical }));
          break;
        case 'i':
          setInvert(i => !i);
          break;
        case 'm':
          setShowMiniMap(s => !s);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isOpen || !imageRef.current) return;
      e.preventDefault();

      const delta = -e.deltaY;
      const rect = imageRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new scale
      const newScale = Math.max(1, Math.min(5, scale * (1 + delta * 0.001)));
      
      // Calculate new position to zoom towards mouse
      if (newScale !== scale) {
        const scaleChange = newScale / scale;
        const newX = mouseX - (mouseX - x.get()) * scaleChange;
        const newY = mouseY - (mouseY - y.get()) * scaleChange;
        
        setScale(newScale);
        api.start({ x: newX, y: newY });
      }
    };

    const element = imageRef.current;
    if (element) {
      element.addEventListener('wheel', handleWheel, { passive: false });
      return () => element.removeEventListener('wheel', handleWheel);
    }
  }, [isOpen, scale, x, y, api]);

  // Reset histogram when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setHistogramData([]);
      setHistogramMin(0);
      setHistogramMax(255);
    }
  }, [isOpen]);

  // Reset position when scale changes to 1
  useEffect(() => {
    if (scale === 1) {
      api.start({ x: 0, y: 0 });
    }
    
    // Reset transform states when dialog is opened/closed
    if (!isOpen) {
      setScale(1);
      setBrightness(100);
      setContrast(100);
      setRotate(0);
      setFlip({ horizontal: false, vertical: false });
      setInvert(false);
      setColorMap('default');
    }
  }, [scale, api, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl bg-slate-800/90 border-blue-500/30">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="text-white">FITS Image View</DialogTitle>
          <div className="flex space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-300"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 border-blue-500/30 p-4">
                  <div className="space-y-2 text-sm">
                    <h4 className="font-semibold text-white">Keyboard Shortcuts</h4>
                    <div className="space-y-1 text-gray-300">
                      <p><span className="font-mono bg-slate-700 px-1 rounded">+/=</span> Zoom in</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">-</span> Zoom out</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">0</span> Reset all</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">↑/↓</span> Adjust brightness</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">←/→</span> Adjust contrast</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">Pinch/Wheel</span> Zoom in/out</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">Drag</span> Pan image</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">R</span> Rotate 90°</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">H</span> Flip horizontal</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">V</span> Flip vertical</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">I</span> Invert colors</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">M</span> Toggle mini-map</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">Click mini-map</span> Jump to position</p>
                      <p><span className="font-mono bg-slate-700 px-1 rounded">Esc</span> Close viewer</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-blue-300 border-blue-500/30"
              disabled={!imageUrl || loading || error !== null}
            >
              <Download className="h-4 w-4 mr-1" />
              Save PNG
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative bg-slate-900 rounded-lg overflow-hidden p-4">
          <div className="flex justify-between items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <SunMedium className="h-4 w-4 text-blue-300" />
              <Slider
                value={[brightness]}
                onValueChange={(vals) => setBrightness(vals[0])}
                min={0}
                max={200}
                step={1}
                className="w-32"
              />
            </div>
            <div className="flex items-center space-x-2 flex-1">
              <Contrast className="h-4 w-4 text-blue-300" />
              <Slider
                value={[contrast]}
                onValueChange={(vals) => setContrast(vals[0])}
                min={0}
                max={200}
                step={1}
                className="w-32"
              />
            </div>
            <div className="flex items-center space-x-2 flex-1">
              <Droplet className="h-4 w-4 text-blue-300" />
              <Select value={colorMap} onValueChange={setColorMap}>
                <SelectTrigger className="w-32 bg-slate-700/50 border-blue-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorMaps.map(map => (
                    <SelectItem key={map.value} value={map.value}>
                      {map.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRotate(r => (r + 90) % 360)}
                      className="text-blue-300 border-blue-500/30"
                    >
                      <Rotate3D className="h-4 w-4 mr-1" />
                      Rotate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-blue-500/30">
                    <p className="text-xs">Rotate 90° (R)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))}
                      className={`text-blue-300 border-blue-500/30 ${flip.horizontal ? 'bg-blue-500/20' : ''}`}
                    >
                      <FlipHorizontal2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-blue-500/30">
                    <p className="text-xs">Flip horizontal (H)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFlip(f => ({ ...f, vertical: !f.vertical }))}
                      className={`text-blue-300 border-blue-500/30 ${flip.vertical ? 'bg-blue-500/20' : ''}`}
                    >
                      <FlipVertical2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-blue-500/30">
                    <p className="text-xs">Flip vertical (V)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInvert(i => !i)}
                      className={`text-blue-300 border-blue-500/30 ${invert ? 'bg-blue-500/20' : ''}`}
                    >
                      <Contrast className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-blue-500/30">
                    <p className="text-xs">Invert colors (I)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(s => s * 1.2)}
                className="text-blue-300 border-blue-500/30"
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScale(s => s / 1.2)}
                className="text-blue-300 border-blue-500/30"
              >
                <ZoomOut className="h-4 w-4 mr-1" />
                Zoom Out
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScale(1);
                  setBrightness(100);
                  setContrast(100);
                  setRotate(0);
                  setFlip({ horizontal: false, vertical: false });
                  setColorMap('default');
                  setInvert(false);
                }}
                className="text-blue-300 border-blue-500/30"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMiniMap(s => !s)}
                      className={`text-blue-300 border-blue-500/30 ${showMiniMap ? 'bg-blue-500/20' : ''}`}
                    >
                      <Map className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-blue-500/30">
                    <p className="text-xs">Toggle mini-map (M)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="relative aspect-video flex items-center justify-center">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500">
                {error}
              </div>
            )}
            
            {imageUrl && (
              <div 
                ref={imageRef}
                className="overflow-hidden max-w-full max-h-[60vh] relative cursor-grab active:cursor-grabbing"
                {...bind()}
              >
                <animated.img
                  src={imageUrl}
                  alt="FITS Image"
                  className="object-contain transition-[filter] duration-200"
                  style={{
                    transform: scale !== 1 ? 
                      `translate(${x.get()}px, ${y.get()}px) scale(${scale}) rotate(${rotate}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})` :
                      `rotate(${rotate}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
                    filter: `
                      brightness(${brightness}%)
                      contrast(${contrast}%)
                      ${getColorMapFilter(colorMap)}
                      ${invert ? 'invert(100%)' : ''}
                    `,
                    transformOrigin: 'center'
                  }}
                  onLoad={(e) => {
                    console.log("Image loaded successfully");
                    setLoading(false);
                    generateHistogram(e.target as HTMLImageElement);
                  }}
                  onError={(e) => {
                    console.error("Image load error:", e);
                    setLoading(false);
                    setError('Failed to load image. Check the console for details.');
                    toast.error('Failed to display image. Please try again.');
                  }}
                />
              </div>
            )}
            
            {/* Mini-map navigator */}
            {imageUrl && scale > 1 && showMiniMap && (
              <div 
                className="absolute bottom-4 right-4 w-32 h-32 bg-slate-800/90 border border-blue-500/30 rounded-lg overflow-hidden"
                onClick={handleMiniMapClick}
                style={{ cursor: 'crosshair' }}
              >
                <div className="relative w-full h-full">
                  <img
                    src={imageUrl}
                    alt="Navigation Map"
                    className="w-full h-full object-contain"
                    style={{
                      filter: `
                        brightness(${brightness}%)
                        contrast(${contrast}%)
                        ${getColorMapFilter(colorMap)}
                        ${invert ? 'invert(100%)' : ''}
                      `
                    }}
                  />
                  <div
                    className="absolute border-2 border-blue-500/50 bg-blue-500/10"
                    style={{
                      width: `${(1 / scale) * 100}%`,
                      height: `${(1 / scale) * 100}%`,
                      left: `${50 + ((x.get() / (imageRef.current?.offsetWidth || 1)) * -100 / scale)}%`,
                      top: `${50 + ((y.get() / (imageRef.current?.offsetHeight || 1)) * -100 / scale)}%`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {fileName && (
            <div className="mt-2 space-y-1">
              <div className="text-sm text-blue-300 font-mono flex justify-between items-center">
                <span>{fileName}</span>
                <span className="text-gray-400">
                  Brightness: {brightness}% | Contrast: {contrast}% | 
                  Rotate: {rotate}° | ColorMap: {colorMap}
                </span>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2 space-y-2">
                {/* Color map preview */}
                <div className="w-full h-4 rounded bg-gradient-to-r" 
                  style={{
                    backgroundImage: `linear-gradient(to right, ${getColorMapGradient(colorMap)})`
                  }}
                />
                
                {/* Histogram */}
                <div className="h-20">
                  <div className="text-xs text-gray-400 mb-1 flex justify-between">
                    <span>Histogram</span>
                    <span>Range: {histogramMin} - {histogramMax}</span>
                  </div>
                  <div className="h-16 w-full bg-slate-800/50 rounded relative overflow-hidden">
                    {histogramLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-end">
                        {histogramData.map((value, index) => (
                        <TooltipProvider key={index}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="w-1 bg-blue-500/50 hover:bg-blue-400/70 transition-colors"
                                style={{
                                  height: `${value * 100}%`,
                                  marginLeft: index === 0 ? '0' : '-1px'
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-slate-800 border-blue-500/30">
                              <p className="text-xs">Intensity: {index} ({(value * 100).toFixed(1)}%)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        ))}
                      </div>
                    )}
                    {/* Brightness/Contrast indicators */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute bottom-0 w-0.5 h-full bg-yellow-500/50 cursor-help"
                            style={{ left: `${(brightness / 200) * 100}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-800 border-blue-500/30">
                          <p className="text-xs">Brightness: {brightness}%</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute bottom-0 w-0.5 h-full bg-purple-500/50 cursor-help"
                            style={{ left: `${(contrast / 200) * 100}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-slate-800 border-blue-500/30">
                          <p className="text-xs">Contrast: {contrast}%</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
