import React, { useState, useEffect } from 'react';
import {
  Upload,
  Scan,
  Download,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  MapPin,
  Sparkles,
  Info
} from 'lucide-react';
import {
  detectPlasticsImage,
  fetchSampleImages,
  detectSampleImage,
  convertDetectionToObservation
} from '../services/api';
import { DetectionResponse } from '../types';

export const DetectionPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.35);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sampleImages, setSampleImages] = useState<{ name: string; label: string; url: string }[]>([]);
  
  // Convert to Observation Modal State
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [convertLat, setConvertLat] = useState<string>('24.8607');
  const [convertLng, setConvertLng] = useState<string>('67.0011');
  const [convertOcean, setConvertOcean] = useState<string>('Indian Ocean');
  const [convertSetting, setConvertSetting] = useState<string>('Beach');
  const [convertNotes, setConvertNotes] = useState<string>('');
  const [convertSuccessMsg, setConvertSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async () => {
    const samples = await fetchSampleImages();
    setSampleImages(samples);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setDetectionResult(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validExtensions.includes(file.type)) {
        setErrorMsg('Please upload a valid JPG, JPEG, or PNG image.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRunInference = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const result = await detectPlasticsImage(selectedFile, confidenceThreshold);
      setDetectionResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Computer vision detection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunSample = async (sampleName: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSelectedFile(null);
    setPreviewUrl(`/api/detection/sample-image/${sampleName}`);
    try {
      const result = await detectSampleImage(sampleName, confidenceThreshold);
      setDetectionResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Sample detection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectionResult?.detection_record_id) return;
    try {
      const res = await convertDetectionToObservation({
        detection_id: detectionResult.detection_record_id,
        latitude: parseFloat(convertLat),
        longitude: parseFloat(convertLng),
        ocean: convertOcean,
        marine_setting: convertSetting,
        notes: convertNotes || `Verified AI Detection: ${detectionResult.plastic_count} plastic items detected by YOLOv8n.`,
      });
      setConvertSuccessMsg(res.message);
      setTimeout(() => {
        setShowConvertModal(false);
        setConvertSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to convert to observation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Scan className="w-5 h-5 text-teal-400" />
            <span>AI-Based Marine Plastic Detection (YOLOv8)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automated visual object localization for floating plastic bottles, cups, containers, and shoreline debris.
          </p>
        </div>

        {/* 1-Click Sample Button */}
        {sampleImages.length > 0 && (
          <button
            onClick={() => handleRunSample(sampleImages[0].name)}
            disabled={isProcessing}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500/20 to-sky-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Load & Test Sample Beach Image</span>
          </button>
        )}
      </div>

      {/* Main Grid: Upload & Inference Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload Controls & Configuration */}
        <div className="marine-card p-5 space-y-5">
          <h3 className="font-bold text-white text-sm font-['Outfit'] flex items-center gap-2">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Image Source & Parameters</span>
          </h3>

          {/* Upload Zone */}
          <div className="border-2 border-dashed border-slate-750 hover:border-teal-500/50 rounded-xl p-6 text-center transition-colors bg-slate-950/40">
            <input
              type="file"
              id="plastic-image-input"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="plastic-image-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 hover:text-teal-400 transition-colors">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-200">
                Click to browse or drop photograph
              </div>
              <p className="text-[11px] text-slate-500">
                Supports JPG, JPEG, PNG (Beach, Drone, Vessel cameras)
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-slate-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          {/* Confidence Threshold Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Confidence Threshold</span>
              </span>
              <span className="font-mono text-teal-400 font-bold">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>More detections (10%)</span>
              <span>Strict precision (90%)</span>
            </div>
          </div>

          {/* Run Inference Action */}
          <button
            onClick={handleRunInference}
            disabled={!selectedFile || isProcessing}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Running YOLOv8n Inference...</span>
              </span>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                <span>Run Plastic Detection Model</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Model Specification Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
              <Info className="w-3.5 h-3.5 text-teal-400" />
              <span>Model Architecture & Classes</span>
            </div>
            <p>
              Engine: <strong>YOLOv8n Single-Stage Object Detector</strong>.
            </p>
            <p>
              Waste classes identified: Plastic bottles, disposable cups, cutlery, containers, synthetic packaging, and polymer litter.
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Detection Results & Annotated View */}
        <div className="lg:col-span-2 space-y-5">
          {detectionResult ? (
            <div className="marine-card p-5 space-y-5 animate-fade-in">
              {/* Results Stat Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base font-['Outfit']">
                      Inference Complete ({detectionResult.total_detections} Detections)
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Latency: {detectionResult.inference_time_ms} ms</span>
                      <span>•</span>
                      <span>Resolution: {detectionResult.width}x{detectionResult.height}px</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download Annotated Image */}
                  <a
                    href={detectionResult.annotated_image_url}
                    download={`marineguard_annotated_${detectionResult.image_filename}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Annotated</span>
                  </a>

                  {/* Save as Observation */}
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Save as Observation</span>
                  </button>
                </div>
              </div>

              {/* Categorization Badges Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center">
                  <div className="text-xl font-bold text-rose-400 font-['Outfit']">
                    {detectionResult.plastic_count}
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">Plastic Debris</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-center">
                  <div className="text-xl font-bold text-amber-400 font-['Outfit']">
                    {detectionResult.other_count}
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">Synthetic Debris / Other</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                  <div className="text-xl font-bold text-emerald-400 font-['Outfit']">
                    {detectionResult.organic_count}
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">Marine Context / Fauna</div>
                </div>
              </div>

              {/* Annotated Image Viewer */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center max-h-[460px]">
                <img
                  src={detectionResult.annotated_image_url}
                  alt="Annotated Marine Debris"
                  className="max-h-[460px] w-auto object-contain rounded-lg"
                />
              </div>

              {/* Detected Items Detail Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Detected Objects List ({detectionResult.detections.length})
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Classification Group</th>
                        <th className="p-2.5">Confidence</th>
                        <th className="p-2.5">Bounding Box (px)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {detectionResult.detections.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="p-2.5 font-semibold text-white">{d.mapped_category}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                d.danger_group === 'Plastic Waste'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {d.danger_group}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-teal-400">
                            {(d.confidence * 100).toFixed(1)}%
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-400">
                            [{d.bbox.map((v) => Math.round(v)).join(', ')}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scientific Provenance Disclaimer Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-teal-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Environmental Prediction Disclaimer</span>
                </div>
                <p>{detectionResult.provenance_disclaimer}</p>
              </div>
            </div>
          ) : (
            <div className="marine-card p-12 text-center space-y-3 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500">
                <Scan className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-white text-base font-['Outfit']">
                Awaiting Marine Image Input
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Upload a coastal photograph, beach survey picture, or maritime drone frame to run the real-time YOLOv8 debris detector.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Convert to Observation Modal */}
      {showConvertModal && detectionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base font-['Outfit'] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>Link AI Detection to Geospatial Map</span>
            </h3>

            {convertSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-center text-xs space-y-2">
                <CheckCircle className="w-6 h-6 mx-auto text-emerald-400" />
                <p className="font-semibold">{convertSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleConvertObservation} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={convertLat}
                      onChange={(e) => setConvertLat(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={convertLng}
                      onChange={(e) => setConvertLng(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ocean Basin</label>
                  <select
                    value={convertOcean}
                    onChange={(e) => setConvertOcean(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Atlantic Ocean">Atlantic Ocean</option>
                    <option value="Pacific Ocean">Pacific Ocean</option>
                    <option value="Indian Ocean">Indian Ocean</option>
                    <option value="Coastal / Nearshore">Coastal / Nearshore</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Observation Notes</label>
                  <input
                    type="text"
                    value={convertNotes}
                    onChange={(e) => setConvertNotes(e.target.value)}
                    placeholder="e.g. Field camera captured washed up bottles on sandy cove"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors"
                  >
                    Confirm & Save Observation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
