// ==UserScript==
// @name         Bing AI Image History Saver
// @namespace    http://srsutherland.dev
// @version      2023.10.12
// @description  Save the "recently created" images from Bing AI Image Search to HTML files for later review
// @author       srsutherland
// @match        https://www.bing.com/images/create*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.bing.com
// @grant        none
// ==/UserScript==

(function() {
    function elementToString(element, indent = 2, indentLevel = 0) {
        let output = '';
        const padding = ' '.repeat(indent * indentLevel);

        // Clone the element and get its outer HTML, then split to get opening and closing tags
        const [openingTag, closingTag] = element.cloneNode().outerHTML.split(/(?=<\/)/); // lookahead trick

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
                if (child.nodeType === 1) {  // Element node
                    output += '\n' + elementToString(child, indent, indentLevel + 1);
                } else if (child.nodeType === 3 && child.nodeValue.trim()) {  // Text node with non-whitespace content
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

    function downloadHtml(element, filename, autodate=true) {
        const datestring = (new Date()).toLocaleString('sv').replace(/ (\d+):(\d+):\d+/, "-$1$2")
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
        const text = elementToString(element);
        const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", filename + ".html");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function downloadHistory() {
        // Step 1: Deep copy the node
        var originalNode = document.getElementById('girrcc');
        var clonedNode = originalNode.cloneNode(true);

        // Step 2: Insert the CSS
        var styleElement = document.createElement('style');
        styleElement.textContent = `
            #girrcc .girr_set::before, #girrcc .girr_blocked::before {
                content: attr(title);
                display: block;
            }
            #girrcc .girr_set, #girrcc .girr_blocked {
                margin: 5px;
                border: 2px solid grey;
                padding: 5px;
                display: block;
                width: fit-content;
            }
            .girr_blorur_blocked {
                content: url(https://bing.com/rp/VTqhetI55lu8yUE9IpfFr7gYmHk.svg);
                filter: invert(1);
            }
            .girr_blorur_icon {
                margin-right: 7px;
                height: 18px;
                width: 18px;
            }
            .girr_blorur_info {display:flex}
        `;

        // Step 2.5: Insert the base and style elements
        var baseElement = document.createElement('base');
        baseElement.href = 'https://bing.com';
        clonedNode.prepend(baseElement, styleElement);  // This makes style the second element, base the first

        // Step 3: Increase image dimensions
        var images = clonedNode.querySelectorAll('img');
        images.forEach(img => {
            var src = img.src;
            if (src.includes('https://th.bing.com/th/id/OIG')) {
                img.src = src.replace(/w=\d+&h=\d+/, 'w=250&h=250');
            }
        });

        // Step 4: DL the cloned node
        downloadHtml(clonedNode);
    }

    // Download on ctrl+s/cmd+s
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            downloadHistory();
        }
    });

})();
