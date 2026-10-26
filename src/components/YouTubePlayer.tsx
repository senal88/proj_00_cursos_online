import { useEffect, useRef, useState } from 'react'
import { Play, RotateCcw, Volume2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string
          playerVars?: Record<string, unknown>
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void
            onError?: (event: { data: number }) => void
          }
        },
      ) => YTPlayerInstance
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export interface YTPlayerInstance {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  destroy: () => void
}

/**
 * Extrai o ID do vídeo a partir de URLs convencionais do YouTube:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 */
export function extrairYouTubeId(url: string): string | null {
  if (!url) return null
  const regExp =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  const match = url.match(regExp)
  return match ? match[1] : null
}

interface YouTubePlayerProps {
  videoUrl: string
  titulo: string
  minutoInicial?: number // em minutos (ex: 7 ou 5)
  onTempoAtualizado?: (segundos: number, minutos: number) => void
  onPausadoOuParado?: (segundos: number, minutos: number) => void
  onVideoConcluido?: () => void
  className?: string
}

let apiCarregandoPromise: Promise<void> | null = null

function carregarYouTubeAPI(): Promise<void> {
  if (window.YT && window.YT.Player) {
    return Promise.resolve()
  }

  if (apiCarregandoPromise) {
    return apiCarregandoPromise
  }

  apiCarregandoPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true

    const callbackAnterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof callbackAnterior === 'function') {
        callbackAnterior()
      }
      resolve()
    }

    document.head.appendChild(script)
  })

  return apiCarregandoPromise
}

