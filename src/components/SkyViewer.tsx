
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ZoomIn, ZoomOut, RotateCcw, Layers, Grid, Target } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export const SkyViewer = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = useState("266.4 -29.0");
  const [fov, setFov] = useState(0.1);
  const [showGrid, setShowGrid] = useState(true);
  const [survey, setSurvey] = useState("P/DSS2/color");
  const [catalog, setCatalog] = useState("");

  useEffect(() => {
    if (viewerRef.current) {
      // Create the Aladin viewer HTML content
      const aladinHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <script type="text/javascript" src="https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js"></script>
            <style>
                body { margin: 0; font-family: Arial, sans-serif; }
                #aladin-lite-div {
                    width: 100%;
                    height: 400px;
                    border: none;
                }
                .aladin-controls {
                    padding: 10px;
                    background: rgba(15, 23, 42, 0.8);
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                    font-size: 12px;
                }
                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                label {
                    font-weight: bold;
                    color: #93c5fd;
                }
                select, input {
                    padding: 2px 5px;
                    border: 1px solid #475569;
                    border-radius: 3px;
                    background: #1e293b;
                    color: white;
                    font-size: 11px;
                }
                button {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 11px;
                }
                button:hover {
                    background: #2563eb;
                }
            </style>
        </head>
        <body>
            <div class="aladin-controls">
                <div class="control-group">
                    <label>Survey:</label>
                    <select id="survey-select" onchange="changeSurvey()">
                        <option value="P/DSS2/color">DSS2 Color</option>
                        <option value="P/2MASS/color">2MASS Color</option>
                        <option value="P/SDSS9/color">SDSS9 Color</option>
                        <option value="P/WISE/color">WISE Color</option>
                        <option value="P/Planck/R2/HFI/color">Planck HFI</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label>Coords:</label>
                    <input type="text" id="coord-input" placeholder="RA Dec or name" style="width: 120px;" value="${coordinates}">
                    <button onclick="gotoObject()">Go</button>
                </div>
                
                <div class="control-group">
                    <label>FOV:</label>
                    <input type="range" id="fov-slider" min="0.01" max="10" step="0.01" value="${fov}" 
                           onchange="changeFOV(this.value)" style="width: 80px;">
                    <span id="fov-value">${fov}°</span>
                </div>
                
                <div class="control-group">
                    <label>Grid:</label>
                    <input type="checkbox" id="grid-checkbox" onchange="toggleGrid()" ${showGrid ? 'checked' : ''}>
                </div>
                
                <div class="control-group">
                    <label>Catalog:</label>
                    <select id="catalog-select" onchange="loadCatalog()">
                        <option value="">None</option>
                        <option value="I/337/gaia">Gaia DR2</option>
                        <option value="II/246/out">2MASS</option>
                        <option value="V/147/sdss12">SDSS DR12</option>
                        <option value="VII/233/xsc">2MASS XSC</option>
                    </select>
                </div>
                
                <button onclick="resetView()">Reset</button>
            </div>
            
            <div id="aladin-lite-div"></div>
            
            <script type="text/javascript">
                let aladin;
                let currentCatalog = null;
                
                A.init.then(() => {
                    aladin = A.aladin('#aladin-lite-div', {
                        survey: '${survey}',
                        fov: ${fov},
                        target: '${coordinates}',
                        showReticle: true,
                        showGrid: ${showGrid},
                        showCooGrid: true,
                        fullScreen: false,
                        reticleColor: '#ff0000',
                        reticleSize: 22,
                        gridColor: '#20B2AA',
                        gridOpacity: 0.5
                    });
                    
                    // Add click event listener
                    aladin.on('click', function(params) {
                        const ra = params.ra.toFixed(6);
                        const dec = params.dec.toFixed(6);
                        console.log('Clicked at RA:', ra, 'Dec:', dec);
                        
                        // Update parent about coordinates
                        window.parent.postMessage({
                            type: 'aladinClick',
                            ra: ra,
                            dec: dec
                        }, '*');
                    });
                });
                
                function changeSurvey() {
                    const survey = document.getElementById('survey-select').value;
                    aladin.setImageSurvey(survey);
                    window.parent.postMessage({
                        type: 'surveyChange',
                        survey: survey
                    }, '*');
                }
                
                function gotoObject() {
                    const target = document.getElementById('coord-input').value;
                    if (target) {
                        aladin.gotoObject(target);
                        window.parent.postMessage({
                            type: 'coordinateChange',
                            coordinates: target
                        }, '*');
                    }
                }
                
                function resetView() {
                    aladin.gotoRaDec(266.4, -29.0);
                    aladin.setFov(0.1);
                    document.getElementById('fov-slider').value = 0.1;
                    document.getElementById('fov-value').textContent = '0.1°';
                }
                
                function changeFOV(value) {
                    document.getElementById('fov-value').textContent = value + '°';
                    aladin.setFov(parseFloat(value));
                    window.parent.postMessage({
                        type: 'fovChange',
                        fov: parseFloat(value)
                    }, '*');
                }
                
                function toggleGrid() {
                    const showGrid = document.getElementById('grid-checkbox').checked;
                    aladin.showGrid(showGrid);
                    window.parent.postMessage({
                        type: 'gridToggle',
                        showGrid: showGrid
                    }, '*');
                }
                
                function loadCatalog() {
                    const catalogId = document.getElementById('catalog-select').value;
                    
                    // Remove previous catalog
                    if (currentCatalog) {
                        aladin.removeCatalog(currentCatalog);
                    }
                    
                    if (catalogId) {
                        // Add new catalog
                        currentCatalog = A.catalogFromVizieR(catalogId, aladin.getRaDec(), aladin.getFov(), {
                            onClick: 'showTable',
                            name: catalogId,
                            color: '#00ff00',
                            sourceSize: 8
                        });
                        aladin.addCatalog(currentCatalog);
                    }
                    
                    window.parent.postMessage({
                        type: 'catalogChange',
                        catalog: catalogId
                    }, '*');
                }
                
                // Listen for messages from parent
                window.addEventListener('message', function(event) {
                    if (event.data.type === 'updateCoordinates') {
                        aladin.gotoRaDec(event.data.ra, event.data.dec);
                        document.getElementById('coord-input').value = event.data.ra + ' ' + event.data.dec;
                    }
                });
            </script>
        </body>
        </html>
      `;

      // Create iframe and inject HTML
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '450px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.srcdoc = aladinHtml;
      
      // Clear previous content and add iframe
      viewerRef.current.innerHTML = '';
      viewerRef.current.appendChild(iframe);

      // Listen for messages from iframe
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'aladinClick') {
          console.log('Sky coordinates clicked:', event.data.ra, event.data.dec);
          setCoordinates(`${event.data.ra} ${event.data.dec}`);
        } else if (event.data.type === 'fovChange') {
          setFov(event.data.fov);
        } else if (event.data.type === 'gridToggle') {
          setShowGrid(event.data.showGrid);
        } else if (event.data.type === 'surveyChange') {
          setSurvey(event.data.survey);
        } else if (event.data.type === 'catalogChange') {
          setCatalog(event.data.catalog);
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [coordinates, fov, showGrid, survey]);

  const handleCoordinateUpdate = () => {
    if (viewerRef.current) {
      const iframe = viewerRef.current.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        const [ra, dec] = coordinates.split(' ').map(Number);
        iframe.contentWindow.postMessage({
          type: 'updateCoordinates',
          ra: ra,
          dec: dec
        }, '*');
      }
    }
  };

  return (
    <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Sky Viewer: Pan, zoom and shift+click to set query region</span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300">
              ICRS
            </Button>
            <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300">
              SIN
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* External Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-700/30 rounded-lg">
            <div className="space-y-2">
              <Label className="text-blue-300">Target Coordinates</Label>
              <div className="flex space-x-2">
                <Input
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  placeholder="RA Dec or object name"
                  className="bg-slate-700/50 border-blue-500/30 text-white"
                />
                <Button 
                  size="sm" 
                  onClick={handleCoordinateUpdate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Target className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-300">Field of View</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0.01"
                  max="10"
                  step="0.01"
                  value={fov}
                  onChange={(e) => setFov(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white text-sm w-12">{fov.toFixed(2)}°</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-blue-300">Display Options</Label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-white">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="rounded"
                  />
                  <span>Grid</span>
                </label>
              </div>
            </div>
          </div>

          {/* Aladin Viewer Container */}
          <div 
            ref={viewerRef}
            className="w-full bg-gradient-to-br from-black via-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30 overflow-hidden"
            style={{ minHeight: '450px' }}
          >
            {/* Loading placeholder */}
            <div className="flex items-center justify-center h-full text-blue-300">
              Loading Aladin Sky Viewer...
            </div>
          </div>
          
          {/* Current coordinates display */}
          <div className="flex justify-between items-center text-sm">
            <div className="bg-slate-800/80 backdrop-blur-sm px-3 py-2 rounded text-white font-mono">
              Current: {coordinates}
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm px-3 py-2 rounded text-white font-mono">
              FOV: {fov.toFixed(3)}° × {fov.toFixed(3)}°
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
