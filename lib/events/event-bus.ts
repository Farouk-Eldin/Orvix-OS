import { EventEmitter } from "events";

import type { DomainEvents, DomainEventName } from "@/lib/events/types";

/**
 * Deliberately a plain in-process EventEmitter, not a queue or message
 * broker — modules reacting to something that just happened (send a
 * notification, log an audit entry, update a cache) don't need
 * cross-process delivery. If a listener later needs guaranteed/async
 * delivery, it can enqueue a BullMQ job from inside its handler; the
 * emit() call sites never need to know or care.
 */
class DomainEventBus extends EventEmitter {
  emitEvent<E extends DomainEventName>(event: E, payload: DomainEvents[E]) {
    this.emit(event, payload);
  }

  onEvent<E extends DomainEventName>(event: E, handler: (payload: DomainEvents[E]) => void | Promise<void>) {
    this.on(event, (payload: DomainEvents[E]) => {
      Promise.resolve(handler(payload)).catch((error) =>
        console.error(`[event-bus] handler for "${event}" failed:`, error)
      );
    });
  }
}

const globalForEvents = globalThis as unknown as { eventBus: DomainEventBus | undefined };

export const eventBus = globalForEvents.eventBus ?? new DomainEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.eventBus = eventBus;
}
