/**
 * What Kinbot is told about web search (HAT-288, HAT-298, HAT-299, HAT-735). The chat route adds one
 * of these to the system prompt, because only the server knows whether this turn can search: on
 * OpenAI the family has to be on Plus and have searches left this week; DeepSeek, kept for
 * development and the eval harness, needs the server to hold its key. The eval harness adds the
 * same text, so it tests what ships.
 */

/** Web search is part of Plus (HAT-735). `superplus` is Plus, and anything else is Standard. */
export function planAllowsWebSearch(accountType: string | null | undefined): boolean {
  return accountType === 'plus' || accountType === 'superplus';
}

/** Searches a family account may run in any 7 days, all of its people together (HAT-735). */
export const WEB_SEARCHES_PER_WEEK = 30;

/** The tool an admin approves to turn on their own web search (`AIAgentActionHandler`). */
export const TURN_ON_WEB_SEARCH_TOOL = 'turnonwebsearch';

/** What needs the web, in the words every instruction below uses. */
const NEEDS_THE_WEB =
  "news, today's prices, opening hours, schedules, weather, scores, or anything recent you are not sure of";

/** A turn that can search. Every page it uses is linked, with the address the search returned. */
export const WEB_SEARCH_INSTRUCTION =
  `You can search the web with the web_search tool. Use it for ${NEEDS_THE_WEB}. ` +
  'Link each page your answer comes from as a markdown link with its title, [Page title](https://…), ' +
  'beside the fact it supports. Use only addresses from the search results; never make one up.';

/**
 * A turn for a person whose web search is used up for this week: the family has run
 * `WEB_SEARCHES_PER_WEEK` searches in the last 7 days. The turn runs without the search tool.
 */
export const WEB_SEARCH_USED_UP_INSTRUCTION =
  `You cannot search the web in this reply: this family has used its web searches for this week. When a question needs the web (${NEEDS_THE_WEB}), ` +
  'say in one short sentence that web search is used up for this week and will be back in a few days, then answer what you can without it. ' +
  'Never mention web search for a question you can answer without it.';

/**
 * A turn that could have searched, for a person whose web search is off. Null when there is nothing worth saying:
 * an admin whose app does not offer to turn it on is not shown the switch either.
 */
export function webSearchOffInstruction(person: {isChild: boolean; canTurnOn: boolean}): string | null {
  if (person.canTurnOn) {
    return (
      `Web search is off for this person. When a question needs the web (${NEEDS_THE_WEB}), ` +
      'say in one short sentence that answering needs a web search, and call turnOnWebSearch in the same reply. ' +
      'It shows them a card to approve, which is the question: do not also ask in words. ' +
      'Once it is on, search and answer. Never call it for a question you can answer without the web, ' +
      'and once they decline, do not ask again in this conversation.'
    );
  }
  if (person.isChild) {
    return (
      `You cannot search the web: it is off for this person. When a question needs the web (${NEEDS_THE_WEB}), ` +
      'say in one short sentence that you cannot look that up, and that a parent can turn on web search for them. ' +
      'Answer what you can without it. Never mention web search for a question you can answer without it.'
    );
  }
  return null;
}
