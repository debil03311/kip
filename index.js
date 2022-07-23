// Constants

const KANA_API_ENDPOINT = 'https://randomkana.herokuapp.com';
const MAX_WORDS = 3;

const THEME_PATH = './css/theme';
const DEFAULT_LAYOUT = 'iso';
const DEFAULT_THEME = 'nord.dark';

// HTML keyboard key elements
const domKeys = [...document.querySelectorAll('.kb-key')];

const e_theme = document.getElementById('theme');
const e_layoutSelector = document.querySelector('#set-layout select');
const e_themeSelector = document.querySelector('#set-theme select');
const e_hintDelayInput = document.querySelector('#set-hint-delay input');

// Load local storage
// Set defaults if none
if (!localStorage.kip) {
  localStorage.kip = JSON.stringify({
    layout: DEFAULT_LAYOUT,
    hintDelay: 2,
    theme: DEFAULT_THEME,
  });
}

/**
 * Replace `localStorage.kip` with the current `kip` object
 */
function updateLocalStorage() {
  localStorage.kip = JSON.stringify(kip);
}

const kip = JSON.parse(localStorage.kip);

// Set saved settings
e_theme.href = `${THEME_PATH}/${kip.theme}.css`;
e_layoutSelector.value = kip.layout;
e_themeSelector.value = kip.theme;
e_hintDelayInput.value = kip.hintDelay;

const dakutenMap = {
  う: ['ゔ'],

  か: ['が'], き: ['ぎ'], く: ['ぐ'], け: ['げ'], こ: ['ご'],
  さ: ['ざ'], し: ['じ'], す: ['ず'], せ: ['ぜ'], そ: ['ぞ'],
  た: ['だ'], ち: ['ぢ'], つ: ['づ'], て: ['で'], と: ['ど'],

  は: ['ば', 'ぱ'],
  ひ: ['び', 'ぴ'],
  ふ: ['ぶ', 'ぷ'],
  へ: ['べ', 'ぺ'],
  ほ: ['ぼ', 'ぽ'],
}

const noDakutenMap = {
  が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ',
  ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ',
  だ: 'た', ぢ: 'ち', づ: 'つ', で: 'て', ど: 'と',
  ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ',
  ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ',
}

const DAKUTEN_CHARACTERS = ['゛', '゜'];

const DAKUTEN_HIRAGANA = "がぎぐげござじずぜぞだぢづでどばびぶべぼ";
const DAKUTEN_KATAKANA = "ガギグゲゴザジズゼゾダヂヅデドバビブベボ";
const HANDAKUTEN_HIRAGANA = "ぱぴぷぺぽ";
const HANDAKUTEN_KATAKANA = "パピプペポ";

const DAKUTEN =    [...(   DAKUTEN_HIRAGANA +    DAKUTEN_KATAKANA)];
const HANDAKUTEN = [...(HANDAKUTEN_HIRAGANA + HANDAKUTEN_KATAKANA)];

/**
 * Check to see if a hiragana character has han/dakuten
 * (only the first character is checked)
 * @param {String} hiragana - A hiragana character
 * @returns {Number} `0` for none, `1` for dakuten, `2` for handakuten
 * @example
 * hasDakuten('は') // 0
 * hasDakuten('ば') // 1
 * hasDakuten('ぱ') // 2
 * hasDakuten('バ') // 1
 * hasDakuten('ﾊﾞ') // 0
 * hasDakuten('はばぱ') // 0
 */
function hasDakuten(hiragana) {
  // Guard clause
  if (!hiragana)
    throw new Error(`No arguments.`);

  // Guard clause
  if (typeof hiragana !== 'string')
    throw new Error(`Hiragana argument ${hiragana} is not a string.`);

  if (DAKUTEN.includes(hiragana[0]))
    return 1;

  else if (HANDAKUTEN.includes(hiragana[0]))
    return 2;

  return 0;
}

/**
 * Remove the .pressed class from every key
 */
function unhighlightAllKeys() {
  for (const e_key of domKeys)
    e_key.classList.remove('pressed', 'hint');
}

// Reset key states and highlights the input area
// when the page is focused
window.addEventListener('focus', ()=> {
  // unhighlightAllKeys();
  document.body.classList.add('focused');
});

// Remove highlight when the focus is lost
window.addEventListener('blur', ()=> {
  document.body.classList.remove('focused');
});

/**
 * Get a random word in hiragana
 * @async
 * @returns {String}
 * @example await fetchWord() // さんぷる
 */
async function fetchWord() {
  return await fetch(KANA_API_ENDPOINT)
    .then((response)=> response.json())
    .then((kana)=> kana[0]) // ['さんぷる', 'サンプル']
}

// 
//   ALPINE
// 

