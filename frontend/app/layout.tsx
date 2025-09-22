import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClearVitals - Medical Lab Report Analysis',
  description: 'AI-powered medical lab report analysis and health insights. Upload your lab results for instant, personalized health analysis.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800">
          <div className="w-full h-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
