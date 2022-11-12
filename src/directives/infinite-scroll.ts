// this is a fork from the impletions of element-plus
import type { ComponentPublicInstance, ObjectDirective } from 'vue'
import { nextTick } from 'vue'
import lodash from 'lodash'
import { getOffsetTopDistance, getScrollContainer } from '~/utils'
const { throttle } = lodash

const SCOPE = 'InfiniteScroll'
const CHECK_INTERVAL = 50
const DEFAULT_DELAY = 200
const DEFAULT_DISTANCE = 0

type InfiniteScrollCallback = () => void
type InfiniteScrollEl = HTMLElement & {
  [SCOPE]: {
    container: HTMLElement | Window
    containerEl: HTMLElement
    instance: ComponentPublicInstance
    lastScrollTop: number
    cb: InfiniteScrollCallback
    onScroll: () => void
    observer?: MutationObserver
  }
}

const destroyObserver = (el: InfiniteScrollEl) => {
  const { observer } = el[SCOPE]

  if (observer) {
    observer.disconnect()
    delete el[SCOPE].observer
  }
}

const handleScroll = (el: InfiniteScrollEl, cb: InfiniteScrollCallback) => {
  const { container, containerEl, instance, observer, lastScrollTop }
    = el[SCOPE]
  const { clientHeight, scrollHeight, scrollTop } = containerEl
  const delta = scrollTop - lastScrollTop

  el[SCOPE].lastScrollTop = scrollTop

  // trigger only if full check has done and not disabled and scroll down
  if (observer || delta < 0)
    return

  let shouldTrigger = false

  if (container === el) {
    shouldTrigger = scrollHeight - (clientHeight + scrollTop) <= DEFAULT_DISTANCE
  }
  else {
    // get the scrollHeight since el might be visible overflow
    const { clientTop, scrollHeight: height } = el
    const offsetTop = getOffsetTopDistance(el, containerEl)
    shouldTrigger
      = scrollTop + clientHeight >= offsetTop + clientTop + height - DEFAULT_DISTANCE
  }

  if (shouldTrigger)
    cb.call(instance)
}

function checkFull(el: InfiniteScrollEl, cb: InfiniteScrollCallback) {
  const { containerEl, instance } = el[SCOPE]

  if (containerEl.clientHeight === 0)
    return

  if (containerEl.scrollHeight <= containerEl.clientHeight)
    cb.call(instance)
  else
    destroyObserver(el)
}

export const vInfiniteScroll: ObjectDirective<
  InfiniteScrollEl,
  InfiniteScrollCallback
> = {
  async mounted(el, binding) {
    const { instance, value: cb } = binding

    await nextTick()

    const container = getScrollContainer(el)
    const containerEl
      = container === window
        ? document.documentElement
        : (container as HTMLElement)
    const onScroll = throttle(handleScroll.bind(null, el, cb), DEFAULT_DELAY)

    if (!container)
      return

    el[SCOPE] = {
      instance: instance as ComponentPublicInstance,
      cb,
      container,
      containerEl,
      onScroll,
      lastScrollTop: containerEl.scrollTop,
    }

    const observer = new MutationObserver(
      throttle(checkFull.bind(null, el, cb), CHECK_INTERVAL),
    )
    el[SCOPE].observer = observer
    observer.observe(el, { childList: true, subtree: true })
    checkFull(el, cb)

    container.addEventListener('scroll', onScroll)
  },
  unmounted(el) {
    const { container, onScroll } = el[SCOPE]

    container?.removeEventListener('scroll', onScroll)
    destroyObserver(el)
  },
  async updated(el) {
    if (!el[SCOPE])
      await nextTick()
    const { containerEl, cb, observer } = el[SCOPE]
    if (containerEl.clientHeight && observer)
      checkFull(el, cb)
  },
}