document.addEventListener('alpine:init', ()=> {
  Alpine.data('body', ()=> ({
    showDebug: false,
    showSettings: false,

    layout: 'iso',
    hintTimeout: null, // will reference a setTimeout function
    hintDelay: 2,
    wordCount: 0, // how many words the user has typed

    currentWord: [], // ['さ', 'ん', 'ぷ', 'る']
    upcomingWords: [], // ['ひらがな', 'たんご']
    userInput: [], // ['さ', 'ん', 'ぷ', 'る']

    async init() {
      this.setTheme(kip.theme);
      this.setLayout(kip.layout);
      this.hintDelay = kip.hintDelay;

      this.currentWord = [...await fetchWord()];
      this.newHintTimeout();

      // Initial upcoming words
      for (let i = 0; i < MAX_WORDS-1; i++)
        this.upcomingWords.push(await fetchWord());
    },

    /**
     * @param {String} themeName
     */
    setTheme(themeName) {
      e_theme.href = `${THEME_PATH}/${themeName}.css`;
      kip.theme = themeName;

      updateLocalStorage();
    },

    /**
     * @param {String} seconds
     */
    setHintDelay(seconds) {
      kip.hintDelay = seconds;
      updateLocalStorage();
    },

    /**
     * @param {String} layoutName
     */
    setLayout(layoutName) {
      this.layout = layoutName;
      kip.layout = layoutName;

      updateLocalStorage();
    },

    /**
     * Reset the hint highlight timeout
     */
    newHintTimeout() {
      // Make sure the previous timeout is gone
      clearTimeout(this.hintTimeout);

      // Set a new one
      this.hintTimeout = setTimeout(()=> {
        // Add a .hint class to every appropriate element
        for (const e_key of this.getHintElements())
          e_key.classList.add('hint');
      }, this.hintDelay * 1000)
    },

    /**
     * Get the HTML elements that should get a hint highlight
     * @returns {Array<HTMLElement>}
     */
    getHintElements() {
      // Current untyped character
      const character = this.currentWord[this.userInput.length];

      // If a non-han/dakuten version exists, use that one instead
      const finalCharacter = noDakutenMap[character] || character;

      return domKeys.filter((element)=>
        element.innerText.includes(finalCharacter));
    },

    /**
     * Move on to the next item from upcomingWords
     */
    async tryNextWord() {
      // If what the user has written so far is not the same
      // as the curent word, don't move on to the next word
      if (this.currentWord.join() !== this.userInput.join())
        return;

      this.wordCount++;

      // Remove the first word and split it into its characters
      this.currentWord = [...this.upcomingWords.shift()];

      // Fetch a new word and add it to the back of upcomingWords
      this.upcomingWords.push(await fetchWord());

      // Clear the user's input
      this.userInput = [];
    },

    /**
     * What happens when a key is pressed anywhre on the page
     * @param {KeyboardEvent} event 
     * @returns 
     */
    async keyboardHandler(event) {
      // Don't handle if settings window is open
      if (this.showSettings)
        return;

      // Get all HTML elements for the pressed key
      const pressedDomKeys = domKeys.filter(
        (key)=> key.dataset.code === event.code)

      const isDeadKey = pressedDomKeys[0].classList.contains('deadkey');
      const isDakutenKey = pressedDomKeys[0].classList.contains('dakuten');

      // When the key is first pressed (not while held)
      if (!event.repeat) {
        unhighlightAllKeys();

        // Highlight the matching keys
        for (const e_key of pressedDomKeys)
          e_key.classList.add('pressed')
      }

      this.newHintTimeout();

      // Debug
      if (event.code == 'Tab') {
        event.preventDefault();
        return this.showDebug = !this.showDebug;
      }

      // Don't do anything for "dead" keys
      if (isDeadKey) {
        // Unless it's backspace and user input exists
        if (this.userInput.length && event.code === 'Backspace') {
          // Ctrl + Backspace = Delete all input
          if (event.ctrlKey)
            this.userInput = [];

          // Backspace = Delete last character
          else
            this.userInput.pop();
        }

        return;
      }

      // Get the first element of the HTML keys that match the pressed one
      // and then select one of its two children (bool -> number)
      // and grab the text inside of it
      const inputCharacter = pressedDomKeys[0]
        .children[+event.shiftKey]
        .innerText

      // Take out the last character from userInput (if any)
      const lastCharacter = this.userInput.pop();

      // If a dakuten key was pressed
      if (this.userInput.length + 1 // +1 for unpopped length
      &&  isDakutenKey
      && !hasDakuten(lastCharacter)) {
        // index in ['゛', '゜'] matches with dakutenMap value arrays
        const dakutenIndex = DAKUTEN_CHARACTERS.indexOf(inputCharacter);
        const dakutenCharacter = dakutenMap[lastCharacter]?.[dakutenIndex];

        console.log(dakutenIndex, dakutenCharacter);

        if (lastCharacter) {
          console.log(inputCharacter, lastCharacter, dakutenCharacter);

          (dakutenCharacter)
            ? this.userInput.push(dakutenCharacter)
            : this.userInput.push(lastCharacter, inputCharacter)

          return this.tryNextWord();
        }
      }

      // Otherwise just put the character back
      if (lastCharacter)
        this.userInput.push(lastCharacter);

      this.userInput.push(inputCharacter);
      this.tryNextWord();
    },
  }));
});