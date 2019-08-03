/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * 👋 Hi.
 * This is a scary, spooky concept version.
 */

const selfManifest = chrome.runtime.getManifest();

// ---------------------------------------------------------------------------------------------------------------------
// Hello world & logging
// ---------------------------------------------------------------------------------------------------------------------

console.log(
  `%c🤙 MixUp Browser Extension [v${selfManifest.version}]`,
  'background: #19253B; color: #fff; padding: 5px 10px; font-size: 20px; border: 2px solid #1FBAED; font-family: sans-serif;'
);

const debug = (...args) => {
  console.debug('[🤙 MixUp]', ...args);
};

const log = (...args) => {
  console.info('[🤙 MixUp]', ...args);
};

log('Hey! This is an early concept of the extension. Let me know how you feel about it, thanks! 💖', 'https://mixer.com/LookAtHippo');

// ---------------------------------------------------------------------------------------------------------------------
// Global helper functions
// ---------------------------------------------------------------------------------------------------------------------

function findClassStartsWith(baseSelector, val) {
  if (!baseSelector) baseSelector = '*';
  // $('b-chat-client-host-component div[class^="scrollWrapper"]')
  return document.querySelector(`${baseSelector}[class^="${val}"]`);
}

function findClassNameWithPrefix(baseSelector, val) {
  const sel = findClassStartsWith(baseSelector, val);
  if (sel) return sel.className;
  return "--invalid-class-ref--" + val;
}

function findClassEndsWith(baseSelector, val) {
  if (!baseSelector) baseSelector = '*';
  return document.querySelector(`${baseSelector}[class$="${val}"]`);
}

function findClassNameWithSuffix(baseSelector, val) {
  const sel = findClassEndsWith(baseSelector, val);
  if (sel) return sel.className;
  return "--invalid-class-ref--" + val;
}

// ---------------------------------------------------------------------------------------------------------------------
// Style rules & implementations
// ---------------------------------------------------------------------------------------------------------------------

const StyleRulesKeys = {
  __MixupUi: '__mixup-ui',
  HideLanguageButton: 'hide-lang',
  HideGetEmbers: 'hide-get-embers',
  HideHomepageBanner: 'hide-homepage-banner',
  MinimizeNavMore: 'minimize-nav-more',
  NoChatAnimations: 'no-chat-animations',
  NoHubPointsTooltip: 'no-hub-points-tooltip',
  HideChatLeaderboard: 'hide-chat-leaderboard',
  BlackChannelBackground: 'black-channel-background',
  HideSkillsChat: 'hide-skills-chat',
  BadgesBeforeNames: 'badges-before-names'
};

/**
 * Each style rule is defined as a function.
 *
 * Notes:
 *  - The rule's function is evoked every time the <style> is injected or updated.
 *  - Its return value (if not null/undefined) is be placed in the <style> directly, so only valid CSS may be returned.
 *  - Utility
 */

