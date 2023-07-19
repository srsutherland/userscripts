// ==UserScript==
// @name         Sean's Really Slick Hacker Tools
// @namespace    http://srsutherland.dev
// @version      2023.07.19.1
// @author       srsutherland
// @description  A collection of tools for hacking websites and data to make javascript more convenient
// @match        *://*/*
// @icon         https://avatars.githubusercontent.com/u/12262958?v=4
// @grant        none
// ==/UserScript==

(function() {
    const SRS = {};

    // List all js global variables used by site (not all defined!)
    // https://stackoverflow.com/a/52693392/2443695
    SRS.globals = () => {
        return Object.keys(window).filter(x => typeof(window[x]) !== 'function' &&
            Object.entries(
                Object.getOwnPropertyDescriptor(window, x)).filter(e =>
                ['value', 'writable', 'enumerable', 'configurable'].includes(e[0]) && e[1]
                ).length === 4)
    }

    SRS.fileSafeDatestring = (date) => (date || new Date()).toLocaleString('sv').replace(/ (\d+):(\d+):\d+/, "-$1$2")

    SRS.download = (text, filename, autodate=true) => {
        const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
        if (filename === undefined) {
            SRS.fileSafeDatestring()
        } else {
            if (autodate) {
                filename += "-" + SRS.fileSafeDatestring()
            }
        }
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename + ".txt");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    SRS.downloadJSON = (exportObj, filename, autodate=true) => {
        if (filename === undefined) {
            filename = "download";
        } else {
            if (filename.endsWith(".json")) {
                filename = filename.slice(0, -5)
            }
        }
        if (autodate) {
            filename += "-" + SRS.fileSafeDatestring()
        }
        const dataStr = "data:text/json;charset=utf-8," + 
            encodeURIComponent(JSON.stringify(exportObj));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

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

    // A bunch of things which modify the prototype of Array and Object
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

        // Callback must return pair of [key, value]
        Array.prototype.objectFromEntries = function (callback) {
            return Object.fromEntries(this.map(callback))
        }

        // As above, but callback returns key; value unchanged
        Array.prototype.keyBy = function (callback) {
            return this.objectFromEntries(item => [callback(item), item])
        }

        // Alias for when I forget which method goes to which collection because JS has no consistency
        Array.prototype.has = function (item) {
            console.warn("Arrays use Array.includes()")
            return this.includes(item)
        }

        // Sorting aliases
        Array.prototype.sortAscending = function () { return this.sort(SRS.sorts.asc) }
        Array.prototype.sortDescending = function () { return this.sort(SRS.sorts.desc) }
        Array.prototype.sortAscBy = function (f) { return this.sort(SRS.sorts.ascBy(f)) }
        Array.prototype.sortDescgBy = function (f) { return this.sort(SRS.sorts.descBy(f)) }
        Array.prototype.sortAscByKey = function (key) { return this.sort(SRS.sorts.ascByKey(key)) }
        Array.prototype.sortDescByKey = function (key) { return this.sort(SRS.sorts.descByKey(key)) }

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

        // Callback is ([k, v]) => keyToGroupBy
        Object.prototype.groupBy = function (callback) {
            return Object.entries(this).groupBy(callback);
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
                    throw new TypeError("Promise.text() requires a Response object (was previous item in chain a fetch?)");
                }
                return response.text()
            });
        }

        // .json() the response
        Promise.prototype.json = function () {
            return this.then(response => {
                if (!(response instanceof Response)) {
                    throw new TypeError("Promise.json() requires a Response object (was previous item in chain a fetch?)");
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
    }

    window.srs = SRS;
})();
