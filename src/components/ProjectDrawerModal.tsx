import React, { useState } from 'react';
import { Plus, History, Clock, FileText, ChevronRight, X, Trash2, Edit3, Check } from 'lucide-react';
import type { ProjectSession } from '../types';

interface ProjectDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  projects: ProjectSession[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onRenameProject: (projectId: string, newCustomName: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectDrawerModal: React.FC<ProjectDrawerModalProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  projects,
  onSelectProject,
  onNewProject,
  onRenameProject,
  onDeleteProject,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const startRename = (p: ProjectSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditingName(p.customName || '');
  };

  const confirmRename = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRenameProject(projectId, editingName.trim());
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-sm animate-fadeIn justify-end">
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content */}
      <div className="w-full max-w-xs bg-[#111827] border-l border-gray-800 h-full flex flex-col text-gray-100 shadow-2xl animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">翻译项目</h3>
              <p className="text-[10px] text-gray-400">历史项目与会话管理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: Create New Project Button */}
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>开启新翻译项目</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
              <p>暂无历史翻译项目</p>
            </div>
          ) : (
            projects.map((p) => {
              const isCurrent = p.id === currentProjectId;
              const isEditing = editingId === p.id;
              const dateStr = new Date(p.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
              const timeStr = new Date(p.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectProject(p.id);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-gray-900/60 border-gray-800/80 text-gray-300 hover:bg-gray-800/60 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1 my-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            placeholder="自定义项目名称..."
                            className="w-full px-2 py-1 bg-gray-950 border border-emerald-500 rounded text-xs text-white outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmRename(p.id, e as any);
                            }}
                          />
                          <button
                            onClick={(e) => confirmRename(p.id, e)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white truncate">
                            {p.title}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                              进行中
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {dateStr} {timeStr}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-gray-300">
                          <FileText className="w-2.5 h-2.5" />
                          {p.messages.length} 句
                        </span>
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => startRename(p, e)}
                          className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
                          title="修改自定义项目名称"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {projects.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定删除项目“${p.title}”吗？`)) {
                                onDeleteProject(p.id);
                              }
                            }}
                            className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                            title="删除项目"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer info */}
        <div className="p-3 border-t border-gray-800 text-[10px] text-gray-500 text-center">
          所有项目均已在云端加密存储同步
        </div>
      </div>
    </div>
  );
};
