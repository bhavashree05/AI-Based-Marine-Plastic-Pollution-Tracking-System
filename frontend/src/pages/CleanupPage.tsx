import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Users,
  Calendar,
  MapPin,
  Trash2,
  Sparkles,
  Download,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  fetchCleanupTasks,
  createCleanupTask,
  updateCleanupTask,
  deleteCleanupTask,
  generatePdfReport
} from '../services/api';
import { CleanupTask } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

export const CleanupPage: React.FC = () => {
  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // New task form state
  const [title, setTitle] = useState<string>('');
  const [lat, setLat] = useState<string>('25.7617');
  const [lng, setLng] = useState<string>('-80.1918');
  const [ocean, setOcean] = useState<string>('Atlantic Ocean');
  const [assignedTeam, setAssignedTeam] = useState<string>('Coastal Cleanup Alpha');
  const [targetDate, setTargetDate] = useState<string>('2026-05-15');
  const [priorityLevel, setPriorityLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchCleanupTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load cleanup tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await updateCleanupTask(taskId, { status: newStatus });
      if (newStatus === 'COMPLETED') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2dd4bf', '#38bdf8', '#34d399', '#f43f5e'],
        });
      }
      await loadTasks();
    } catch (err) {
      console.error('Update status failed:', err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to remove this cleanup task?')) return;
    try {
      await deleteCleanupTask(taskId);
      await loadTasks();
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCleanupTask({
        title,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        ocean,
        assigned_team: assignedTeam,
        target_date: targetDate,
        priority_level: priorityLevel,
        notes: notes.trim() || undefined,
        evidence_summary: 'Prioritized coastal transect requiring volunteer or municipal debris removal.',
      });
      setShowNewModal(false);
      setTitle('');
      await loadTasks();
    } catch (err) {
      console.error('Create cleanup failed:', err);
    }
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const res = await generatePdfReport();
      window.open(res.download_url, '_blank');
    } catch (err) {
      console.error('Report download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'ALL') return true;
    return t.status === activeFilter;
  });

  const plannedCount = tasks.filter((t) => t.status === 'PLANNED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-teal-400" />
            <span>Marine Cleanup Planning & Orchestration</span>
          </h2>
          <p className="text-xs text-slate-400">
            Actionable decision-support dashboard for scheduling, assigning teams, and tracking debris remediation progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>{isDownloading ? 'Compiling PDF...' : 'Export PDF Report'}</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Cleanup Task</span>
          </button>
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveFilter('PLANNED')}
          className={`marine-card p-4 cursor-pointer transition-all ${
            activeFilter === 'PLANNED' ? 'border-sky-500/60 bg-sky-950/30' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Planned Tasks</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{plannedCount}</div>
        </div>

        <div
          onClick={() => setActiveFilter('IN_PROGRESS')}
          className={`marine-card p-4 cursor-pointer transition-all ${
            activeFilter === 'IN_PROGRESS' ? 'border-amber-500/60 bg-amber-950/30' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>In Progress</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{inProgressCount}</div>
        </div>

        <div
          onClick={() => setActiveFilter('COMPLETED')}
          className={`marine-card p-4 cursor-pointer transition-all ${
            activeFilter === 'COMPLETED' ? 'border-emerald-500/60 bg-emerald-950/30' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Completed Cleanups</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{completedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        {['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeFilter === filter
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {filter === 'ALL' ? 'All Operations' : filter.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Cleanup Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="marine-card p-12 text-center text-xs text-slate-500">
            No cleanup operations found for status '{activeFilter}'.
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className="marine-card marine-card-hover p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-white text-sm font-['Outfit']">
                    {t.title}
                  </h4>
                  <SeverityBadge level={t.priority_level} size="sm" />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>{t.latitude.toFixed(2)}°, {t.longitude.toFixed(2)}° ({t.ocean || 'Open Ocean'})</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.assigned_team || 'Unassigned'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Target: {t.target_date || 'TBD'}</span>
                  </span>
                </div>

                {t.evidence_summary && (
                  <p className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
                    <strong>Evidence:</strong> {t.evidence_summary}
                  </p>
                )}
              </div>

              {/* Status Selector & Controls */}
              <div className="flex items-center gap-3 self-end md:self-center">
                <select
                  value={t.status}
                  onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer border ${
                    t.status === 'COMPLETED'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900 border-slate-750 text-slate-200'
                  }`}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <button
                  onClick={() => handleDeleteTask(t.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Advisory Notice */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-sky-400 shrink-0" />
        <span>
          <strong>Operational Guideline:</strong> Cleanup recommendations represent decision-support guidance for prioritizing volunteer sweeps and vessel deployments. Local coastal safety regulations must be observed.
        </span>
      </div>

      {/* New Task Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base font-['Outfit']">
              Plan New Remediation Operation
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Operation Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. South Biscayne Bay Debris Sweep"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Team</label>
                  <input
                    type="text"
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Tier</label>
                <select
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="CRITICAL">Critical Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specific access equipment, drone scout notes, or safety instructions..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors"
                >
                  Schedule Operation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
