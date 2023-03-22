// ==UserScript==
// @name         Wordle Suggester
// @namespace    https://srsutherland.dev
// @version      2023.03.22
// @description  Automatically generate a list of letter combinations that fit a provided pattern from the remaining wordle letters
// @author       srsutherland
// @match        https://www.nytimes.com/games/wordle/index.html
// @icon         https://www.nytimes.com/games-assets/v2/metadata/wordle-favicon.ico?v=v2303221300
// ==/UserScript==

(function() {
    'use strict';
    const getLetters = () =>
        Array.from(document.querySelectorAll(`.Key-module_key__kchQI`))
            .filter(k => !k.ariaLabel?.match("absent"))
            .map(k => k.innerText)
            .filter(s => s.length == 1)

    const getVowels = () => getLetters().filter(l => "AEIOUY".match(l))

    const impossiblePairs = [
        /b[fgnpqvx]/i, /c[bdfgjpqvx]/i, /d[cfkpqx]/i, /f[bcghkmnpqvwxz]/i, /g[bcfjkpqtvxz]/i,
        /h[bfghjkqvxz]/i, /j[bcfgklmpqstvxz]/i, /k[cdgjmpqxz]/i, /l[hqrx]/i, /m[cgjqwx]/i,
        /p[cfkmnqvx]/i, /q[b-egj-npqrtv-z]/i, /r[jx]/i, /s[fjrvx]/i, /t[dfgjpqvx]/i,
        /u[u]/i, /v[bcfjkmpqtwxz]/i, /w[jqvwx]/i, /x[cdghjkqsvwxz]/i, /y[hjqy]/i, /z[bcdfgjknp-twx]/i,
        /[hjklmqrwxz]{3}/i
    ]
    const isNotImpossible = (w) => !impossiblePairs.some(p => (w.match(p)))

    unsafeWindow.solve = (wordWithUnderscores, without) => {
        if (wordWithUnderscores == undefined) {
            console.log(`Needs argument "_R@NE"`)
            return
        }
        let letters = getLetters()
        const vowels = letters.filter(l => "AEIOUY".match(l))
        if (typeof without == 'string') {
            letters = letters.filter(x => !(without.toUpperCase().match(x)))
        }
        let words = [wordWithUnderscores]
        // Vowels
        while (words[0].match("@")) {
               words = words.map(w => vowels.map(l => w.replace("@", l))).flat()
        }
        // Letters
        while (words[0].match("_")) {
               words = words.map(w => letters.map(l => w.replace("_", l))).flat()
        }
        // Q needs a U
        words = words.filter(w => !(w.match("Q[^U]")))
        // Need at least one vowel
        words = words.filter(w => w.match(/[AEIOUY]/))
        // No triple letters
        words = words.filter(w => !w.match(/(\w)\1\1/))
        // Add function to filter out impossible words
        words.isNotImpossible = isNotImpossible
        return words
    }
    unsafeWindow.getLetters = getLetters
    unsafeWindow.getVowels = getVowels
    unsafeWindow.isNotImpossible = isNotImpossible
})();