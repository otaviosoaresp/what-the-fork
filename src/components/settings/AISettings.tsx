import { useState, useEffect } from 'react'
import { Check, X, Loader2 } from 'lucide-react'

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'google/gemini-pro', name: 'Gemini Pro' },
  { id: 'x-ai/grok-code-fast-1', name: 'Grok Code Fast' }
]

export function AISettings() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('anthropic/claude-sonnet-4')
  const [isConfigured, setIsConfigured] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

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
    </div>
  )
}
