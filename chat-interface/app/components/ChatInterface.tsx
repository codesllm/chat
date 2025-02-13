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
  }, [messagesEndRef])

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
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-700">Unable to connect to the API. Please check if the server is running.</p>
          {connectionError && <p className="text-red-500 mt-2">Error details: {connectionError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-md py-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">ChatGPT Clone</h1>
      </header>

      <main className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-6xl m-4 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-0">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-gray-800">Welcome to ChatGPT Clone</h2>
                  <p className="text-gray-600">Start a conversation by typing a message below.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div key={index} className="flex p-4 rounded-lg bg-gray-100 shadow-md">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-500">
                      {message.role === "assistant" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 2H7a2 2 0 00-2 2v2M15 2h2a2 2 0 012 2v2M2 9h2M20 9h2M2 15h2M20 15h2M9 22H7a2 2 0 01-2-2v-2M15 22h2a2 2 0 002-2v-2"
                          />
                          <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth={2} fill="none" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.121 17.804A7.969 7.969 0 0112 15c2.2 0 4.2.84 5.879 2.204M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <ReactMarkdown
                        className="prose max-w-none text-sm whitespace-pre-wrap"
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            return !inline && match ? (
                              <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" {...props}>
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          },
                          p: ({ children }) => <p className="mb-1 whitespace-pre-wrap">{children}</p>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mt-3 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-bold mt-2 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mt-0.5 mb-1 space-y-0.5">{children}</ul>,
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 mt-0.5 mb-1 space-y-0.5">{children}</ol>
                          ),
                          li: ({ children }) => <li className="mb-0">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-1">{children}</blockquote>
                          ),
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

          <div className="p-4">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none transition-colors duration-200 text-sm"
                disabled={!isConnected}
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-500 text-white rounded-lg text-sm"
                disabled={!input.trim() || isLoading || !isConnected}
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <style jsx>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }

        /* Hide scrollbar for IE, Edge and Firefox */
        .overflow-y-auto {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      <style jsx global>{`
        html, body {
          font-size: 14px;
        }
        .prose {
          max-width: 75ch;
          color: inherit;
        }
        .prose a {
          color: #3b82f6;
        }
        .prose a:hover {
          color: #2563eb;
        }
        .prose strong {
          color: inherit;
          font-weight: 600;
        }
        .prose ol > li::before {
          color: inherit;
        }
        .prose ul > li::before {
          background-color: currentColor;
        }
        .prose hr {
          border-color: currentColor;
          opacity: 0.3;
        }
        .prose blockquote {
          border-left-color: currentColor;
          opacity: 0.8;
        }
        .prose thead {
          color: inherit;
          border-bottom-color: currentColor;
        }
        .prose tbody tr {
          border-bottom-color: currentColor;
          opacity: 0.8;
        }
        .prose > * + * {
          margin-top: 0.25em;
        }
        .prose > * + h1, .prose > * + h2, .prose > * + h3 {
          margin-top: 0.5em;
        }
        .prose ul, .prose ol {
          margin-top: 0.125em;
          margin-bottom: 0.125em;
        }
        .prose li {
          margin-top: 0;
          margin-bottom: 0.125em;
        }
      `}</style>
    </div>
  )
}

export default ChatInterface

