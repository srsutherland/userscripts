// ==UserScript==
// @name         RPGBOT 5e.tools linker
// @namespace    http://srsutherland.dev
// @version      2022.01.01
// @description  Make feature ratings on rpgbot.net link to a search for the thing on 5e.tools
// @author       srsutherland
// @match        https://rpgbot.net/dnd5/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rpgbot.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const rating_spans = document.querySelectorAll(".rating-blue, .rating-green, .rating-orange, .rating-red");
    for (const span of rating_spans) {
        const child = span.childNodes[0];
        const href = "https://5e.tools/search.html?" + escape(child.textContent.trim());
        const a = document.createElement("a");
        a.href = href;
        a.appendChild(child);
        span.appendChild(a);
    }

    document.head.insertAdjacentHTML(
        "beforeend",
        `<style>.rating-blue a, .rating-green a, .rating-orange a, .rating-red a {color: unset}</style>`
    )

})();
