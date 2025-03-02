import { ref, onUnmounted } from 'vue'

interface TimerOptions {
  initialSeconds?: number;
  countDown?: boolean;
  autoStart?: boolean;
  onComplete?: () => void;
  onTick?: (seconds: number) => void;
  format?: (seconds: number) => string;
}

export function useTimer(options: TimerOptions = {}) {
  const {
    initialSeconds = 0,
    countDown = false,
    autoStart = false,
    onComplete,
    onTick,
    format = formatTime
  } = options

  const seconds = ref(initialSeconds)
  const totalSeconds = ref(initialSeconds)
  const isRunning = ref(false)
  const intervalId = ref<number | null>(null)
  const formattedTime = ref(format(seconds.value, totalSeconds.value))

  let lastTimestamp: number | null = null

  function formatTime(seconds: number, totalSeconds: number): string {
    return seconds !== 0 ? seconds.toString() + '/' + totalSeconds : ''
  }

  function tick(timestamp: number) {
    if (!isRunning.value) return

    if (lastTimestamp === null) {
      lastTimestamp = timestamp
    }

    const delta = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    if (countDown) {
      seconds.value -= delta
      if (seconds.value <= 0) {
        stop()
        seconds.value = 0
        onComplete?.()
      }
    } else {
      seconds.value += delta
    }

    formattedTime.value = format(Math.floor(seconds.value), totalSeconds.value)
    onTick?.(Math.floor(seconds.value))

    if (isRunning.value) {
      intervalId.value = requestAnimationFrame(tick)
    }
  }

  function start() {
    if (isRunning.value) return

    isRunning.value = true
    lastTimestamp = null
    intervalId.value = requestAnimationFrame(tick)
  }

  function pause() {
    if (!isRunning.value) return

    if (intervalId.value) {
      cancelAnimationFrame(intervalId.value)
    }
    intervalId.value = null
    isRunning.value = false
  }

  function reset() {
    pause()
    seconds.value = initialSeconds
    formattedTime.value = format(seconds.value, totalSeconds.value)
  }

  function stop() {
    pause()
  }

  function restart() {
    reset()
    start()
  }

  function setTime(newSeconds: number) {
    seconds.value = newSeconds
    totalSeconds.value = newSeconds
    formattedTime.value = format(seconds.value, totalSeconds.value)
  }

  if (autoStart) {
    start()
  }

  onUnmounted(() => {
    if (intervalId.value) {
      cancelAnimationFrame(intervalId.value)
    }
  })

  return {
    seconds,
    formattedTime,
    isRunning,
    start,
    pause,
    reset,
    stop,
    restart,
    setTime
  }
}
