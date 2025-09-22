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
    // Use environment variable for production, localhost for development
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    // Fallback to localhost for development
    return 'http://localhost:8000'
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

    // Validate file before upload
    if (file.size === 0) {
      alert('Error: The selected file is empty. Please choose a different PDF file.')
      return
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('Error: File is too large. Please choose a PDF file smaller than 50MB.')
      return
    }
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Error: Please select a PDF file.')
      return
    }

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
        // Show more detailed error message
        const errorMessage = result.detail || 'Failed to upload PDF'
        alert(`PDF Upload Error: ${errorMessage}`)
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

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question)
    // Auto-send the question after a brief delay
    setTimeout(() => {
      handleSendMessage()
    }, 100)
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
            message: inputMessage,
            model: model,
            api_key: apiKey
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
            message: inputMessage,
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">ClearVitals</h1>
              <p className="text-sm text-gray-500 font-medium">
                {chatMode === 'rag' ? 'Medical Lab Report Analysis' : 'AI Medical Assistant'}
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
          <div className="max-w-6xl mx-auto space-y-4">
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
                  Medical Chat
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
                  Lab Report Analysis
                </button>
              </div>
            </div>

            {/* PDF Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Lab Report Upload
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
                  {isUploading ? 'Uploading...' : 'Upload Lab Report'}
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

      <div className="flex-1 w-full px-4 py-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 min-h-[500px] max-h-[90vh] flex flex-col">
          {/* Quick Questions Section - Always at Top */}
          {chatMode === 'rag' && pdfStatus.pdf_loaded && (
            <div className="p-4 border-b border-gray-100 bg-blue-50/50">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Quick Questions - Click to Ask:</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "What are my abnormal values?",
                  "Explain my liver function tests", 
                  "Do I have diabetes indicators?",
                  "What should I discuss with my doctor?",
                  "Are my kidney tests concerning?",
                  "What are my cholesterol levels?"
                ].map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(question)}
                    className="px-3 py-1.5 rounded-full border border-blue-300 text-sm text-blue-700 bg-white hover:bg-blue-100 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center mt-16 select-none">
                <Bot className="w-16 h-16 mx-auto mb-8 text-blue-200" />
                <h3 className="text-3xl font-semibold mb-6 text-gray-800 tracking-tight">Welcome to ClearVitals</h3>
                {chatMode === 'rag' ? (
                  <div className="max-w-2xl mx-auto">
                    <p className="text-lg mb-4 text-gray-600 font-medium">Upload your medical lab report for instant AI-powered analysis</p>
                    <p className="text-base text-gray-500">Get personalized health insights and understand your lab results</p>
                  </div>
                ) : (
                  <p className="text-lg text-gray-600 font-medium">AI-powered medical assistant for health insights and analysis</p>
                )}
                
                {/* Quick Questions for RAG Mode */}
                {chatMode === 'rag' && pdfStatus.pdf_loaded && (
                  <div className="mt-12 p-6 bg-blue-50/80 rounded-2xl border border-blue-100 shadow-sm">
                    <h4 className="text-base font-semibold text-blue-900 mb-4">Quick Questions - Click to Ask:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => handleQuickQuestion("What are my abnormal lab values?")}
                        className="text-left p-3 text-sm bg-white rounded-xl border border-blue-200 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        🔍 What are my abnormal values?
                      </button>
                      <button
                        onClick={() => handleQuickQuestion("Explain my liver function tests")}
                        className="text-left p-3 text-sm bg-white rounded-xl border border-blue-200 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        🫀 Explain my liver function tests
                      </button>
                      <button
                        onClick={() => handleQuickQuestion("Do I have any diabetes indicators?")}
                        className="text-left p-3 text-sm bg-white rounded-xl border border-blue-200 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        🩸 Do I have diabetes indicators?
                      </button>
                      <button
                        onClick={() => handleQuickQuestion("What should I discuss with my doctor?")}
                        className="text-left p-3 text-sm bg-white rounded-xl border border-blue-200 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        👨‍⚕️ What should I discuss with my doctor?
                      </button>
                      <button
                        onClick={() => handleQuickQuestion("Are my kidney function tests concerning?")}
                        className="text-left p-3 text-sm bg-white rounded-xl border border-blue-200 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        🫘 Are my kidney tests concerning?
                      </button>
                      <button
                        onClick={() => handleQuickQuestion("What are my cholesterol levels?")}
                        className="text-left p-3 text-sm bg-white rounded-xl border border-blue-200 hover:bg-blue-100 hover:shadow-sm transition-all duration-200 font-medium"
                      >
                        ❤️ What are my cholesterol levels?
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-5 py-4 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto'
                        : 'bg-gray-50 text-gray-800 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 break-words whitespace-pre-wrap text-base leading-relaxed">
                        {message.content}
                        <p className="text-xs opacity-60 mt-3 select-none font-medium">
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
            
            {/* Quick Questions for RAG Mode - Always visible when PDF is loaded */}
            {chatMode === 'rag' && pdfStatus.pdf_loaded && messages.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-xs font-semibold text-blue-800 mb-2">Quick Questions:</h4>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleQuickQuestion("What are my abnormal lab values?")}
                    className="text-xs px-2 py-1 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    🔍 Abnormal values
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("Explain my liver function tests")}
                    className="text-xs px-2 py-1 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    🫀 Liver function
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("Do I have any diabetes indicators?")}
                    className="text-xs px-2 py-1 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    🩸 Diabetes
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("What should I discuss with my doctor?")}
                    className="text-xs px-2 py-1 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    👨‍⚕️ Doctor discussion
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("Are my kidney function tests concerning?")}
                    className="text-xs px-2 py-1 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    🫘 Kidney function
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("What are my cholesterol levels?")}
                    className="text-xs px-2 py-1 bg-white rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    ❤️ Cholesterol
                  </button>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-6">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value)
                  setTimeout(autoResizeTextArea, 0)
                }}
                onKeyPress={handleKeyPress}
                placeholder={chatMode === 'rag' ? "Ask about your lab results..." : "Ask a medical question..."}
                className="resize-none flex-1 text-base py-4 px-5 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm"
                rows={2}
                disabled={isLoading || !apiKey.trim() || (chatMode === 'rag' && !pdfStatus.pdf_loaded)}
                aria-label="Message input"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || !apiKey.trim() || (chatMode === 'rag' && !pdfStatus.pdf_loaded)}
                className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-2xl text-white font-medium shadow-sm transition-all duration-200"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
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
