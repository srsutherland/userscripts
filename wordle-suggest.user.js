// ==UserScript==
// @name         Wordle Suggester
// @namespace    https://srsutherland.dev
// @version      2024.02.22
// @description  Automatically generate a list of letter combinations that fit a provided pattern from the remaining wordle letters
// @author       srsutherland
// @match        https://www.nytimes.com/games/wordle/index.html
// @match        https://multiwordle.org/multi/*
// @match        https://multiwordle.org
// @icon         https://www.nytimes.com/games-assets/v2/metadata/wordle-favicon.ico?v=v2303221300
// ==/UserScript==

(function() {
    'use strict';
    // Chrome console aliases
    const $ = (s) => document.querySelector(s)
    const $$ = (s) => Array.from(document.querySelectorAll(s))

    const noWordleBotPaywall = () => {
        if (window.location.match("wordle-bot.html")) {
            $('#site-content').style.position = "unset"
            // above won't work if the page is still loading, so put it in head > style
            document.head.innerHTML += `<style id="noWordleBotPaywall">#site-content { position: unset !important; }</style>`
            return true
        }
        return false
    }
    if (noWordleBotPaywall()) return;
    // Add a listener for window.location for soft navigation
    let lastLocation = window.location.href


    // Letter pairs that don't appear in English words
    const impossiblePairs = [
        // Impossible at any position
        /b[fgnpqvx]/i, /c[bdfgjpqvx]/i, /d[cfkpqx]/i, /f[bcghkmnpqvwxz]/i, /g[bcfjkpqtvxz]/i,
        /h[bfghjkqvxz]/i, /j[bcfgklmpqstvxz]/i, /k[cdgjmpqxz]/i, /l[hqrx]/i, /m[cgjqwx]/i,
        /p[cfkmnqvx]/i, /q[b-egj-npqrtv-z]/i, /r[jx]/i, /s[fjrvx]/i, /t[dfgjpqvx]/i,
        /u[u]/i, /v[bcfjkmpqtwxz]/i, /w[jqvwx]/i, /x[cdghjkqsvwxz]/i, /y[hjqy]/i, /z[bcdfgjknp-twx]/i,
        // Impossible three in a row
        /[hjklmqrwxz]{3}/i,
        // Impossible at the start
        /^b[cjkmstz]/i, /^c[ckms]/i, /^d[dglmntv]/i, /^f[dfst]/i, /^g[dgms]/i, 
        /^h[cdlmnprst]/i, /^i[ejquwy]/i, /^j[djrwy]/i, /^k[fkt]/i, /^l[bcdfgjkmnpstvz]/i, /^m[dfkl]/i,
        /^n[bcfhlnpqtvwxz]/i, /^p[bdgjp]/i, /^q[fhs]/i, /^r[bcdfgklmnp-tvwz]/i, /^s[bgsz]/i, /^t[bcklmnt]/i, 
        /^u[acefijoqw-z]/i, /^v[dghnsv]/i, /^w[bcdfgklmnpstz]/i, /^x[abfilmnptu]/i, /^y[gknpvwxz]/i, /^z[mvz]/i
    ]
    const isNotImpossible = (w) => !impossiblePairs.some(p => (w.match(p)))
    
    // Scrambles class for chaining filters
    class Scrambles extends Array {
        filter(f) {
            return Scrambles.from(super.filter(f))
        }

        flat() {
            return Scrambles.from(super.flat())
        }
        
        map(f) {
            return Scrambles.from(super.map(f))
        }

        flatMap(f) {
            return Scrambles.from(super.flatMap(f))
        }

        // Takes strings/regexes or lists of strings/regexes
        match(...patterns) {
            // Flatten list of lists
            patterns = patterns.flat()
            const f = w => patterns.every(p => w.match(p))
            return this.filter(f)
        }
        // Grammatical alias
        thatMatch(...patterns) { return this.match(...patterns) }

        // Takes a strings/regexes or lists of strings/regexes
        notmatch(...patterns) {
            // Flatten list of lists
            patterns = patterns.flat()
            const f = w => patterns.every(p => !w.match(p))
            return this.filter(f)
        }
        // Grammatical alias
        thatDontMatch(...patterns) { return this.notmatch(...patterns) }

        isNotImpossible() {
            return this.filter(isNotImpossible)
        }
        // Not not impossible === possible
        isPossible() {
            return this.filter(isNotImpossible)
        }

        // Return a count of each letter in the list
        count() {
            const counts = {}
            this.forEach(w => [...w].forEach(l => counts[l] = (counts[l] || 0) + 1))
            return counts
        }
    }
    unsafeWindow.Scrambles = Scrambles

    const getLetters = () =>
        Array.from(document.querySelectorAll(`.Key-module_key__kchQI`))
            .filter(k => !k.ariaLabel?.match("absent"))
            .map(k => k.innerText)
            .filter(s => s.length == 1)

    const getVowels = () => getLetters().filter(l => "AEIOUY".match(l))

    // Wordle //

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
               words = words.flatMap(w => vowels.map(l => w.replace("@", l)))
        }
        // Letters
        while (words[0].match("_")) {
               words = words.flatMap(w => letters.map(l => w.replace("_", l)))
        }
        // Q needs a U
        words = words.filter(w => !(w.match("Q[^U]")))
        // Need at least one vowel
        words = words.filter(w => w.match(/[AEIOUY]/))
        // No triple letters
        words = words.filter(w => !w.match(/(\w)\1\1/))

        words = Scrambles.from(words)
        return words
    }
    unsafeWindow.getLetters = getLetters
    unsafeWindow.getVowels = getVowels
    unsafeWindow.isNotImpossible = isNotImpossible

    // MultiWordle //
    
    if (window.location.href.match("multiwordle")) {
        const getWordLists = async () => {
            const jsText = await fetch("https://multiwordle.org/static/js/main.554356e2.js").then(r => r.text())
            const wordListRegex = /\w+=JSON.parse\('(\[("[\w*]{5}",?)+\])'\)/ig // 1st group is the word list string
            const wordLists = [...jsText.matchAll(wordListRegex)].map(m => JSON.parse(m[1]))
            return wordLists
        }
        const getAlpha = ls => [...ls].filter(k => k.innerText.match(/^\w$/) && !k.classList.contains("c-hahkls-idbAaef-css")).map(k => k.innerText)
        const getYellows = () => $$(".c-hLErVa-ijlIsW-focused-true .c-jjhHwW").map(div => getAlpha(div.children))
        unsafeWindow.solve = () => {
            const getAlpha = ls => [...ls].filter(k => k.innerText.match(/^\w$/) && !k.classList.contains("c-hahkls-idbAaef-css")).map(k => k.innerText)
            const letters = getAlpha($$(".c-hahkls"))
            const replaceFromW = (s, w) => w.map(a => s.replace("_", a))
            const replaceNext = a => a.flatMap(s => replaceFromW(s, letters))
            // Starting word from green
            const css_selector_known_letters = ".c-hLErVa-ijlIsW-focused-true .c-eOfRZm:nth-of-type(2) .c-EbAgF.c-cyjHTc"
            let words = [$$(css_selector_known_letters).map(k => k.innerText ? k.innerText : "_").join("")]
            while (words[0].match("_")) {
                words = replaceNext(words)
            }
            const yellows = $$(".c-hLErVa-ijlIsW-focused-true .c-jjhHwW").map(div => getAlpha(div.children))
            const yellow_position_regexes = yellows.map((ls, i) => new RegExp([0,1,2,3,4].map(j => i == j ? `[${ls.join("")}]` : ".").join("")))
            
            words = words.filter(w => 
                // Has at least one of each yellow
                yellows.flat().every(l => w.match(l)) &&
                // Doesn't have the yellows in the wrong place
                !yellow_position_regexes.some(r => w.match(r)) &&
                // Q needs a U
                !(w.match("Q[^U]")) &&
                // Need at least one vowel
                w.match(/[AEIOUY]/) &&
                // No triple letters
                !w.match(/(\w)\1\1/)
            )

            words = Scrambles.from(words)
            return words
        }
    }
})();