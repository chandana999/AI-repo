'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Settings, Sparkles, Upload, FileText, X, MessageSquare } from 'lucide-react'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface PDFStatus {
  pdf_loaded: boolean
  pdf_name: string | null
  chunks_count: number
  embeddings_available: boolean
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant.')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pdfStatus, setPdfStatus] = useState<PDFStatus>({ pdf_loaded: false, pdf_name: null, chunks_count: 0, embeddings_available: false })
  const [isUploading, setIsUploading] = useState(false)
  const [chatMode, setChatMode] = useState<'regular' | 'rag'>('regular')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function autoResizeTextArea() {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    const maxHeight = 160
    const newHeight = Math.min(element.scrollHeight, maxHeight)
    element.style.height = `${newHeight}px`
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    autoResizeTextArea()
  }, [inputMessage])

  // Check PDF status on component mount
  useEffect(() => {
    checkPdfStatus()
  }, [])

  const getApiUrl = () => {
    // Use local API for development, external API for production
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    // For production, you'll need to replace this with your deployed API URL
    return 'https://your-api-url.railway.app' // Replace with your actual API URL
  }

  const checkPdfStatus = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/pdf-status`)
      if (response.ok) {
        const status = await response.json()
        setPdfStatus(status)
        if (status.pdf_loaded) {
          setChatMode('rag')
        }
      }
    } catch (error) {
      console.error('Error checking PDF status:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !apiKey.trim()) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', apiKey)

    try {
      const response = await fetch(`${getApiUrl()}/api/upload-pdf`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (response.ok) {
        setPdfStatus({
          pdf_loaded: true,
          pdf_name: result.pdf_name,
          chunks_count: result.chunks_count,
          embeddings_available: result.embeddings_available || false
        })
        setChatMode('rag')
        setMessages([]) // Clear previous messages when switching to RAG mode
      } else {
        alert(`Error: ${result.detail || 'Failed to upload PDF'}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload PDF. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const clearPdf = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/clear-pdf`, { method: 'POST' })
      if (response.ok) {
        setPdfStatus({ pdf_loaded: false, pdf_name: null, chunks_count: 0, embeddings_available: false })
        setChatMode('regular')
        setMessages([])
      }
    } catch (error) {
      console.error('Error clearing PDF:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !apiKey.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      let response: Response
      
      if (chatMode === 'rag' && pdfStatus.pdf_loaded) {
        // Use RAG chat endpoint
        response = await fetch(`${getApiUrl()}/api/rag-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_message: inputMessage,
            model: model,
            api_key: apiKey,
            k: 3
          }),
        })
      } else {
        // Use regular chat endpoint
        response = await fetch(`${getApiUrl()}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            developer_message: developerMessage,
            user_message: inputMessage,
            model: model,
            api_key: apiKey
          }),
        })
      }

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      const assistantMessageId = (Date.now() + 1).toString()

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date()
      }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        assistantMessage += chunk

        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: assistantMessage }
            : msg
        ))
      }

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Sorry, there was an error processing your request. Please check your API key and try again.',
        role: 'assistant',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Engineer Challenge</h1>
              <p className="text-sm text-gray-600">
                {chatMode === 'rag' ? 'Chat with PDF using RAG' : 'Chat with OpenAI Models'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle settings panel"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="bg-white border-b border-gray-200 p-4 animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Chat Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chat Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setChatMode('regular')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chatMode === 'regular'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Regular Chat
                </button>
                <button
                  onClick={() => setChatMode('rag')}
                  disabled={!pdfStatus.pdf_loaded}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chatMode === 'rag'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${!pdfStatus.pdf_loaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  PDF RAG Chat
                </button>
              </div>
            </div>

            {/* PDF Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF Upload
              </label>
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={!apiKey.trim()}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!apiKey.trim() || isUploading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload PDF'}
                </button>
                {pdfStatus.pdf_loaded && (
                  <button
                    onClick={clearPdf}
                    className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear PDF
                  </button>
                )}
              </div>
              {pdfStatus.pdf_loaded && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{pdfStatus.pdf_name}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {pdfStatus.chunks_count} text chunks indexed
                    {pdfStatus.embeddings_available ? (
                      <span className="ml-2 text-blue-600">• Vector search enabled</span>
                    ) : (
                      <span className="ml-2 text-amber-600">• Using text search</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="apiKeyInput">
                OpenAI API Key
              </label>
              <input
                id="apiKeyInput"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="input-field"
                aria-label="OpenAI API Key"
                autoComplete="off"
              />
            </div>
            
            {chatMode === 'regular' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="systemMessage">
                  System Message
                </label>
                <textarea
                  id="systemMessage"
                  value={developerMessage}
                  onChange={(e) => setDeveloperMessage(e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                  className="input-field resize-none"
                  rows={3}
                  aria-label="System message"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="modelSelect">
                Model
              </label>
              <select
                id="modelSelect"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="input-field"
                aria-label="Select AI model"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg min-h-[300px] max-h-[70vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-20 select-none">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Welcome to AI Engineer Challenge!</h3>
                {chatMode === 'rag' ? (
                  <div>
                    <p className="text-sm mb-2">Upload a PDF to start chatting with it using RAG.</p>
                    <p className="text-xs text-gray-400">The AI will only answer questions based on the PDF content.</p>
                  </div>
                ) : (
                  <p className="text-sm">Configure your settings and start chatting with AI models.</p>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`chat-message max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 break-words whitespace-pre-wrap">
                        {message.content}
                        <p className="text-xs opacity-70 mt-2 select-none">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <User className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="chat-message max-w-[80%] bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-gray-500" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value)
                  setTimeout(autoResizeTextArea, 0)
                }}
                onKeyPress={handleKeyPress}
                placeholder={chatMode === 'rag' ? "Ask a question about the PDF..." : "Type your message here..."}
                className="input-field resize-none flex-1"
                rows={1}
                disabled={isLoading || !apiKey.trim() || (chatMode === 'rag' && !pdfStatus.pdf_loaded)}
                aria-label="Message input"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || !apiKey.trim() || (chatMode === 'rag' && !pdfStatus.pdf_loaded)}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            {!apiKey.trim() && (
              <p className="text-sm text-red-500 mt-2" role="alert">
                Please enter your OpenAI API key in the settings to start chatting.
              </p>
            )}
            {chatMode === 'rag' && !pdfStatus.pdf_loaded && apiKey.trim() && (
              <p className="text-sm text-amber-600 mt-2" role="alert">
                Please upload a PDF file to start chatting with it.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
