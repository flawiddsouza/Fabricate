<template>
  <div :style="`border: 1px solid ${highlight ? 'lightcoral' : 'lightgrey'}; padding: 0.5rem; height: 100%; width: 100%; display: grid; grid-template-rows: auto auto auto auto 1fr; row-gap: 0.5rem;`">
    <div style="display: flex; justify-content: space-between;">
      <div>
        <slot name="1-left"></slot>
      </div>
      <div>
        <slot name="1-right"></slot>
      </div>
    </div>
    <div>
      <slot name="2"></slot>
    </div>
    <div>
      <slot name="3"></slot>
    </div>
    <div>Event Log:</div>
    <div ref="logContainer" style="overflow: auto;">
      <div v-for="event in eventLog" :key="event.message" :style="{ color: event.type === 'info' ? 'black' : event.type === 'sent' ? 'green' : 'blue' }" style="padding: 0.3rem; border-bottom: 1px solid lightgrey; white-space: pre-wrap; word-break: break-word; font-family: monospace;">
        <div style="color: grey;">{{ formatTimestamp(event.timestamp) }}</div>
        <div>{{ getFormattedMessage(event.message) }}</div>
      </div>
      <div v-if="eventLog.length === 0" style="padding: 0.3rem; border-bottom: 1px solid lightgrey; white-space: pre-wrap; font-family: monospace;">
        No events yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, nextTick } from 'vue'
import dayjs from 'dayjs'

defineProps<{
  highlight: boolean,
  eventLog: {
    type: 'info' | 'sent' | 'received',
    timestamp: string
    message: string
  }[]
}>()

const logContainer = useTemplateRef<HTMLDivElement>('logContainer')

function formatTimestamp(timestamp: string) {
  return dayjs(timestamp).format('hh:mm:ss A')
}

function getFormattedMessage(message: string) {
  try {
    const parsedMessage = JSON.parse(message)

    return JSON.stringify(parsedMessage, null, 2)
  } catch {
    return message
  }
}

function scrollEventLogToBottom() {
  nextTick(() => {
    if (!logContainer.value) {
      return
    }
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  })
}

defineExpose({
  scrollEventLogToBottom
})
</script>
