import * as Y from 'yjs'
import { createBaseDocument, createReactiveMetaProperty } from './base.svelte'
import type { DocumentOptions, EventChannel, EventDocument } from './types'

export function createEventDoc(options: DocumentOptions): EventDocument {
  // Y.Array for ordered presentations list
  let presentationsArray: Y.Array<string>

  // Y.Array for channels (each channel is a Y.Map)
  let channelsArray: Y.Array<Y.Map<unknown>>

  // Reactive state that mirrors Yjs arrays
  let presentations = $state<string[]>([])
  let channels = $state<EventChannel[]>([])

  // Track observers for cleanup
  const observedMaps: Array<{ target: Y.Map<unknown> | Y.Array<unknown>; handler: () => void }> = []

  // Helper to convert Y.Map to EventChannel
  function mapToChannel(ymap: Y.Map<unknown>): EventChannel {
    const presentationsYArray = ymap.get('presentations') as Y.Array<Y.Map<unknown>> | undefined

    return {
      id: ymap.get('id') as string,
      name: ymap.get('name') as string,
      order: ymap.get('order') as number,
      presentations:
        presentationsYArray?.toArray().map((p) => ({
          presentationId: p.get('presentationId') as string,
          themeOverrideId: p.get('themeOverrideId') as string | undefined,
          order: p.get('order') as number,
        })) ?? [],
    }
  }

  // Update channels state from Yjs
  function updateChannels() {
    channels = channelsArray.toArray().map(mapToChannel)
    base.meta.set('channelCount', channels.length)
  }

  // Update presentations state from Yjs
  function updatePresentations() {
    presentations = presentationsArray.toArray()
    base.meta.set('presentationCount', presentations.length)
  }

  function observeChannelMap(channelMap: Y.Map<unknown>, presArray?: Y.Array<Y.Map<unknown>>) {
    channelMap.observe(updateChannels)
    observedMaps.push({ target: channelMap, handler: updateChannels })
    const resolvedPresArray = presArray ?? (channelMap.get('presentations') as Y.Array<Y.Map<unknown>> | undefined)
    if (resolvedPresArray) {
      resolvedPresArray.observe(updateChannels)
      observedMaps.push({ target: resolvedPresArray, handler: updateChannels })
    }
  }

  let title: ReturnType<typeof createReactiveMetaProperty<string>>

  const base = createBaseDocument({
    ...options,
    onDocumentSynced: () => {
      title.subscribe()
      // Initialize
      updatePresentations()
      updateChannels()

      // Observe presentations array
      presentationsArray.observe(updatePresentations)
      observedMaps.push({ target: presentationsArray, handler: updatePresentations })

      // Observe channels array
      channelsArray.observe(updateChannels)
      observedMaps.push({ target: channelsArray, handler: updateChannels })

      // Also observe each channel's internal changes
      channelsArray.forEach((channelMap) => {
        observeChannelMap(channelMap)
      })
    },
  })

  // Initialize meta properties
  title = createReactiveMetaProperty(base.meta, 'title', '')

  // Initialize arrays
  presentationsArray = base.ydoc.getArray<string>('presentations')
  channelsArray = base.ydoc.getArray<Y.Map<unknown>>('channels')

  function assertWritable() {
    if (base.readOnly) {
      throw new Error('Document is readonly')
    }
  }

  function findChannelIndex(channelId: string): number {
    return channelsArray.toArray().findIndex((c) => c.get('id') === channelId)
  }

  function getChannelMap(channelId: string): Y.Map<unknown> | undefined {
    return channelsArray.toArray().find((c) => c.get('id') === channelId)
  }

  return {
    // State
    get connected() {
      return base.connected
    },
    get synced() {
      return base.synced
    },
    get syncTimedOut() {
      return base.syncTimedOut
    },
    get readOnly() {
      return base.readOnly
    },
    get title() {
      return title.get()
    },
    setTitle(value: string) {
      assertWritable()
      title.set(value)
    },

    // Presentations
    get presentations() {
      return presentations
    },

    addPresentation(presentationId: string) {
      assertWritable()
      presentationsArray.push([presentationId])
    },

    removePresentation(presentationId: string) {
      assertWritable()
      const index = presentationsArray.toArray().indexOf(presentationId)
      if (index !== -1) {
        presentationsArray.delete(index, 1)
      }
    },

    reorderPresentation(presentationId: string, newIndex: number) {
      assertWritable()
      const currentIndex = presentationsArray.toArray().indexOf(presentationId)
      if (currentIndex !== -1 && currentIndex !== newIndex) {
        base.ydoc.transact(() => {
          presentationsArray.delete(currentIndex, 1)
          presentationsArray.insert(newIndex, [presentationId])
        })
      }
    },

    // Channels
    get channels() {
      return channels
    },

    addChannel(name: string): string {
      assertWritable()
      const id = crypto.randomUUID()
      const channelMap = new Y.Map<unknown>()
      const presArray = new Y.Array<Y.Map<unknown>>()

      channelMap.set('id', id)
      channelMap.set('name', name)
      channelMap.set('order', channelsArray.length)
      channelMap.set('presentations', presArray)

      // Observe new channel for changes (pass presArray directly since channelMap isn't in doc yet)
      observeChannelMap(channelMap, presArray)

      channelsArray.push([channelMap])
      return id
    },

    removeChannel(channelId: string) {
      assertWritable()
      const index = findChannelIndex(channelId)
      if (index !== -1) {
        channelsArray.delete(index, 1)
      }
    },

    updateChannel(channelId: string, updates: Partial<Pick<EventChannel, 'name' | 'order'>>) {
      assertWritable()
      const channelMap = getChannelMap(channelId)
      if (channelMap) {
        base.ydoc.transact(() => {
          if (updates.name !== undefined) {
            channelMap.set('name', updates.name)
          }
          if (updates.order !== undefined) {
            channelMap.set('order', updates.order)
          }
        })
      }
    },

    reorderChannel(channelId: string, newIndex: number) {
      assertWritable()
      const currentIndex = findChannelIndex(channelId)
      if (currentIndex !== -1 && currentIndex !== newIndex) {
        base.ydoc.transact(() => {
          // Extract all channel data as plain objects
          const allChannelData = channelsArray.toArray().map((c) => ({
            id: c.get('id') as string,
            name: c.get('name') as string,
            presentations: (c.get('presentations') as Y.Array<Y.Map<unknown>>).toArray().map((p) => ({
              presentationId: p.get('presentationId') as string,
              themeOverrideId: p.get('themeOverrideId') as string | undefined,
              order: p.get('order') as number,
            })),
          }))

          // Perform the reorder in the plain array
          const [moved] = allChannelData.splice(currentIndex, 1)
          allChannelData.splice(newIndex, 0, moved)

          // Clear the Y.Array
          channelsArray.delete(0, channelsArray.length)

          // Rebuild with new order
          allChannelData.forEach((data, i) => {
            const channelMap = new Y.Map<unknown>()
            const presArray = new Y.Array<Y.Map<unknown>>()

            channelMap.set('id', data.id)
            channelMap.set('name', data.name)
            channelMap.set('order', i)
            channelMap.set('presentations', presArray)

            // Add presentations
            data.presentations.forEach((p, pi) => {
              const relationMap = new Y.Map<unknown>()
              relationMap.set('presentationId', p.presentationId)
              if (p.themeOverrideId) {
                relationMap.set('themeOverrideId', p.themeOverrideId)
              }
              relationMap.set('order', pi)
              presArray.push([relationMap])
            })

            // Observe new channel for changes (pass presArray directly)
            observeChannelMap(channelMap, presArray)

            channelsArray.push([channelMap])
          })
        })
      }
    },

    // Channel-Presentation relations
    assignPresentationToChannel(channelId: string, presentationId: string, themeOverrideId?: string) {
      assertWritable()
      const channelMap = getChannelMap(channelId)
      if (channelMap) {
        const presArray = channelMap.get('presentations') as Y.Array<Y.Map<unknown>>

        // Check if already assigned
        const existing = presArray.toArray().find((p) => p.get('presentationId') === presentationId)
        if (existing) return

        const relationMap = new Y.Map<unknown>()
        relationMap.set('presentationId', presentationId)
        if (themeOverrideId) {
          relationMap.set('themeOverrideId', themeOverrideId)
        }
        relationMap.set('order', presArray.length)

        presArray.push([relationMap])
      }
    },

    removePresentationFromChannel(channelId: string, presentationId: string) {
      assertWritable()
      const channelMap = getChannelMap(channelId)
      if (channelMap) {
        const presArray = channelMap.get('presentations') as Y.Array<Y.Map<unknown>>
        const index = presArray.toArray().findIndex((p) => p.get('presentationId') === presentationId)
        if (index !== -1) {
          presArray.delete(index, 1)
        }
      }
    },

    setChannelPresentationTheme(channelId: string, presentationId: string, themeOverrideId: string | undefined) {
      assertWritable()
      const channelMap = getChannelMap(channelId)
      if (channelMap) {
        const presArray = channelMap.get('presentations') as Y.Array<Y.Map<unknown>>
        const relationMap = presArray.toArray().find((p) => p.get('presentationId') === presentationId)
        if (relationMap) {
          if (themeOverrideId) {
            relationMap.set('themeOverrideId', themeOverrideId)
          } else {
            relationMap.delete('themeOverrideId')
          }
          // Manually trigger update since nested Y.Map changes don't trigger array observation
          updateChannels()
        }
      }
    },

    reorderChannelPresentation(channelId: string, presentationId: string, newIndex: number) {
      assertWritable()
      const channelMap = getChannelMap(channelId)
      if (channelMap) {
        const presArray = channelMap.get('presentations') as Y.Array<Y.Map<unknown>>
        const currentIndex = presArray.toArray().findIndex((p) => p.get('presentationId') === presentationId)

        if (currentIndex !== -1 && currentIndex !== newIndex) {
          base.ydoc.transact(() => {
            // Extract all presentation data as plain objects
            const allPresData = presArray.toArray().map((p) => ({
              presentationId: p.get('presentationId') as string,
              themeOverrideId: p.get('themeOverrideId') as string | undefined,
            }))

            // Perform the reorder in the plain array
            const [moved] = allPresData.splice(currentIndex, 1)
            allPresData.splice(newIndex, 0, moved)

            // Clear the Y.Array
            presArray.delete(0, presArray.length)

            // Rebuild with new order
            allPresData.forEach((data, i) => {
              const relationMap = new Y.Map<unknown>()
              relationMap.set('presentationId', data.presentationId)
              if (data.themeOverrideId) {
                relationMap.set('themeOverrideId', data.themeOverrideId)
              }
              relationMap.set('order', i)
              presArray.push([relationMap])
            })
          })
        }
      }
    },

    // Raw Yjs access
    get ydoc() {
      return base.ydoc
    },
    get meta() {
      return base.meta
    },

    // Lifecycle
    retry() {
      base.retry()
    },
    destroy() {
      for (const { target, handler } of observedMaps) {
        target.unobserve(handler)
      }
      observedMaps.length = 0
      base.destroy()
    },
  }
}
