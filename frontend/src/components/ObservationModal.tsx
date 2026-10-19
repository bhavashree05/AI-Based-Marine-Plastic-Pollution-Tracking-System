import React, { useState } from 'react';
import { X, Check, AlertCircle, MapPin, Compass } from 'lucide-react';
import { createObservation } from '../services/api';

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCoords?: { lat: number; lng: number };
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCoords,
}) => {
  const [lat, setLat] = useState<string>(initialCoords ? String(initialCoords.lat) : '');
  const [lng, setLng] = useState<string>(initialCoords ? String(initialCoords.lng) : '');
  const [ocean, setOcean] = useState<string>('Atlantic Ocean');
  const [region, setRegion] = useState<string>('');
  const [marineSetting, setMarineSetting] = useState<string>('Beach-Nurdle Patrol');
  const [concentrationClass, setConcentrationClass] = useState<string>('High');
  const [measurement, setMeasurement] = useState<string>('');
  const [organization, setOrganization] = useState<string>('MarineGuard Field Observer');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMsg('Latitude must be a valid number between -90.0 and 90.0');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setErrorMsg('Longitude must be a valid number between -180.0 and 180.0');
      return;
    }

    setIsSubmitting(true);
    try {
      await createObservation({
        latitude: latNum,
        longitude: lngNum,
        ocean,
        region: region.trim() || undefined,
        marine_setting: marineSetting,
        concentration_class: concentrationClass,
        measurement: measurement ? parseFloat(measurement) : undefined,
        organization: organization.trim() || undefined,
        notes: notes.trim() || undefined,
        source_type: 'USER_UPLOAD',
        verified_status: 'USER_SUBMITTED',
      });
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to record observation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base font-['Outfit']">Record Field Observation</h2>
              <p className="text-xs text-slate-400">Log verified coastal or marine plastic evidence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Coordinates Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Latitude <span className="text-teal-400">*</span> (-90 to +90)
              </label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 25.7617"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Longitude <span className="text-teal-400">*</span> (-180 to +180)
              </label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. -80.1918"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Ocean & Region */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Ocean Basin</label>
              <select
                value={ocean}
                onChange={(e) => setOcean(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Atlantic Ocean">Atlantic Ocean</option>
                <option value="Pacific Ocean">Pacific Ocean</option>
                <option value="Indian Ocean">Indian Ocean</option>
                <option value="Arctic Ocean">Arctic Ocean</option>
                <option value="Southern Ocean">Southern Ocean</option>
                <option value="Coastal / Nearshore">Coastal / Nearshore</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Region / Sector</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Florida Gulf Coast"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Marine Setting & Concentration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Marine Setting</label>
              <select
                value={marineSetting}
                onChange={(e) => setMarineSetting(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Beach-Nurdle Patrol">Beach-Nurdle Patrol</option>
                <option value="Ocean water">Ocean water (Pelagic)</option>
                <option value="Ocean sediment">Ocean sediment (Benthic)</option>
                <option value="Beach">Beach / Shoreline</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Concentration Class</label>
              <select
                value={concentrationClass}
                onChange={(e) => setConcentrationClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Very Low">Very Low (&lt;1 pcs/m³)</option>
                <option value="Low">Low (1-5 pcs/m³)</option>
                <option value="Medium">Medium (5-25 pcs/m³)</option>
                <option value="High">High (25-100 pcs/m³)</option>
                <option value="Very High">Very High (&gt;100 pcs/m³)</option>
              </select>
            </div>
          </div>

          {/* Quantitative Measurement & Organization */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity (pieces/m³)</label>
              <input
                type="number"
                step="any"
                value={measurement}
                onChange={(e) => setMeasurement(e.target.value)}
                placeholder="e.g. 42.5"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Observer / Org</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Field Observation Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High density of plastic bottle caps and nurdle pellets along high tide mark..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Transparency note */}
          <p className="text-[11px] text-slate-400 italic">
            Note: User observations are saved under provenance label "USER_SUBMITTED" and automatically scored using the transparent severity engine.
          </p>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Submit Observation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
