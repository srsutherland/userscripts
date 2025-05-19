// ==UserScript==
// @name         RPGBOT 5e.tools linker
// @namespace    http://srsutherland.dev
// @version      2025.5.18.1
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
        // wrap the name of the feature in a link to 5e.tools
        const child = span.childNodes[0];
        const href = search_path + escape(child.textContent.trim());
        const a = document.createElement("a");
        a.href = href;
        a.appendChild(child);
        span.appendChild(a);
        // add a class to the parent block for later styling
        const rating_class = span.classList[0];
        const parent = span.parentNode;
        parent.classList.add(rating_class+"-container");
    }

    // Add a widget in the top right corner of the page with 4 checkboxes
    // that toggle the visibility of the different rating colors
    const widget = document.createElement("div");
    widget.id = "viz-widget";
    widget.innerHTML = `
        <label class="rating-blue"><input type="checkbox" id="show-blue" checked> Blue</label><br>
        <label class="rating-green"><input type="checkbox" id="show-green" checked> Green</label><br>
        <label class="rating-orange"><input type="checkbox" id="show-orange" checked> Orange</label><br>
        <label class="rating-red"><input type="checkbox" id="show-red" checked> Red</label><br>
    `;
    document.body.appendChild(widget);
    const checkboxes = widget.querySelectorAll("input[type='checkbox']");
    const viz_style = document.createElement("style");
    viz_style.id = "viz-style";
    document.head.appendChild(viz_style);
    const set_display_styles = () => {
        const styles = [];
        for (const checkbox of checkboxes) {
            const color = checkbox.id.split("-")[1];
            const className = `rating-${color}-container`;
            if (!checkbox.checked) {
                styles.push(`.${className} {display: none;}`);
            }
        }
        viz_style.innerHTML = styles.join("\n");
    }
    for (const checkbox of checkboxes) {
        checkbox.addEventListener("change", set_display_styles);
    }

    document.head.insertAdjacentHTML(
        "beforeend",
        `<style>
            .rating-blue a, .rating-green a, .rating-orange a, .rating-red a {color: unset}
            #viz-widget {
                position: fixed;
                top: 10px;
                right: 10px;
                background-color: #111;
                border: 1px solid black;
                padding: 10px;
                z-index: 1000;
            }
            #viz-widget label {
                font-weight: bold;
            }
        </style>`
    )
})();
