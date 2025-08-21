import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Engineer Challenge - Chat Interface',
  description: 'A modern chat interface for interacting with OpenAI models',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 p-4">
          <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
