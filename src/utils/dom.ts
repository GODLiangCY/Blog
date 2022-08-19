export const isScroll = (el: HTMLElement, isVertical?: boolean): boolean => {
  const key = (
    {
      undefined: 'overflow',
      true: 'overflow-y',
      false: 'overflow-x',
    } as const
  )[String(isVertical)]!
  const overflow = (el.style as any)[key]
  return ['scroll', 'auto', 'overlay'].some((s) => overflow.includes(s))
}

export const getScrollContainer = (
  el: HTMLElement,
  isVertical?: boolean
): Window | HTMLElement | undefined => {
  let parent: HTMLElement = el
  while (parent) {
    if ([window, document, document.documentElement].includes(parent))
      return window

    if (isScroll(parent, isVertical)) return parent

    parent = parent.parentNode as HTMLElement
  }

  return parent
}

export const getOffsetTop = (el: HTMLElement) => {
  let offset = 0
  let parent = el

  while (parent) {
    offset += parent.offsetTop
    parent = parent.offsetParent as HTMLElement
  }

  return offset
}

export const getOffsetTopDistance = (
  el: HTMLElement,
  containerEl: HTMLElement
) => {
  return Math.abs(getOffsetTop(el) - getOffsetTop(containerEl))
}
