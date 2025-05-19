// ==UserScript==
// @name         RPGBOT 5e.tools linker
// @namespace    http://srsutherland.dev
// @version      2025.5.18
// @description  Make feature ratings on rpgbot.net link to a search for the thing on 5e.tools
// @author       srsutherland
// @match        https://rpgbot.net/dnd5/*
// @match        https://rpgbot.net/p2/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rpgbot.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log("Attempting to add links")
    const current_path = window.location.pathname;
    const current_section = current_path.split("/")[1]; // e.g. "dnd5" or "p2"

    const rating_spans = document.querySelectorAll(".rating-blue, .rating-green, .rating-orange, .rating-red");
    const search_paths = {
        "dnd5": "https://5e.tools/search.html?q=",
        "p2": "https://2e.aonprd.com/Search.aspx?q=",
    }
    const search_path = search_paths[current_section];
    if (!search_path) {
        console.error("No search path found for current section:", current_section);
        return;
    }
    for (const span of rating_spans) {
        const child = span.childNodes[0];
        const href = search_path + escape(child.textContent.trim());
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
