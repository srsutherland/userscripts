// ==UserScript==
// @name         Wikipedia Drug invert
// @namespace    http://srsutherland.dev
// @version      2020.02.03
// @description  Invert Skeletal formula on wiki pages using Template:drugbox (for dark mode)
// @author       srsutherland
// @match        *://en.wikipedia.org/wiki/*
// @match        *://www.wikipedia.org/wiki/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log("Looking for drug infobox")
    if (document.querySelector(`a[href="/wiki/IUPAC_nomenclature_of_chemistry" i]`)) { //all drugboxes should have this link
        console.log("found drugbox")
        let skeleton = document.querySelector('.infobox img[src*=".svg" i]')
        if (skeleton) {
            console.log("found skeleton svg")
            skeleton.style.filter = "invert(100%)"
        } else {
            console.log("Could not find skeleton SVG")
        }
    } else {
        console.log("No drugbox found")
    }
})();
