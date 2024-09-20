// ==UserScript==
// @name         Sean's Really Slick Hacker Tools
// @namespace    http://srsutherland.dev
// @version      2024.09.20
// @author       srsutherland
// @description  A collection of tools for "hacking" websites and data to make javascript more convenient
// @match        *://*/*
// @icon         https://avatars.githubusercontent.com/u/12262958?v=4
// @grant        none
// ==/UserScript==

(function() {
    const SRS = {};

    SRS.alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    SRS.ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    // List all js global variables used by site (not all defined!)
    // https://stackoverflow.com/a/52693392/2443695
    SRS.globals = () => {
        return Object.keys(window).filter(x => typeof(window[x]) !== 'function' &&
            Object.entries(
                Object.getOwnPropertyDescriptor(window, x)).filter(e =>
                ['value', 'writable', 'enumerable', 'configurable'].includes(e[0]) && e[1]
                ).length === 4)
    }

    SRS.fileSafeDatestring = (date) => 
        (date || new Date()).toLocaleString('sv').replace(/ (\d+):(\d+):\d+/, "-$1$2")

    // Modified from https://stackoverflow.com/a/30800715
    SRS.download = (text, filename, autodate=true) => {
        const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
        const datestring = (new Date()).toLocaleString('sv').replace(/ (\d+):(\d+):\d+/, "-$1$2")
        if (filename === undefined) {
            filename = datestring;
        } else {
            if (autodate) {
                filename += "-" + datestring;
            }
        }
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename + ".txt");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // Modified from https://stackoverflow.com/a/30800715
    SRS.downloadJSON = (exportObj, filename, autodate=true) => {
        if (filename === undefined) {
            filename = "download";
        } else {
            if (filename.endsWith(".json")) {
                filename = filename.slice(0, -5)
            }
        }
        if (autodate) {
            filename += "-" + (new Date()).toLocaleString('sv').replace(/ (\d+):(\d+):\d+/, "-$1$2")
        }
        const dataStr = "data:text/json;charset=utf-8," + 
            encodeURIComponent(JSON.stringify(exportObj, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // Modified from https://stackoverflow.com/a/67531239
    SRS.getJsonUpload = async () => {
        const inputFileElem = document.createElement('input');
        inputFileElem.setAttribute('type', 'file');
        inputFileElem.setAttribute('accept', '.json');
        const inputChanged = new Promise(
            resolve => inputFileElem.addEventListener('change', resolve, false)
        );
        inputFileElem.click();
        const fileChangeEvent = await inputChanged;
        const { files } = fileChangeEvent.target;
        if (!files) { return }
        const fileText = await files[0].text();
        return JSON.parse(fileText);
    }

    /**
     * Output an element's outerHTML as an indented, opinionated-format string.
     * @param {Element} element - html element to stringify 
     * @param {number} indent - (opt) spaces per indent level; defaults to 2 
     * @param {number} indentLevel - (opt) recursive indent level; leave it at 0
     * @returns string
     */
    SRS.elementToString = function elementToString(element, indent = 2, indentLevel = 0) {
        if (element === undefined || element === null || !(element instanceof Element)) {
            throw new TypeError(`elementToString: param "element" must be of type Element`)
        }
        let output = '';
        const padding = ' '.repeat(indent * indentLevel);
    
        // Clone the element and get its outer HTML...
        const outerHTML = element.cloneNode().outerHTML
        // ...then split to get opening and closing tags
        const [openingTag, closingTag] = outerHTML.split(/(?=<\/)/); // lookahead trick
    
        const computedStyle = window.getComputedStyle(element);
        let isInline = computedStyle.display === 'inline';
        // Or if it's a <p> element with no attributes
        isInline = isInline || (element.tagName === 'P' && element.attributes.length === 0);
        // If inline with single text node, append the entire outer HTML
        const onlyChildIsText = element.childNodes.length === 1 && element.childNodes[0].nodeType === 3;
        const writeAsInline = isInline && onlyChildIsText;
        const onlyChildIsWhitespace = onlyChildIsText && !element.childNodes[0].nodeValue?.trim();
    
        if (writeAsInline || element.childNodes.length === 0) {
            output += padding + element.outerHTML;
        } else if (onlyChildIsWhitespace) {
            output += padding + openingTag + ' ' + closingTag;
        } else {
            // Otherwise, process child nodes recursively with increased indentation
            output += padding + openingTag
            element.childNodes.forEach(child => {
                if (child.nodeType === 1) {  
                    // Element node
                    output += '\n' + elementToString(child, indent, indentLevel + 1);
                } else if (child.nodeType === 3 && child.nodeValue.trim()) {  
                    // Text node with non-whitespace content
                    output += '\n' + padding + ' '.repeat(indent) + child.nodeValue.trim();
                }
            });
            // Append closing tag (if exists) in a new line with the current indentation
            if (closingTag) {
                output += '\n' + padding + closingTag;
            }
        }
    
        return output;
    }

    SRS.downloadHtml = (element, filename, autodate=true) => {
        const datestring = SRS.fileSafeDatestring();
        if (filename === undefined) {
            if (element.id) {
                filename = element.id;
            } else if (element.classList.length > 0) {
                filename = element.classList.join(".")
            }
        }
        if (filename === undefined) {
            filename = datestring;
        } else {
            if (filename.endsWith(".html")) {
                filename = filename.slice(0, -5)
            }
            if (autodate) {
                filename += "-" + datestring;
            }
        }
        const text = SRS.elementToString(element);
        const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename + ".html");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // https://stackoverflow.com/a/46118025
    SRS.copyToClipboard = function (text) {
        var dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        // execCommand is deprecated; TODO look into alternative
        document.execCommand("copy");
        document.body.removeChild(dummy);
    }

    SRS.style = function (css) {
        // look for style#srs-css
        let style = document.querySelector("style#srs-css");
        if (!style) {
            style = document.createElement("style");
            style.id = "srs-css";
            document.head.appendChild(style);
        } else {
            style.textContent += "\n/* *** */\n";
        }
        style.textContent += css;
    }

    /**
     * Set the max-width of an element and center it
     * @param {Element} element 
     * @param {string} width - CSS width value (default: "35em")
     */
    SRS.maxWidth = function(element, width="35em") {
        if (typeof width === "number") {
            width = `${width}em`
        }
        element.style.maxWidth = width;
        element.style.marginLeft = "auto";
        element.style.marginRight = "auto";
    }

    /**
     * Return the best guess for the page's main main text element
     * @returns {Element} - The element guessed to be the main article
     */
    SRS.guessMainArticle = function () {
        // If there's an article element, use that
        const article = document.querySelector("article");
        if (article) {
            return article;
        }
        // Next, try the element with the most paragraphs
        const paragraphs = [...document.querySelectorAll("p")];
        const grouped = paragraphs.reduce((acc, item) => {
            const key = item.parentElement
            if (!acc.has(key)) {
                acc.set(key, [])
            }
            acc.get(key).push(item)
            return acc
        }, new Map())
        const elementWithMostPs = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)[0][0]
        elementWithMostPs.maxWidth = (width) => SRS.maxWidth(elementWithMostPs, width)
        return elementWithMostPs
    }

    SRS.range = function* (start, stop, step=1) {
        if (stop === undefined) {
            stop = start;
            start = 0;
        }
        for (let i = start; i < stop; i += step) {
            yield i;
        }
    }

    // Callback functions for Array.prototype.sort()
    SRS.sorts = {};

    SRS.sorts.asc = (a, b) => a - b;
    SRS.sorts.desc = (a, b) => b - a;

    SRS.sorts.ascBy = (f) => (a, b) => f(a) - f(b);
    SRS.sorts.descBy = (f) => (a, b) => f(b) - f(a);

    SRS.sorts.ascByKey = (key) => (a, b) => a[key] - b[key];
    SRS.sorts.descByKey = (key) => (a, b) => b[key] - a[key];

    // A bunch of things which modify the prototype of Array and Object (and others)
    SRS.apply = () => {
        ///////////////////////
        //// Array Methods ////
        ///////////////////////

        /**
         * Returns a new Array containing the members of the calling array which are not in B
         * @param {Array} B
         * @returns {Array}
         */
        Array.prototype.notIn = function (B) {
            return this.filter(a => B.has ? !B.includes(a) : !B.has(a))
        }

        /**
         * Returns a new Array containing the members of the calling array which are also in B
         * @param {Array} B
         * @returns {Array}
         */
        Array.prototype.in = function (B) {
            return this.filter(a => B.has ? B.includes(a) : B.has(a))
        }

        /**
         * Returns an Object that groups the members of the calling array by the result of the callback
         * @param {Function} callback - Callback function which returns the key to group by
         * @returns {Object}
         */
        Array.prototype.groupBy = function (callback) {
            return this.reduce((acc, item) => {
                const key = callback(item)
                if (!acc[key]) {
                    acc[key] = []
                }
                acc[key].push(item)
                return acc
            }, {})
        }

        /**
         * Returns an Map that groups the members of the calling array by the result of the callback
         * @param {Function} callback - Callback function which returns the key to group by
         * @returns {Map}
         */
        Array.prototype.groupByAsMap = function (callback) {
            return this.reduce((acc, item) => {
                const key = callback(item)
                if (!acc.has(key)) {
                    acc.set(key, [])
                }
                acc.get(key).push(item)
                return acc
            }, new Map())
        }

        // Callback must return pair of [key, value]
        Array.prototype.objectFromEntries = function (callback) {
            if (callback === undefined) {
                return Object.fromEntries(this)
            }
            return Object.fromEntries(this.map(callback))
        }

        // As above, but callback returns key; value unchanged
        Array.prototype.keyBy = function (callback) {
            if (typeof callback === "string") {
                const key = callback
                callback = item => item[key]
            } else if (typeof callback !== "function") {
                throw new TypeError("Array.keyBy() requires a callback function or key string")
            }
            return this.objectFromEntries(item => [callback(item), item])
        }

        // Alias for when I forget which method goes to which collection because JS has no consistency
        Array.prototype.has = function (item) {
            console.warn("Arrays use Array.includes()")
            return this.includes(item)
        }

        // Return a Set of the unique values in the array
        Array.prototype.asSet = function () {
            return new Set(this)
        }

        // As above, but return an Array
        Array.prototype.unique = function () {
            return [...new Set(this)]
        }

        // Sorting aliases
        Array.prototype.sortAscending = function () { return this.sort(SRS.sorts.asc) }
        Array.prototype.sortDescending = function () { return this.sort(SRS.sorts.desc) }
        Array.prototype.sortAscBy = function (f) { return this.sort(SRS.sorts.ascBy(f)) }
        Array.prototype.sortDescgBy = function (f) { return this.sort(SRS.sorts.descBy(f)) }
        Array.prototype.sortAscByKey = function (key) { return this.sort(SRS.sorts.ascByKey(key)) }
        Array.prototype.sortDescByKey = function (key) { return this.sort(SRS.sorts.descByKey(key)) }

        ////////////////////////////
        //// Array-like Methods ////
        ////////////////////////////

        // Convert Array-like objects to Arrays

        // Convert NodeList to Array
        NodeList.prototype.toArray = function () {
            return Array.from(this);
        };

        // Convert HTMLCollection to Array
        HTMLCollection.prototype.toArray = function () {
            return Array.from(this);
        };

        // Get the hrefs of all links in a NodeList or HTMLCollection
        const hrefs = function () {
            return this.toArray().map(a => a?.href);
        }
        NodeList.prototype.hrefs = hrefs;
        HTMLCollection.prototype.hrefs = hrefs;

        /////////////////////////
        //// Object Methods /////
        /////////////////////////
        
        /**
         * Copy Object.keys(), Object.values(), and Object.entries() to prototype 
         * for convenience when playing with data
         * Warnings to remind you to use native methods in actual code
         */
        Object.prototype.keys = function () {
            console.warn("Use Object.keys(*) instead")
            return Object.keys(this);
        };

        Object.prototype.values = function () {
            console.warn("Use Object.values(*) instead")
            return Object.values(this);
        };

        Object.prototype.entries = function () {
            console.warn("Use Object.entries(*) instead")
            return Object.entries(this);
        };

        // Make Object iterable, using Object.entries()
        Object.prototype[Symbol.iterator] = function* () {
            for (let key of Object.keys(this)) {
                yield [key, this[key]];
            }
        };

        // Make Object filterable
        // Callback is ([k, v]) => boolean
        Object.prototype.filter = function (callback) {
            return Object.fromEntries(Object.entries(this).filter(callback));
        };

        // Make Object filterable, using the keys
        // Callback is (k) => boolean
        Object.prototype.filterByKey = function (callback) {
            return Object.fromEntries(Object.entries(this).filter(([k, _v]) => callback(k)));
        };

        // Make Object filterable using the values
        // Callback is (v) => boolean
        Object.prototype.filterByValue = function (callback) {
            return Object.fromEntries(Object.entries(this).filter(([_k, v]) => callback(v)));
        };

        // Callback is ([k, v]) => keyToGroupBy
        Object.prototype.groupBy = function (callback) {
            return Object.entries(this).groupBy(callback);
        };

        // Generic "PipeTo" function
        // Takes a function and applies it to the object
        // If given a string, it will look for a function with that name in the object's constructor
        Object.prototype.pipeTo = function (func) {
            if (typeof func === "string") {
                func = this.constructor.prototype[func];
            }
            return func(this);
        };

        /////////////////////////
        //// Promise Methods ////
        /////////////////////////

        // Wait a number of milliseconds and then resolve the promise with the original value
        Promise.prototype.wait = function (ms) {
            return this.then(
                value => new Promise(resolve => setTimeout(() => resolve(value), ms))
            );
        };

        // Store the value of the promise in a global variable
        Promise.prototype.store = function (name) {
            return this.then(value => window[name] = value);
        };

        // Log the value of the promise
        Promise.prototype.log = function () {
            return this.then(value => console.log(value) || value);
        };

        // Fetch methods:

        // .text() the response
        Promise.prototype.text = function () {
            return this.then(response => {
                if (!(response instanceof Response)) {
                    throw new TypeError(
                        "Promise.text() requires a Response object" +
                        "(was previous item in chain a fetch?)"
                    );
                }
                return response.text()
            });
        }

        // .json() the response
        Promise.prototype.json = function () {
            return this.then(response => {
                if (!(response instanceof Response)) {
                    throw new TypeError(
                        "Promise.json() requires a Response object" +
                        "(was previous item in chain a fetch?)"
                    );
                }
                return response.json()
            });
        }

        // return a document from the response
        Promise.prototype.asDocument = function () {
            return this.text().then(text => {
                const parser = new DOMParser();
                return parser.parseFromString(text, "text/html");
            });
        }

        ////////////////
        //// Other /////
        ////////////////

        // Custom Iterator for Number Prototype in JS
        // https://stackoverflow.com/questions/51608130/custom-iterator-for-number-prototype-in-js
        Number.prototype[Symbol.iterator] = function* () {
            for (var i = 0; i < this; i++) {
                yield i;
            }
        };

        // Log object in a chain
        Object.prototype.log = function() {
            console.log(this);
            return this;
        }
        
        // Log string in a chain
        String.prototype.log = function() {
            // Need toString() or it logs as a String object
            console.log(this.toString());
            return this;
        }

        // Copy string to clipboard
        String.prototype.copy = function() {
            SRS.copyToClipboard(this)
            return this
        }
    }

    window.srs = SRS;
})();
