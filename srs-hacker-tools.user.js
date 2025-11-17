// ==UserScript==
// @name         Sean's Really Swell Hacker Tools
// @namespace    http://srsutherland.dev
// @version      2025.11.16.1
// @author       srsutherland
// @description  A collection of tools for "hacking" websites and data to make javascript more convenient
// @match        *://*/*
// @icon         https://avatars.githubusercontent.com/u/12262958?v=4
// @tag          utilities
// @grant        none
// ==/UserScript==

(function() {
    // The longer this goes, the more I realize I'm just reimplementing lodash piecemeal
    const SRS = {};

    // eslint-disable-next-line no-redeclare
    /* global GM_info, unsafeWindow */
    SRS.version = GM_info.script.version;

    SRS.alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    SRS.ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    /**
     * Get a list of all global variables in the current window
     * (not all defined!).
     * 
     * (i.e., non-function, writable, enumerable, and configurable)
     * @see https://stackoverflow.com/a/52693392/2443695
     * @returns {string[]} - An array of global variable names
     */
    SRS.globals = () => {
        return Object.keys(window).filter(
            // is a value which is writable, enumerable, and configurable
            x => typeof(window[x]) !== 'function' && Object.entries(
                    Object.getOwnPropertyDescriptor(window, x)
                ).filter(
                    e => ['value', 'writable', 'enumerable', 'configurable']
                            .includes(e[0]) && e[1] === true
                ).length === 4
        )
    }

    /**
     * Get the Chrome DevTools command history
     * @returns {Array} - An array of console history entries
     */
    SRS.devtoolsHistory = () => {
        const history = JSON.parse(localStorage.getItem('console-history'))
        if (!history) {
            console.warn("Open DevTools on this DevTools (ctrl+shift+j) and run:") 
            console.warn(
                `%cJSON.parse(localStorage.getItem('console-history'))`,
                "background: rgba(120, 120, 120, 0.3); border: 1px solid darkgrey; padding: 4px;"
            )
            return []
        }
        return history
    }

    /**
     * Get a file-safe date string for use in filenames.
     * Uses the format YYYY-MM-DD-HHMM
     * @param {Date} date - (opt) Date object; defaults to current date/time
     * @returns {string} - A string like "2025-04-13-1530"
     */
    SRS.fileSafeDatestring = (date) => 
        (date || new Date()).toLocaleString('sv').replace(/ (\d+):(\d+):\d+/, "-$1$2")

    /**
     * Download text as a file.
     * @see modified from https://stackoverflow.com/a/30800715
     * @param {string} text - The text to download
     * @param {string} filename - Optional filename (without extension)
     * @param {boolean} autodate - Append current datetime to filename? (default: true)
     */
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

    /**
     * Download a JS object as a 2-space indented JSON file.
     * @see modified from https://stackoverflow.com/a/30800715
     * @param {Object} exportObj - The JSON object to download
     * @param {string} filename - Optional filename (without extension)
     * @param {boolean} autodate - Append the current datetime to filename? (default: true)
     */
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

    /**
     * Upload a JSON file and parse its contents.
     * @see modified from https://stackoverflow.com/a/67531239
     * @returns {Promise<Object>} - The parsed JSON object.
     */
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

    /**
     * Download an element's HTML as a file.
     * Uses `SRS.elementToString()` to format.
     * @see {@link SRS.elementToString}
     * @param {Element} element - The element to download
     * @param {string} filename - The filename to download as (optional)
     * @param {boolean} autodate - Whether to append the current date to the filename (default: true)
     */
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

    /**
     * Copy text to clipboard
     * @see https://stackoverflow.com/a/46118025
     * @param {string} text - The text to copy
     * @returns {string} - The original text (for chaining)
     */
    SRS.copyToClipboard = (text) => {
        const dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        // execCommand is deprecated; TODO look into alternative
        document.execCommand("copy");
        document.body.removeChild(dummy);
        return text;
    }

    /** 
     * Add lines of CSS to `<style id="srs-css">` in document head
     * @param {string} css - The CSS to add
     */
    SRS.style = (css) => {
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
    SRS.maxWidth = (element, width="35em") => {
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

    /**
     * Set up a mutationobserver to collect unique children from a dynamic list as you scroll
     * @param {Element} element - The element containing the dynamic list
     * @param {Function} keyFunction - (opt) Function to map children to unique keys (defaults to outerHTML)
     * @param {boolean} log - (opt) Whether to log collection to console (default: true)
     * @returns {Map} - A Map collecting the elements by key
     */
    SRS.collect = (element, keyFunction, log=true) => {
        if (!(element instanceof Element)) {
            throw new TypeError("SRS.collect: param 'element' must be of type Element");
        }
        if (keyFunction === undefined) {
            keyFunction = (el) => el.outerHTML;
        } else if (typeof keyFunction !== "function") {
            throw new TypeError("SRS.collect: param 'keyFunction' must be a function");
        }

        const collector = new Map();
        SRS.collect._collectors.push(collector);

        const firstLastKeys = [undefined, undefined];
        const collectItem = (node) => {
            const key = keyFunction(node);
            if (key === undefined) {
                console.warn("SRS.collect: keyFunction returned undefined for node:");
                console.warn(node);
                return;
            }
            collector.set(key, node);
            if (firstLastKeys[0] === undefined) {
                firstLastKeys[0] = key;
            }
            firstLastKeys[1] = key;
        };
        const announceCollection = () => {
            if (!log) { return; }
            let [firstKey, lastKey] = firstLastKeys;
            // if keys are longer than 20 chars, replace with longkeynamepart[+length]
            if (firstKey && firstKey.length > 20) {
                firstKey = `${firstKey.slice(0, 15)}[+${firstKey.length-17}]`;
            }
            if (lastKey && lastKey.length > 20) {
                lastKey = `${lastKey.slice(0, 15)}[+${lastKey.length-17}]`;
            }
            let append = `(${firstKey}...${lastKey})`;
            firstLastKeys[0] = undefined;
            firstLastKeys[1] = undefined;

            console.log(`SRS.collect: Collected ${collector.size} items ${append}`);
        };

        // Collect existing children
        element.childNodes.forEach(collectItem);
        announceCollection();
        // Collect future children
        const observer = new MutationObserver((mutations) => {
            const previousSize = collector.size;
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        const isElement = node.nodeType === Node.ELEMENT_NODE;
                        const isDirectChild = node.parentElement === element;
                        if (isElement && isDirectChild) {
                            collectItem(node);
                        }
                    }
                }
            }
            if (collector.size > previousSize) {
                announceCollection();
            }
        });
        observer.observe(element, { childList: true, subtree: true });
        SRS.collect._observers.get(element)?.disconnect();
        SRS.collect._observers.set(element, observer);
        return collector;
    }

    // Internal map of element -> observer for SRS.collect
    SRS.collect._observers = new Map();

    // Internal array of collectors maps for SRS.collect, in order of creation
    SRS.collect._collectors = new Array();

    /**
    * Stop `SRS.collect`ing
    * @param {Element} element - (opt) The element to stop collecting for. 
    *   If omitted, stops all observers
    */
    SRS.collect.stop = (element) => {
        // if `element` is undefined, stop all observers
        if (element === undefined) {
            for (const [elem, observer] of SRS.collect._observers.entries()) {
                observer.disconnect();
                SRS.collect._observers.delete(elem);
            }
            return;
        }
        const observer = SRS.collect._observers.get(element);
        if (observer) {
            observer.disconnect();
            SRS.collect._observers.delete(element);
        }
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

    if (window.srs) {
        // Already loaded from another script instance; compare semvers
        // Can't parseint here because the final version part may have letters
        const existingVersion = window.srs.version //.split('.');
        const thisVersion = SRS.version //.split('.');
        // first three are YYYY.MM.DD, then optional build/patch.
        // Compare the date parts first,
        // then iff equal, compare the build/patch part lexically, with undefined < defined
        const compareVersions = (a, b) => {
            if (a === b) { return 0 }
            if (typeof a === 'string') { a = a.split('.') }
            if (typeof b === 'string') { b = b.split('.') }
            const [aY, aM, aD] = a.slice(0, 3).map(n => Number(n));
            const [bY, bM, bD] = b.slice(0, 3).map(n => Number(n));
            if (aY !== bY) { return aY - bY }
            if (aM !== bM) { return aM - bM }
            if (aD !== bD) { return aD - bD }
            const aBuild = a[3];
            const bBuild = b[3];
            if (aBuild === undefined && bBuild === undefined) { return 0 }
            if (aBuild === undefined) { return -1 }
            if (bBuild === undefined) { return 1 }
            if (aBuild === bBuild) { return 0 }
            return aBuild > bBuild ? 1 : -1; // lexical compare
        };

        const isNewer = compareVersions(thisVersion, existingVersion) > 0;
        

        if (!isNewer) {
            console.info(
                `SRS version ${SRS.version} is not newer than existing version ${window.srs.version}.`
            );
            return;
        }
        console.info(
            `SRS version ${SRS.version} is newer than existing version ${window.srs.version}. ` +
            `Overriding existing SRS.`
        );
    }
    window.srs = SRS;
    window.SRS = SRS;
})();