export default function YouTubePlayer({
  videoUrl,
  titulo,
  minutoInicial = 0,
  onTempoAtualizado,
  onPausadoOuParado,
  onVideoConcluido,
  className = '',
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ultimoMinutoSalvoRef = useRef<number>(-1)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tempoAtualSegundos, setTempoAtualSegundos] = useState<number>(0)
  const [duracaoSegundos, setDuracaoSegundos] = useState<number>(0)
  const [retomadoNoMinuto, setRetomadoNoMinuto] = useState<number | null>(
    minutoInicial > 0 ? minutoInicial : null,
  )

  const videoId = extrairYouTubeId(videoUrl)
  const inicioEmSegundos = Math.max(0, Math.floor(minutoInicial * 60))

  useEffect(() => {
    if (!videoId) {
      setErro('URL de vídeo do YouTube inválida ou não informada.')
      setCarregando(false)
      return
    }

    let montado = true
    const uniqueId = `yt-player-${Math.random().toString(36).substring(2, 9)}`

    if (containerRef.current) {
      containerRef.current.id = uniqueId
    }

    carregarYouTubeAPI()
      .then(() => {
        if (!montado || !containerRef.current || !window.YT) return

        try {
          playerRef.current = new window.YT.Player(uniqueId, {
            videoId,
            playerVars: {
              autoplay: 0,
              start: inicioEmSegundos,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              controls: 1,
            },
            events: {
              onReady: (event) => {
                if (!montado) return
                setCarregando(false)
                try {
                  const duracao = event.target.getDuration?.() || 0
                  setDuracaoSegundos(duracao)

                  // Se houver minuto inicial, assegurar seek
                  if (inicioEmSegundos > 0) {
                    event.target.seekTo(inicioEmSegundos, true)
                  }
                } catch {
                  /* intentionally ignored */
                }
              },
              onStateChange: (event) => {
                if (!montado) return
                const state = event.data
                const ytStates = window.YT?.PlayerState

                if (state === ytStates?.PLAYING) {
                  // Iniciar intervalo para monitorar tempo
                  if (!timerRef.current) {
                    timerRef.current = setInterval(() => {
                      if (!playerRef.current) return
                      try {
                        const cur = playerRef.current.getCurrentTime()
                        setTempoAtualSegundos(cur)
                        const minutoAtual = Math.floor(cur / 60)
                        onTempoAtualizado?.(cur, minutoAtual)

                        // Salvar se o minuto mudou
                        if (minutoAtual !== ultimoMinutoSalvoRef.current) {
                          ultimoMinutoSalvoRef.current = minutoAtual
                          onPausadoOuParado?.(cur, minutoAtual)
                        }
                      } catch {
                        /* intentionally ignored */
                      }
                    }, 2000)
                  }
                } else if (state === ytStates?.PAUSED) {
                  if (timerRef.current) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                  }
                  try {
                    const cur = playerRef.current?.getCurrentTime() || 0
                    const minutoAtual = Math.floor(cur / 60)
                    onPausadoOuParado?.(cur, minutoAtual)
                  } catch {
                    /* intentionally ignored */
                  }
                } else if (state === ytStates?.ENDED) {
                  if (timerRef.current) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                  }
                  try {
                    const cur = playerRef.current?.getCurrentTime() || 0
                    const minutoAtual = Math.floor(cur / 60)
                    onPausadoOuParado?.(cur, minutoAtual)
                  } catch {
                    /* intentionally ignored */
                  }
                  onVideoConcluido?.()
                }
              },
              onError: (event) => {
                console.warn('Erro ao carregar vídeo do YouTube:', event.data)
                setErro('Não foi possível carregar o vídeo diretamente via player.')
                setCarregando(false)
              },
            },
          })
        } catch (err) {
          console.error('Falha ao inicializar player:', err)
          setErro('Falha ao instanciar o reprodutor de vídeo.')
          setCarregando(false)
        }
      })
      .catch((err) => {
        console.error('Erro ao baixar script da API do YouTube:', err)
        setErro('Falha na conexão com os servidores do YouTube.')
        setCarregando(false)
      })

    return () => {
      montado = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      // Salvar posição atual ao desmontar (ex: usuário fechando ou navegando)
      if (playerRef.current) {
        try {
          const cur = playerRef.current.getCurrentTime()
          const min = Math.floor(cur / 60)
          onPausadoOuParado?.(cur, min)
        } catch {
          /* intentionally ignored */
        }
        try {
          playerRef.current.destroy()
        } catch {
          /* intentionally ignored */
        }
        playerRef.current = null
      }
    }
  }, [videoId, inicioEmSegundos])

  // Formatação de minutos:segundos
  const formatarTempo = (totalSeg: number) => {
    const mins = Math.floor(totalSeg / 60)
    const segs = Math.floor(totalSeg % 60)
    return `${mins}:${segs < 10 ? '0' : ''}${segs}`
  }

  const reiniciarDoComeco = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0, true)
      playerRef.current.playVideo()
      setRetomadoNoMinuto(null)
    }
  }

  const pularParaMinuto = (minuto: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(minuto * 60, true)
      playerRef.current.playVideo()
    }
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-950 shadow-2xl border border-slate-800 ${className}`}
    >
      {/* Aviso de retomada do minuto salvo se houver */}
      {retomadoNoMinuto !== null && retomadoNoMinuto > 0 && (
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/90 px-3.5 py-2 text-xs text-white backdrop-blur-md border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Retomando de onde você parou:{' '}
              <strong className="text-amber-300 font-mono">minuto {retomadoNoMinuto}</strong> (
              {retomadoNoMinuto}:00)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={reiniciarDoComeco}
              className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10 px-2"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Recomeçar do início
            </Button>
            <button
              onClick={() => setRetomadoNoMinuto(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Container de vídeo 16:9 responsivo */}
      <div className="relative aspect-video w-full bg-black">
        {/* Placeholder ou iframe do YouTube */}
        {erro ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-white">
            <AlertCircle className="h-10 w-10 text-amber-400 mb-2" />
            <p className="text-sm font-medium text-slate-200">{erro}</p>
            {/* Fallback iframe simples caso a API falhe */}
            {videoId && (
              <div className="mt-4 w-full h-full max-h-[300px]">
                <iframe
                  title={titulo}
                  src={`https://www.youtube.com/embed/${videoId}?start=${inicioEmSegundos}&autoplay=1`}
                  className="w-full h-full border-0 rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        ) : (
          <div ref={containerRef} className="w-full h-full" />
        )}

        {/* Loading overlay enquanto carrega a IFrame API */}
        {carregando && !erro && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="mt-4 text-xs font-medium text-slate-300 font-mono">
              Preparando player e sincronizando minuto salvo...
            </p>
          </div>
        )}
      </div>

      {/* Barra de atalhos rápidos de navegação temporal */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 px-4 py-2.5 text-xs text-slate-400 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300">
            {formatarTempo(tempoAtualSegundos)}
            {duracaoSegundos > 0 ? ` / ${formatarTempo(duracaoSegundos)}` : ''}
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-400 truncate max-w-xs">{titulo}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 hidden md:inline">Atalhos:</span>
          {minutoInicial > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pularParaMinuto(minutoInicial)}
              className="h-6 text-[11px] border-slate-700 bg-slate-800/80 text-amber-300 hover:bg-slate-700 px-2"
            >
              Minuto {minutoInicial} (salvo)
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={reiniciarDoComeco}
            className="h-6 text-[11px] text-slate-400 hover:text-white px-2"
          >
            0:00 Início
          </Button>
        </div>
      </div>
    </div>
  )
}