const StyleRules = {
  /**
   * Meta rule for injecting extension UI CSS.
   */
  [StyleRulesKeys.__MixupUi]: () => {
    return MixupBrand.styleRules;
  },

  /**
   * Hides the language button in the navigation.
   * It's a waste of space for something you only set once.
   */
  [StyleRulesKeys.HideLanguageButton]: () =>
    `b-language-selector { display: none !important; }`,

  /**
   * Hides the "Get embers" button in the top nav.
   * You can still click the "+" button in the skills menu to buy embers.
   */
  [StyleRulesKeys.HideGetEmbers]: () =>
    `b-embers-button { display: none !important; }`,

  /**
   * This hides the big homepage promo banners, e.g. "hey watch ninja".
   */
  [StyleRulesKeys.HideHomepageBanner]: () =>
    `b-homepage-banner { display: none !important; }`,

  /**
   * Removes the "More" text to make the nav smaller.
   * TODO Make this better.
   */
  [StyleRulesKeys.MinimizeNavMore]: () =>
    `b-desktop-header nav button.nav-link { text-indent: -9999px; flex-direction: row-reverse; padding-left: 0; }` +
    `b-desktop-header nav button.nav-link bui-icon { text-indent: 0; }`,

  /**
   * Disables all chat CSS transitions and animations.
   * This breaks "chat options" menu, etc due to forward animations not making it visible.
   * It doesn't fix chat scroll animation, so what's the point, really?
   *
   * TODO Fix or remove.
   */
  [StyleRulesKeys.NoChatAnimations]: () =>
    `b-chat-client-host-component, b-chat-client-host-component * { animation: none !important; transition: none !important; }`,

  /**
   * Removes the "points" upsell tooltip when you hover over the top-right user menu.
   */
  [StyleRulesKeys.NoHubPointsTooltip]: () =>
    `b-hub .points-tooltip { display: none !important; }`,

  /**
   * Hides the chat top cheer leaderboard (at the top).
   */
  [StyleRulesKeys.HideChatLeaderboard]: () =>
    `b-leaderboard-banner-host { display: none !important; }`,

  /**
   * Removes the colorful background behind the player and replaces it with just black.
   */
  [StyleRulesKeys.BlackChannelBackground]: () =>
    `b-stage, b-player { background-color: #000 !important; background-image: none !important; }`,

  /**
   * Hide skills chat overlays.
   */
  [StyleRulesKeys.HideSkillsChat]: () =>
    `#skills-chat, #skills-chat-wrapper { display: none !important; pointer-events: none !important; }`,

  /**
   * Moves badges before names in chat so it looks a bit cleaner.
   */
  [StyleRulesKeys.BadgesBeforeNames]: () => {
    let usernameClass = findClassNameWithPrefix('b-chat-client-host-component span', 'Username__');

    if (usernameClass) {
      if (usernameClass.endsWith('}')) {
        // I think there's a typo in Mixer's end? extra } on the end of the second username class
        usernameClass = usernameClass.substring(0, usernameClass.length - 1);
      }

      const usernameClasses = usernameClass.split(' ');

      const classPrefixerSelf = '.' + usernameClasses.join(', .');
      const classPrefixerSpan = '.' + usernameClasses.join(' > span, .');

      return `${classPrefixerSelf} { display: inline-flex; align-items: center; flex-direction: row-reverse; }` +
        `${classPrefixerSpan} > span { margin: 0 5px 0 0; }`;
    }
  }
};

// ---------------------------------------------------------------------------------------------------------------------
// Style injector system
// ---------------------------------------------------------------------------------------------------------------------

class StyleInjector {
  static get id() {
    return 'mixup-injected-styles';
  }

  static get selector() {
    // $('b-chat-client-host-component div[class^="scrollWrapper"]')
    return document.querySelector(`#${this.id}`);
  }

  static suspend(reason) {
    if (!this._suspend) {
      debug('⏸ Style injections suspended.', reason);
      this._suspend = true;
    }
  }

  static resume() {
    if (this._suspend) {
      debug('▶ Style injections resumed.');
      this._suspend = false;

      if (this._dirty) {
        this.inject();
      }
    }
  }

  static inject() {
    if (this._suspend) {
      // Injects suspended, mark state as dirty and wait for resume() call.
      this._dirty = true;
      return;
    }

    if (!this.selector) {
      let styleNode = document.createElement('style');
      styleNode.id = this.id;
      styleNode.media = "all";
      document.body.appendChild(styleNode);
      debug('Created style injector node:', styleNode);
    }

    let combinedRules = "";
    for (let ruleKey in this._rules) {
      if (this._rules.hasOwnProperty(ruleKey)) {
        const ruleFn = this._rules[ruleKey];
        combinedRules += ruleFn() + "\r\n";
      }
    }

    debug('Style injection applied.');

    this.selector.innerHTML = combinedRules;
    this._dirty = false;
  }

  static ruleOn(ruleKey) {
    if (!(ruleKey in StyleRules)) {
      debug('Invalid style rule requested:', ruleKey);
      return false;
    }

    if (!(ruleKey in this._rules)) {
      debug('Style injection ON:', ruleKey);
      this._rules[ruleKey] = StyleRules[ruleKey];
      this.inject();
      return true;
    }

    return false;
  }

