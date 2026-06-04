"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { FlaskConical } from "lucide-react"

export default function RootPage() {
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    api.conversations
      .list()
      .then((convs) => {
        if (convs.length > 0) {
          router.replace(`/chat/${convs[0].id}`)
        } else {
          return api.conversations.create().then((conv) => {
            router.replace(`/chat/${conv.id}`)
          })
        }
      })
      .catch(() => setError(true))
  }, [router])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-4 max-w-sm px-4">
          <FlaskConical className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-slate-200">
            Cannot reach backend
          </h2>
          <p className="text-sm text-slate-500">
            Make sure the FastAPI server is running at{" "}
            <code className="text-indigo-400">http://localhost:8000</code> and
            refresh.
          </p>
          <button
            onClick={() => { setError(false); window.location.reload() }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto" />
        <p className="text-sm text-slate-500">Starting up…</p>
      </div>
    </div>
  )
}
