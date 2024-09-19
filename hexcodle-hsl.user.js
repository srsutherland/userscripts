// ==UserScript==
// @name         Hexcodle HSL
// @namespace    https://srutherland.dev
// @version      2024.09.19
// @description  Show HSL values for each guess you make on hexcodle mini
// @author       srsutherland
// @match        https://www.hexcodle.com/mini
// @match        https://www.hexcodle.com/mini/archive/*
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

    function rgbToHwb(r, g, b) {
        // Normalize RGB values to the [0, 1] range
        const red = r / 255;
        const green = g / 255;
        const blue = b / 255;
    
        const max = Math.max(red, green, blue);
        const min = Math.min(red, green, blue);
        const delta = max - min;
    
        let hue;
    
        // Calculate hue
        if (delta === 0) {
            hue = 0;
        } else if (max === red) {
            hue = ((green - blue) / delta) % 6;
        } else if (max === green) {
            hue = (blue - red) / delta + 2;
        } else {
            hue = (red - green) / delta + 4;
        }
    
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
    
        // Calculate whiteness and blackness
        const whiteness = min;
        const blackness = 1 - max;
    
        // Convert whiteness and blackness to percentages
        return [
            hue,                           // Hue in degrees [0, 360)
            Math.round(whiteness * 100),   // Whiteness as a percentage [0, 100]
            Math.round(blackness * 100)    // Blackness as a percentage [0, 100]
        ];
    }
    

    const hsl_html = (hex) => {
        const rgb = hexToRgb(hex);
        const [h, s, l] = rgbToHsl(...rgb);
        const [h2, w, b] = rgbToHwb(...rgb);
        //return `<div class="hslv"><div>H: ${h}</div><div>S: ${s}%</div><div>L: ${l}%</div></div>`;
        const bg = "min-width:15px;height:15px;background-color:"
        const hue_bg = bg + `hsl(${h}, 100%, 50%)`
        const sat_bg = bg + `hsl(${h}, ${s}%, 50%)`
        const lum_bg = bg + `hsl(${h}, 0%, ${l}%)`
        const wht_bg = bg + `hwb(${h2} ${w}% 0%)`
        const blk_bg = bg + `hwb(${h2} 0% ${b}%)`
        const table = `
            <table class="hslv">
                <tr>
                    <td>H:</td>
                    <td>${h}&deg;</td>
                    <td colspan="2"><div style="${hue_bg}"></div></td>
                </tr>
                <tr>
                    <td>S:</td>
                    <td>${s}%</td>
                    <td><div style="${sat_bg}"></div></td>
                    <td><div style="${wht_bg}"></div></td>
                    <td>${w}%</td>
                    <td>:W</td>
                </tr>
                <tr>
                    <td>L:</td>
                    <td>${l}%</td>
                    <td><div style="${lum_bg}"></div></td>
                    <td><div style="${blk_bg}"></div></td>
                    <td>${b}%</td>
                    <td>:B</td>
                </tr>
            </table>
        `
        return table
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