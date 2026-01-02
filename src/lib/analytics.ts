// Basic analytics tracking for the wishlist feature
// This could be extended to send to Google Analytics, Mixpanel, etc.

export interface AnalyticsEvent {
  event: string
  itemId?: string
  itemTitle?: string
  quantity?: number
  amountCents?: number
  donorName?: string
  donorEmail?: string
  timestamp: string
  userAgent?: string
  ipHash?: string
}

export function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>) {
  const analyticsEvent: AnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString()
  }

  // Log to console (in production, this would send to analytics service)
  console.log('Analytics Event:', analyticsEvent)

  // In a real implementation, you might send to:
  // - Google Analytics: gtag('event', event.event, { ... })
  // - Mixpanel: mixpanel.track(event.event, analyticsEvent)
  // - Custom analytics API

  // For now, we'll just store in localStorage for demo purposes
  try {
    const existingEvents = JSON.parse(localStorage.getItem('wishlist_analytics') || '[]')
    existingEvents.push(analyticsEvent)

    // Keep only last 100 events to avoid storage bloat
    if (existingEvents.length > 100) {
      existingEvents.splice(0, existingEvents.length - 100)
    }

    localStorage.setItem('wishlist_analytics', JSON.stringify(existingEvents))
  } catch (error) {
    // Ignore localStorage errors (e.g., in private browsing)
    console.warn('Could not store analytics event:', error)
  }
}

// Predefined event tracking functions
export function trackViewItem(itemId: string, itemTitle: string) {
  trackEvent({
    event: 'view_item',
    itemId,
    itemTitle
  })
}

export function trackClickGiveLink(itemId: string, itemTitle: string) {
  trackEvent({
    event: 'click_give_link',
    itemId,
    itemTitle
  })
}

export function trackSubmitConfirmation(
  itemId: string,
  itemTitle: string,
  quantity: number,
  donorName?: string,
  donorEmail?: string
) {
  trackEvent({
    event: 'submit_confirmation',
    itemId,
    itemTitle,
    quantity,
    donorName,
    donorEmail
  })
}

export function trackSubmitContribution(
  itemId: string,
  itemTitle: string,
  amountCents: number,
  donorName?: string,
  donorEmail?: string
) {
  trackEvent({
    event: 'submit_contribution',
    itemId,
    itemTitle,
    amountCents,
    donorName,
    donorEmail
  })
}

export function trackViewList(search?: string, category?: string, priority?: string) {
  trackEvent({
    event: 'view_list',
    ...(search && { itemTitle: `search:${search}` }),
    ...(category && { donorName: `category:${category}` }),
    ...(priority && { donorEmail: `priority:${priority}` })
  })
}

// Admin events
export function trackAdminCreateItem(itemId: string, itemTitle: string) {
  trackEvent({
    event: 'admin_create_item',
    itemId,
    itemTitle
  })
}

export function trackAdminUpdateItem(itemId: string, itemTitle: string) {
  trackEvent({
    event: 'admin_update_item',
    itemId,
    itemTitle
  })
}

export function trackAdminDeleteItem(itemId: string, itemTitle: string) {
  trackEvent({
    event: 'admin_delete_item',
    itemId,
    itemTitle
  })
}
