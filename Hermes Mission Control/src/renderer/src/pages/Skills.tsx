import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Zap, Search, Loader2, AlertCircle, ChevronDown, ChevronUp, Tag,
  Plus, Edit3, Trash2, X, Check, GripVertical, Save
} from 'lucide-react'
import { getSkills, createSkill, updateSkill, deleteSkill, type Skill, type SkillParameter } from '../api/skills'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'
import { toast } from '../hooks/useToast'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Skill card ───────────────────────────────────────────────────────────────

function SkillCard({ skill, onEdit, onDelete }: {
  skill: Skill
  onEdit: (skill: Skill) => void
  onDelete: (id: string) => void
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="group border border-border rounded-xl bg-card overflow-hidden hover:border-border/80 transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center shrink-0 mt-0.5">
          <Zap size={14} className="text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{skill.name}</span>
            {skill.category && (
              <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                {skill.category}
              </span>
            )}
            {skill.enabled === false && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full shrink-0">
                disabled
              </span>
            )}
          </div>
          {skill.description && (
            <p className={cn(
              'text-xs text-muted-foreground mt-1 leading-relaxed',
              !expanded && 'line-clamp-2'
            )}>
              {skill.description}
            </p>
          )}
          {skill.tags && skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {skill.tags.slice(0, expanded ? undefined : 3).map((tag) => (
                <span key={tag} className="flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
              {!expanded && skill.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{skill.tags.length - 3} more</span>
              )}
            </div>
          )}
        </div>

        {/* Edit/Delete actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(skill) }}
            className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit skill"
          >
            <Edit3 size={12} />
          </button>
          {skill.id && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(skill.id!) }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Delete skill"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {skill.description && skill.description.length > 100 && (
          <div className="text-muted-foreground shrink-0">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}
      </button>

      {expanded && skill.parameters && Object.keys(skill.parameters).length > 0 && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Parameters</p>
          <pre className="text-xs text-foreground/70 font-mono bg-background/50 p-3 rounded-lg overflow-x-auto">
            {JSON.stringify(skill.parameters, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Skill builder panel ──────────────────────────────────────────────────────

interface SkillBuilderProps {
  initial?: Skill | null
  onClose: () => void
  onSave: (skill: Skill) => void
  isPending: boolean
}

const PARAM_TYPES = ['string', 'number', 'boolean', 'array', 'object']

function SkillBuilder({ initial, onClose, onSave, isPending }: SkillBuilderProps): JSX.Element {
  const [form, setForm] = useState<Partial<Skill>>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? '',
    tags: initial?.tags ?? [],
    enabled: initial?.enabled ?? true
  })
  const [tagInput, setTagInput] = useState('')
  const [params, setParams] = useState<SkillParameter[]>(
    initial?.parameterList ?? []
  )

  const set = (key: keyof Skill, value: unknown): void =>
    setForm(f => ({ ...f, [key]: value }))

  const addTag = (): void => {
    const t = tagInput.trim()
    if (t && !(form.tags ?? []).includes(t)) {
      set('tags', [...(form.tags ?? []), t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string): void =>
    set('tags', (form.tags ?? []).filter(t => t !== tag))

  const addParam = (): void =>
    setParams(p => [...p, { name: '', type: 'string', description: '', required: false }])

  const updateParam = (i: number, field: keyof SkillParameter, value: string | boolean): void =>
    setParams(p => p.map((param, idx) => idx === i ? { ...param, [field]: value } : param))

  const removeParam = (i: number): void =>
    setParams(p => p.filter((_, idx) => idx !== i))

  const handleSave = (): void => {
    if (!form.name?.trim()) return

    // Convert parameterList → JSON schema-style parameters
    const builtParams: Record<string, unknown> = {}
    for (const p of params) {
      if (!p.name.trim()) continue
      builtParams[p.name] = {
        type: p.type,
        description: p.description,
        required: p.required
      }
    }

    onSave({
      ...initial,
      name: form.name.trim(),
      description: form.description,
      category: form.category,
      tags: form.tags,
      enabled: form.enabled,
      parameters: Object.keys(builtParams).length > 0 ? builtParams : undefined,
      parameterList: params
    })
  }

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-y-0 right-0 w-[420px] bg-card border-l border-border flex flex-col shadow-2xl z-10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Zap size={15} className="text-yellow-400" />
        <span className="text-sm font-medium flex-1">
          {initial ? 'Edit Skill' : 'New Skill'}
        </span>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name *</label>
          <input
            value={form.name ?? ''}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. web_search"
            className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
          <textarea
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value)}
            placeholder="What this skill does..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
          <input
            value={form.category ?? ''}
            onChange={e => set('category', e.target.value)}
            placeholder="e.g. search, code, utility"
            className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Add tag…"
              className="flex-1 px-3 py-1.5 rounded-lg border bg-input border-border text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={addTag}
              className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs hover:bg-secondary/80 transition-colors"
            >
              Add
            </button>
          </div>
          {(form.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(form.tags ?? []).map(tag => (
                <span key={tag} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-foreground">
                    <X size={8} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Enabled</label>
          <button
            onClick={() => set('enabled', !form.enabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.enabled ? 'bg-primary' : 'bg-secondary'
            )}
          >
            <span className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform',
              form.enabled ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
        </div>

        {/* Parameters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">Parameters</label>
            <button
              onClick={addParam}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              <Plus size={10} />
              Add parameter
            </button>
          </div>

          {params.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/50 text-center py-3 border border-dashed border-border rounded-lg">
              No parameters — click "Add parameter" to define inputs
            </p>
          ) : (
            <div className="space-y-2">
              {params.map((param, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-secondary/20">
                  <div className="flex items-center gap-2">
                    <GripVertical size={12} className="text-muted-foreground/40 shrink-0" />
                    <input
                      value={param.name}
                      onChange={e => updateParam(i, 'name', e.target.value)}
                      placeholder="param_name"
                      className="flex-1 px-2 py-1 rounded border bg-input border-border text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <select
                      value={param.type}
                      onChange={e => updateParam(i, 'type', e.target.value)}
                      className="px-2 py-1 rounded border bg-input border-border text-xs text-foreground focus:outline-none"
                    >
                      {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => removeParam(i)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <input
                    value={param.description}
                    onChange={e => updateParam(i, 'description', e.target.value)}
                    placeholder="Description…"
                    className="w-full px-2 py-1 rounded border bg-input border-border text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={e => updateParam(i, 'required', e.target.checked)}
                      className="accent-primary"
                    />
                    Required
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-3 border-t border-border flex items-center gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-3 py-2 rounded-lg border border-border text-xs hover:bg-secondary/50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!form.name?.trim() || isPending}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {initial ? 'Save Changes' : 'Create Skill'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SkillsPage(): JSX.Element {
  const { features, status } = useConnectionStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)

  const { data: skills = [], isLoading, error } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
    enabled: features.skills && status === 'connected',
    staleTime: 300_000
  })

  const createMutation = useMutation({
    mutationFn: (skill: Omit<Skill, 'id'>) => createSkill(skill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      setBuilderOpen(false)
      setEditingSkill(null)
      toast({ title: 'Skill created' })
    },
    onError: () => toast({ title: 'Failed to create skill', variant: 'destructive' })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, skill }: { id: string; skill: Partial<Skill> }) => updateSkill(id, skill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      setBuilderOpen(false)
      setEditingSkill(null)
      toast({ title: 'Skill updated' })
    },
    onError: () => toast({ title: 'Failed to update skill', variant: 'destructive' })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] })
      toast({ title: 'Skill deleted' })
    },
    onError: () => toast({ title: 'Failed to delete skill', variant: 'destructive' })
  })

  const handleSave = (skill: Skill): void => {
    if (editingSkill?.id) {
      updateMutation.mutate({ id: editingSkill.id, skill })
    } else {
      createMutation.mutate(skill)
    }
  }

  const openEdit = (skill: Skill): void => {
    setEditingSkill(skill)
    setBuilderOpen(true)
  }

  const openNew = (): void => {
    setEditingSkill(null)
    setBuilderOpen(true)
  }

  const closeBuilder = (): void => {
    setBuilderOpen(false)
    setEditingSkill(null)
  }

  const categories = ['all', ...Array.from(new Set(skills.map((s) => s.category).filter(Boolean) as string[]))]

  const filtered = skills.filter((skill) => {
    const matchesSearch =
      !search ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      (skill.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchesCategory = category === 'all' || skill.category === category
    return matchesSearch && matchesCategory
  })

  if (!features.skills) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Zap size={40} className="text-muted-foreground mb-3" />
        <h2 className="text-lg font-medium mb-1">Skills Not Available</h2>
        <p className="text-sm text-muted-foreground">
          Your Hermes gateway doesn't expose the skills API.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Zap size={18} className="text-primary" />
        <h1 className="text-base font-medium flex-1">Skills</h1>
        {!isLoading && <span className="text-xs text-muted-foreground">{filtered.length} of {skills.length}</span>}

        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-all"
        >
          <Plus size={12} />
          New Skill
        </button>
      </div>

      {/* Search + filter */}
      <div className="px-6 py-3 border-b border-border flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {categories.length > 1 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-input border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All categories' : cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={24} className="text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load skills</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Zap size={32} className="text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'No skills match your search' : 'No skills available'}
            </p>
            {!search && (
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                Create your first skill
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((skill, i) => (
              <SkillCard
                key={skill.id ?? skill.name ?? i}
                skill={skill}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Skill builder slide-in panel */}
      <AnimatePresence>
        {builderOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10"
              onClick={closeBuilder}
            />
            <SkillBuilder
              initial={editingSkill}
              onClose={closeBuilder}
              onSave={handleSave}
              isPending={createMutation.isPending || updateMutation.isPending}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
