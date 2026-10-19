import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Cpu,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Sparkles
} from 'lucide-react';

export const AboutVivaPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const vivaQuestions = [
    {
      q: "1. Why did you choose YOLOv8 over two-stage detectors like Faster R-CNN?",
      a: "YOLO (You Only Look Once) is a single-stage convolutional/CSPDarknet detector that predicts bounding boxes and class probabilities directly from full images in a single forward pass. It achieves high frame rates (30-60+ FPS on edge hardware / drones) with high mean Average Precision (mAP), whereas Faster R-CNN relies on a separate Region Proposal Network (RPN) that increases latency 3-5x without significant gain on macro-plastic floatables."
    },
    {
      q: "2. How does DBSCAN clustering work on geographical coordinates, and why not K-Means?",
      a: "K-Means assumes spherical, equally-sized clusters and requires pre-specifying 'K' (which is unknown in marine pollution). DBSCAN (Density-Based Spatial Clustering of Applications with Noise) discovers arbitrary density shapes and labels isolated points as noise (-1). We use the Haversine trigonometric metric on radians (coords_rad) so distances account for the Earth's spherical curvature (R = 6371 km) rather than planar Euclidean geometry."
    },
    {
      q: "3. What is the difference between macroplastics and microplastics in this application?",
      a: "Macroplastics (>2 cm) like discarded bottles, cups, containers, and packaging are visually detectable via standard RGB optical cameras using computer vision. Microplastics (<5 mm) like nurdles and fragmented polymers are invisible to standard drone/phone cameras and require laboratory FTIR/Raman spectroscopy. MarineGuard AI tracks real macro debris via YOLO and integrates empirical NOAA laboratory nurdle survey datasets for microplastics."
    },
    {
      q: "4. How is the transparent Severity Score calculated?",
      a: "The Severity Score is a multi-criteria index (0-100 pts) divided into 4 components: (1) Concentration magnitude (0-40 pts), (2) Marine Setting & Ecological Sensitivity (Beach/Nurdle vs Pelagic: 0-25 pts), (3) Visual Plastic Density from YOLO (0-20 pts), and (4) Temporal Recency & Repetition (0-15 pts). It is categorized into LOW (<25), MEDIUM (25-50), HIGH (50-75), and CRITICAL (>75)."
    },
    {
      q: "5. What are the key evaluation metrics for object detection?",
      a: "Key metrics include Precision (True Positives / All Predictions), Recall (True Positives / All Ground Truth objects), F1-Score (harmonic mean of Precision and Recall), Intersection over Union (IoU threshold, typically 0.5), and mean Average Precision (mAP@0.5 and mAP@0.5:0.95), alongside inference latency in milliseconds."
    },
    {
      q: "6. How is data provenance and transparency maintained?",
      a: "Every observation in the database has an explicit 'source_type' ('NOAA_DATASET', 'USER_UPLOAD', or 'AI_DETECTION') and 'verified_status' ('VERIFIED_SCIENTIFIC', 'USER_SUBMITTED', 'AI_PREDICTION'). Predictions from computer vision are never falsified as lab-verified measurements."
    },
    {
      q: "7. Why did you use FastAPI for the backend instead of standard Flask or Django?",
      a: "FastAPI offers asynchronous ASGI request handling, high throughput matching Node.js/Go, automatic data validation via Pydantic v2 schemas, interactive Swagger UI documentation at /docs, and native support for background tasks and file streaming."
    },
    {
      q: "8. How can this application scale from SQLite to PostgreSQL?",
      a: "The data access layer uses standard SQL queries with indexed coordinate queries (latitude, longitude) and parameterized prepared statements. Migrating to PostgreSQL only requires updating the DATABASE_URL environment variable and using asyncpg / psycopg2 with PostGIS for advanced spatial geometry."
    },
    {
      q: "9. How does the cleanup recommendation module assist operational teams?",
      a: "The module prioritizes intervention by combining hotspot density with ecological vulnerability (e.g. coastal breeding zones vs open water), allowing cleanup directors to assign teams, set target remediation deadlines, and monitor real-time completion status."
    },
    {
      q: "10. What are the recognized limitations and future enhancements of this system?",
      a: "Current limitations include visual camera dependence on good daytime lighting and surface visibility. Future enhancements include multi-spectral satellite imagery integration (Sentinel-2 NDVI/FDI plastic indices), ocean current drift simulation using Lagrangian particle tracking, and underwater autonomous drone ROV integration."
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
          <GraduationCap className="w-4 h-4" />
          <span>B.Tech College Project & Academic Defense Guide</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
          MarineGuard AI – System Architecture & Viva Guide
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Comprehensive project report summary, mathematical methodologies, algorithm explanations, and viva examiner Q&A.
        </p>
      </div>

      {/* Abstract & Objectives */}
      <div className="marine-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <span>1. Project Abstract & Objectives</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Marine plastic pollution poses an existential hazard to oceanic biodiversity, coral ecosystems, and coastal economies. <strong>MarineGuard AI</strong> is a full-stack, AI-driven monitoring and decision-support system that unifies single-stage computer vision debris detection (YOLOv8), geospatial clustering (DBSCAN with Haversine spherical metrics), and transparent multi-attribute severity modeling. The system analyzes real-world survey datasets (such as NOAA NCEI marine microplastics with 22,530+ observations) and empowers coastal cleanup authorities to prioritize high-risk sectors with documented empirical evidence.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <h4 className="text-xs font-bold text-teal-400">Core Objectives</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Deploy real-time object detection for macroscopic floating debris.</li>
              <li>Perform density clustering using spherical great-circle distance.</li>
              <li>Provide transparent, auditable severity score attribution.</li>
              <li>Orchestrate targeted shoreline remediation and team assignments.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
            <h4 className="text-xs font-bold text-sky-400">Proposed System Advantages</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Replaces manual visual estimations with automated neural inference.</li>
              <li>Differentiates between verified scientific data and model inferences.</li>
              <li>Eliminates arbitrary synthetic severity metrics with clear formulas.</li>
              <li>Enables 1-click executive PDF report generation for stakeholders.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Visual System Architecture Diagram */}
      <div className="marine-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
          <Workflow className="w-5 h-5 text-teal-400" />
          <span>2. System Architecture & End-to-End Pipeline</span>
        </h3>
        
        {/* Architecture Blocks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Layer 1 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/30 space-y-2">
            <div className="font-bold text-teal-400 font-mono text-[11px] uppercase tracking-wider">
              Layer 1: Ingestion
            </div>
            <div className="font-semibold text-white">Data & Image Feeds</div>
            <p className="text-[11px] text-slate-400">
              NOAA NCEI Microplastics (22.5k rows), Field Camera Uploads (JPG/PNG), Drone Survey Frames.
            </p>
          </div>

          {/* Layer 2 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-sky-500/30 space-y-2">
            <div className="font-bold text-sky-400 font-mono text-[11px] uppercase tracking-wider">
              Layer 2: AI / ML Core
            </div>
            <div className="font-semibold text-white">YOLOv8 + DBSCAN</div>
            <p className="text-[11px] text-slate-400">
              Single-stage CSPDarknet inference for plastic containers & cutlery; Haversine DBSCAN spatial clustering.
            </p>
          </div>

          {/* Layer 3 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2">
            <div className="font-bold text-indigo-400 font-mono text-[11px] uppercase tracking-wider">
              Layer 3: Processing
            </div>
            <div className="font-semibold text-white">FastAPI + SQLite</div>
            <p className="text-[11px] text-slate-400">
              Transparent multi-criteria severity engine, report generator, coordinate indexers, and REST APIs.
            </p>
          </div>

          {/* Layer 4 */}
          <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 space-y-2">
            <div className="font-bold text-rose-400 font-mono text-[11px] uppercase tracking-wider">
              Layer 4: UI/UX
            </div>
            <div className="font-semibold text-white">React + Leaflet + Vite</div>
            <p className="text-[11px] text-slate-400">
              Interactive Leaflet dark map, Recharts data analytics, cleanup kanban board, and alert triage.
            </p>
          </div>
        </div>
      </div>

      {/* Algorithms Explanation */}
      <div className="marine-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <span>3. Mathematical & Algorithmic Methodologies</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <h4 className="font-bold text-teal-400">A. Great-Circle Haversine Formula for DBSCAN</h4>
            <p className="font-mono text-[11px] text-slate-400">
              d = 2R · arcsin(√(sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)))
            </p>
            <p className="text-[11px] text-slate-400">
              Where R = 6,371 km, φ = latitude in radians, and λ = longitude in radians. This ensures distance between ocean survey stations accurately reflects curvature on the global geoid.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <h4 className="font-bold text-sky-400">B. Multi-Criteria Environmental Severity Model</h4>
            <p className="font-mono text-[11px] text-slate-400">
              Severity = C_conc (40 pts) + S_habitat (25 pts) + D_visual (20 pts) + R_temporal (15 pts)
            </p>
            <p className="text-[11px] text-slate-400">
              Explicitly breaks down the final score into biological ingestion hazard, shoreline recreation vulnerability, and recency of verified field evidence.
            </p>
          </div>
        </div>
      </div>

      {/* Top 10 B.Tech Viva Questions Accordion */}
      <div className="marine-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-400" />
            <span>4. Viva Voce Cheat Sheet (Examiner Q&A)</span>
          </h3>
          <span className="text-xs font-mono text-teal-400">10 High-Yield Questions</span>
        </div>

        <div className="space-y-2">
          {vivaQuestions.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 transition-colors"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-semibold text-white hover:text-teal-300 transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-teal-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-3.5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                    <p className="pt-2">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
