import type { BeforeHandleEventPlugin } from '@nostr-relay/common';
import type { Event } from 'nostr-tools';

export class PolicyPlugin implements BeforeHandleEventPlugin {
  beforeHandleEvent(event: Event): { canHandle: boolean; message?: string } {
    // Only accept kind:30078
    if (event.kind !== 30078) {
      return {
        canHandle: false,
        message: 'restricted: only kind:30078 accepted',
      };
    }

    // Must have at least one bitlasso/* d-tag or t-tag
    const hasBitlassoTag = event.tags.some(
      ([name, value]) =>
        (name === 'd' || name === 't') && value?.startsWith('bitlasso/'),
    );

    if (!hasBitlassoTag) {
      return {
        canHandle: false,
        message: 'restricted: event must have a bitlasso/* d-tag or t-tag',
      };
    }

    return { canHandle: true };
  }
}