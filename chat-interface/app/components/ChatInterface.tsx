"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import remarkGfm from "remark-gfm"

interface Message {
  role: "user" | "assistant"
  content: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Your Company Name"

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/health`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("API health check response:", data)

        setIsConnected(true)
        setConnectionError(null)
      } catch (error) {
        console.error("API connection error:", error)
        setIsConnected(false)
        setConnectionError(error instanceof Error ? error.message : String(error))
      }
    }

    checkConnection()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleStream = async (response: Response) => {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const assistantMessage: Message = { role: "assistant", content: "" }

    if (!reader) {
      throw new Error("No reader available")
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim()

            if (data === "[DONE]") {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              assistantMessage.content += parsed.content
              setMessages((prev) => {
                const newMessages = [...prev]
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
                  newMessages[newMessages.length - 1] = { ...assistantMessage }
                } else {
                  newMessages.push({ ...assistantMessage })
                }
                return newMessages
              })
            } catch (e) {
              console.error("Error parsing JSON:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error reading stream:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || !isConnected) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    const messageToSend = input
    setInput("")

    try {
      const response = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageToSend }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      await handleStream(response)
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 text-red-500 mx-auto mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-4">Unable to connect to the API. Please check if the server is running.</p>
          {connectionError && <p className="text-red-500 mt-2 text-sm bg-red-50 p-3 rounded-md">{connectionError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="bg-indigo-700 shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8 text-white mr-3" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
              />
            </svg>
            <h1 className="text-2xl font-semibold text-white">AI Chat Assistant</h1>
          </div>
          <div className="text-white text-lg font-medium">{COMPANY_NAME}</div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col w-full mx-auto px-4 py-6">
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg shadow-md">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-2xl">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-16 w-16 text-indigo-400 mx-auto mb-2" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                    />
                  </svg>
                  <h2 className="text-2xl font-semibold text-gray-800">Welcome to {COMPANY_NAME}'s AI Chat Assistant</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Start a conversation by typing a message below. You can ask questions, 
                    request information, or process client/patient IDs.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 max-w-none mx-auto w-4/5">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex ${message.role === "assistant" ? "bg-gray-50" : "bg-white"} rounded-lg p-4`}
                  >
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                      ${message.role === "assistant" ? "bg-indigo-600" : "bg-blue-600"}`}
                    >
                      {message.role === "assistant" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 01-.659 1.591L9.5 14.5m3.25-11.396c.251.023.501.05.75.082m-1.5-.082a24.301 24.301 0 00-4.5 0m0 0v5.714a2.25 2.25 0 01-.659 1.591L5 14.5m0 0l-1.093 1.093M9.5 14.5l-1.093 1.093M5 14.5l-1.093 1.093a2.25 2.25 0 01-1.591.659H1.5m8 0h2.25a2.25 2.25 0 01 1.591.659l1.093 1.093m-4.5 0l1.093 1.093a2.25 2.25 0 001.591.659H13.5m-9 0h2.25m9 0h2.25"
                          />
                        </svg>
                      ) : (
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <path d="M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                          <path d="M12 11V9.5" />
                          <path d="M12 14v-.5" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className={`text-sm font-medium mb-1 ${message.role === "assistant" ? "text-indigo-600" : "text-blue-600"}`}>
                        {message.role === "assistant" ? `AI Assistant` : ""}
                      </div>
                      <ReactMarkdown
                        className="prose max-w-none text-sm text-gray-700"
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            // Only use syntax highlighting for explicitly specified languages
                            // that are not JSON
                            return !inline && match && match[1] !== 'json' ? (
                              <div className="rounded-md overflow-hidden my-3">
                                <SyntaxHighlighter 
                                  style={atomDark} 
                                  language={match[1]} 
                                  PreTag="div"
                                  customStyle={{borderRadius: '0.375rem'}}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-sm" {...props}>
                                {children}
                              </code>
                            )
                          },
                          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mt-5 mb-2 text-gray-800">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mt-4 mb-2 text-gray-800">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-bold mt-3 mb-2 text-gray-800">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-6 mt-2 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-6 mt-2 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-indigo-200 pl-4 italic my-3 text-gray-600">{children}</blockquote>
                          ),
                          a: ({ children, href }) => <a className="text-indigo-600 hover:text-indigo-800 underline transition-colors" href={href}>{children}</a>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-3">
                              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
                          tr: ({ children }) => <tr>{children}</tr>,
                          th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>,
                          td: ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <form onSubmit={handleSubmit} className="flex space-x-3 max-w-5xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 p-3 rounded-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors duration-200 text-sm shadow-sm"
                disabled={!isConnected}
              />
              <button
                type="submit"
                className={`px-5 py-3 rounded-full shadow-sm transition-colors duration-200 font-medium text-sm flex items-center justify-center min-w-[100px]
                ${!input.trim() || isLoading || !isConnected 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                disabled={!input.trim() || isLoading || !isConnected}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : "Send"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-gray-500 text-xs">
        <p>&copy; 2025 {COMPANY_NAME}. All rights reserved.</p>
      </footer>
      <style jsx>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <style jsx global>{`
        html, body {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #4b5563;
          background-color: #f9fafb;
        }
        .prose {
          max-width: none;
          font-size: 0.925rem;
          line-height: 1.6;
        }
        .prose a {
          color: #4f46e5;
          text-decoration: underline;
        }
        .prose a:hover {
          color: #4338ca;
        }
        .prose strong {
          color: #1f2937;
          font-weight: 600;
        }
        .prose ol > li::before {
          color: #6b7280;
        }
        .prose ul > li::before {
          background-color: #9ca3af;
        }
        .prose hr {
          border-color: #e5e7eb;
        }
        .prose blockquote {
          color: #4b5563;
          border-left-color: #e5e7eb;
          font-style: italic;
        }
        .prose thead {
          color: #1f2937;
          font-weight: 600;
          border-bottom-color: #e5e7eb;
        }
        .prose tbody tr {
          border-bottom-color: #e5e7eb;
        }
        .prose > * + * {
          margin-top: 0.75em;
        }
        .prose > * + h1, .prose > * + h2, .prose > * + h3 {
          margin-top: 1.3em;
        }
        .prose p {
          margin-bottom: 0.75em;
        }
        .prose ul, .prose ol {
          margin-top: 0.5em;
          margin-bottom: 0.75em;
        }
        .prose li {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .prose img {
          border-radius: 0.375rem;
          max-width: 100%;
        }
        .prose figure {
          margin: 1.25em 0;
        }
        .prose figcaption {
          color: #6b7280;
          font-size: 0.875em;
          text-align: center;
          margin-top: 0.5em;
        }
      `}</style>
    </div>
  )
}

export default ChatInterface