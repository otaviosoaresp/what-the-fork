import { useState, useEffect } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { useRepositoryStore } from '@/stores/repository'

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'google/gemini-pro', name: 'Gemini Pro' },
  { id: 'x-ai/grok-code-fast-1', name: 'Grok Code Fast' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5' }
]

export function AISettings() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('anthropic/claude-sonnet-4')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [reviewProvider, setReviewProvider] = useState('openrouter')
  const [glmApiKey, setGlmApiKey] = useState('')
  const [glmConfigured, setGlmConfigured] = useState(false)
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [reviewPrompt, setReviewPrompt] = useState('')
  const [baseBranch, setBaseBranch] = useState('main')
  const [isSavingGlm, setIsSavingGlm] = useState(false)
  const [isSavingRepoConfig, setIsSavingRepoConfig] = useState(false)
  const [isResettingPrompt, setIsResettingPrompt] = useState(false)

  const repoPath = useRepositoryStore(state => state.repoPath)

  const loadReviewConfig = async () => {
    const config = await window.electron.review.getConfig()
    setReviewProvider(config.provider)
    setGlmConfigured(config.glmApiKeyConfigured)
    const providers = await window.electron.review.getAvailableProviders()
    setAvailableProviders(providers)
    if (repoPath) {
      const repoConfig = await window.electron.review.getRepoConfig(repoPath)
      setReviewPrompt(repoConfig.reviewPrompt)
      setBaseBranch(repoConfig.baseBranch)
    }
  }

  const handleSaveGlmKey = async () => {
    setIsSavingGlm(true)
    try {
      await window.electron.review.setConfig({ glmApiKey })
      setGlmApiKey('')
      await loadReviewConfig()
    } finally {
      setIsSavingGlm(false)
    }
  }

  const handleProviderChange = async (provider: string) => {
    setReviewProvider(provider)
    await window.electron.review.setConfig({ provider })
  }

  const handleSaveRepoConfig = async () => {
    if (!repoPath) return
    setIsSavingRepoConfig(true)
    try {
      await window.electron.review.setRepoConfig(repoPath, { reviewPrompt, baseBranch })
    } finally {
      setIsSavingRepoConfig(false)
    }
  }

  const handleResetPrompt = async () => {
    if (!repoPath) return
    setIsResettingPrompt(true)
    try {
      await window.electron.review.resetRepoPrompt(repoPath)
      await loadReviewConfig()
    } finally {
      setIsResettingPrompt(false)
    }
  }

  useEffect(() => {
    loadConfig()
    loadReviewConfig()
  }, [repoPath])

  const loadConfig = async () => {
    const config = await window.electron.ai.getConfig()
    setIsConfigured(config.apiKeyConfigured)
    setModel(config.model)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setTestResult(null)
    try {
      await window.electron.ai.setConfig({ apiKey, model })
      setApiKey('')
      await loadConfig()
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    await window.electron.ai.clearConfig()
    setApiKey('')
    setTestResult(null)
    await loadConfig()
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const success = await window.electron.ai.testConnection()
      setTestResult(success ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally {
      setIsTesting(false)
    }
  }

  const handleModelChange = async (newModel: string) => {
    setModel(newModel)
    if (isConfigured) {
      await window.electron.ai.setConfig({ model: newModel })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">OpenRouter API Key</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Get your API key from{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            openrouter.ai/keys
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={isConfigured ? '********' : 'sk-or-...'}
            className="input flex-1"
          />
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || isSaving}
            className="btn btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-success flex items-center gap-1">
              <Check size={12} /> API key configured
            </span>
            <button
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">Model</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Select the AI model to use for generating commit messages
        </p>
        <select
          value={model}
          onChange={e => handleModelChange(e.target.value)}
          className="input w-full"
        >
          {AVAILABLE_MODELS.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-1">Test Connection</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Verify that your API key is working correctly
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={!isConfigured || isTesting}
            className="btn btn-ghost"
          >
            {isTesting ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          {testResult === 'success' && (
            <span className="text-xs text-success flex items-center gap-1">
              <Check size={12} /> Connected
            </span>
          )}
          {testResult === 'error' && (
            <span className="text-xs text-destructive flex items-center gap-1">
              <X size={12} /> Connection failed
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-base font-semibold mb-4">AI Code Review</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Provider</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Select the AI provider for code reviews
            </p>
            <select
              value={reviewProvider}
              onChange={e => handleProviderChange(e.target.value)}
              className="input w-full"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="glm">GLM (BigModel)</option>
              <option
                value="claude-code"
                disabled={!availableProviders.includes('claude-code')}
              >
                Claude Code{!availableProviders.includes('claude-code') && ' (not installed)'}
              </option>
            </select>
          </div>

          {reviewProvider === 'glm' && (
            <div>
              <h3 className="text-sm font-medium mb-1">GLM API Key</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get your API key from{' '}
                <a
                  href="https://bigmodel.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  bigmodel.cn
                </a>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={glmApiKey}
                  onChange={e => setGlmApiKey(e.target.value)}
                  placeholder={glmConfigured ? '********' : 'Enter GLM API key'}
                  className="input flex-1"
                />
                <button
                  onClick={handleSaveGlmKey}
                  disabled={!glmApiKey.trim() || isSavingGlm}
                  className="btn btn-primary"
                >
                  {isSavingGlm ? 'Saving...' : 'Save'}
                </button>
              </div>
              {glmConfigured && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-success flex items-center gap-1">
                    <Check size={12} /> API key configured
                  </span>
                </div>
              )}
            </div>
          )}

          {repoPath && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-1">Base Branch</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  The branch to compare against for reviews
                </p>
                <input
                  type="text"
                  value={baseBranch}
                  onChange={e => setBaseBranch(e.target.value)}
                  placeholder="main"
                  className="input w-full"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Review Prompt</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Custom instructions for the AI reviewer (optional)
                </p>
                <textarea
                  value={reviewPrompt}
                  onChange={e => setReviewPrompt(e.target.value)}
                  placeholder="Additional context or instructions for code reviews..."
                  className="input w-full h-24 resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveRepoConfig}
                  disabled={isSavingRepoConfig}
                  className="btn btn-primary"
                >
                  {isSavingRepoConfig ? 'Saving...' : 'Save Repository Settings'}
                </button>
                <button
                  onClick={handleResetPrompt}
                  disabled={isResettingPrompt}
                  className="btn btn-ghost"
                  title="Reset prompt to default (enables inline comments)"
                >
                  {isResettingPrompt ? 'Resetting...' : 'Reset Prompt'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