  static ruleOff(ruleKey) {
    debug('Style injection OFF:', ruleKey);
    delete this._rules[ruleKey];
    this.inject();
  }
}

StyleInjector._rules = {};

// ---------------------------------------------------------------------------------------------------------------------
// Chat scroll de-animator
// ---------------------------------------------------------------------------------------------------------------------

class ChatDeAnimator {
  static tickBind() {
    const chatNode = findClassStartsWith('b-chat-client-host-component div', 'scrollWrapper');

    if (chatNode) {
      if (chatNode.dataset.mixedUp !== "1") {
        // This chat node hasn't been messed with by us yet, so let's mod it
        debug('De-animating chat node:', chatNode);

        chatNode.dataset.mixedUp = "1";
        chatNode.dataset.scrollUpLock = "0";

        // Catch scroll event, eat it up, and force scroll to bottom
        chatNode.addEventListener('scroll', (e) => {
          if (chatNode.dataset.scrollUpLock !== "1") {
            e.preventDefault();
            e.cancelBubble = true;
            chatNode.scrollTop = chatNode.scrollHeight;
            return false;
          }
        });

        // If the user scrolls up with mousewheel, lock auto scroll, relock on down scroll
        // TODO Improve this so down scroll doesn't torpedo to the bottom
        chatNode.addEventListener('mousewheel', (e) => {
          if (e.wheelDelta >= 0) {
            chatNode.dataset.scrollUpLock = "1";
          } else {
            chatNode.dataset.scrollUpLock = "0";
          }
        });

        // Re-inject styles, as the page has likely changed
        StyleInjector.inject();
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Mixup Brand
// ---------------------------------------------------------------------------------------------------------------------

class MixupBrand {
  static get id() {
    return 'mixup-injected-brand';
  }

  static get selector() {
    return document.querySelector(`#${this.id}`);
  }

  static inject() {
    if (this.selector) {
      this.selector.remove();
    }

    StyleInjector.ruleOn(StyleRulesKeys.__MixupUi);

    const logoNode = document.querySelector('.logo');

    if (logoNode) {
      let brandNode = document.createElement('a');
      brandNode.id = this.id;
      brandNode.innerHTML = "🤙";
      brandNode.title = `MixUp Extension - Concept version`;
      logoNode.appendChild(brandNode);
    }
  }

  static get styleRules() {
    return `.logo { position: relative; }` +
      `#mixup-injected-brand { display: flex; position: absolute; right: -20px; top: 50%; transform: translateY(-50%); }`;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// State changes
// ---------------------------------------------------------------------------------------------------------------------

class MixerPoller {
  static go() {
    setInterval(this.tick.bind(this), 2500);
    setTimeout(this.tick.bind(this), 250);
  }

  static tick() {
    ChatDeAnimator.tickBind();
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------------------------------------------------

function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

ready(() => {
  log('Document is ready. Getting to work. 💪');

  try {
    StyleInjector.suspend('Applying on-page-load ruleset.');
    StyleInjector.ruleOn(StyleRulesKeys.HideLanguageButton);
    StyleInjector.ruleOn(StyleRulesKeys.HideGetEmbers);
    StyleInjector.ruleOn(StyleRulesKeys.HideHomepageBanner);
    StyleInjector.ruleOn(StyleRulesKeys.MinimizeNavMore);
    StyleInjector.ruleOn(StyleRulesKeys.NoHubPointsTooltip);
    StyleInjector.ruleOn(StyleRulesKeys.HideChatLeaderboard);
    StyleInjector.ruleOn(StyleRulesKeys.BlackChannelBackground);
    StyleInjector.ruleOn(StyleRulesKeys.HideSkillsChat);
    StyleInjector.ruleOn(StyleRulesKeys.BadgesBeforeNames);
    StyleInjector.resume();

    MixupBrand.inject();

    log('✔ Start up complete.');
  } catch (e) {
    log('⚠ Start up failed miserably.', e);
  } finally {
    StyleInjector.resume();
  }

  MixerPoller.go();
});