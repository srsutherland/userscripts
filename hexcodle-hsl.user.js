// ==UserScript==
// @name         Hexcodle HSL
// @namespace    https://srutherland.dev
// @version      2024.07.15
// @description  Show HSL values for each guess you make on hexcodle mini
// @author       srsutherland
// @match        https://www.hexcodle.com/mini
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hexcodle.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function hexToRgb(hex) {
        // Remove the hash at the start if it's there
        hex = hex.replace(/^#/, '');

        // If the hex is in shorthand form (3 digits), convert it to 6 digits
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        // Parse the r, g, b values
        let bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;

        return [r, g, b];
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return [
            Math.round(h * 360),
            Math.round(s * 100),
            Math.round(l * 100)
        ];
    }

    const hsl_html = (hex) => {
        const [h, s, l] = rgbToHsl(...hexToRgb(hex));
        return `<div class="hslv"><div>H: ${h}</div><div>S: ${s}%</div><div>L: ${l}%</div></div>`;
    }

    const annotate = () => {
        const guess_section = document.querySelector(`.guess-section`);
        const guesses = [...guess_section.children].filter(c => c.nodeName == 'DIV');
        console.log("annotating")
        for (const guess of guesses) {
            const hex = guess.children[0]?.attributes?.bordercolor?.value;
            const [h, s, l] = rgbToHsl(...hexToRgb(hex));
            const newHTML = hsl_html(hex);
            if (!guess.querySelector(`.hslv`)) {
                guess.insertAdjacentHTML('beforeEnd', newHTML)
            }
        }
    }

    window.setTimeout(annotate, 1000)
})();