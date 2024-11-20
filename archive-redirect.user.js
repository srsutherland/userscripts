// ==UserScript==
// @name         Internet Archive Redirect
// @namespace    http://srsutherland.dev
// @version      2024.11.20.1
// @author       srsutherland
// @description  Redirect error pages to the internet archive
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.archive.org
// @grant        none
// ==/UserScript==

(function () {
    class ArchiveRedirect {
        constructor() {
            this.run();
        }

        async _fetch_latest_archive(url) {
            const api = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
            return fetch(api)
                .then(response => response.json())
                .then(
                    data => {
                        this._data = data;
                        const new_url = data.archived_snapshots?.closest?.url
                        if (!new_url) {
                            console.log('No Archive Found');
                            this._no_archive = true;
                        }
                        return new_url ? new_url : `https://web.archive.org/web/20250000000000*/${url}`
                    }
                ).then(
                    latest_archive => {
                        console.log('Latest Archive is ', latest_archive);
                        return latest_archive;
                    }
                );
        }

        async latest_archive() {
            const this_url = window.location.href;
            if (this._latest_archive == undefined) {
                this._latest_archive = await this._fetch_latest_archive(this_url);
            }
            return this._latest_archive;
        }

        async redirect_to_archive() {
            const hourglass_emoji = '⏳';
            console.log('Redirecting to Archive');
            this.redirect_button.innerText += ` ${hourglass_emoji}`;
            this.always_button.innerText += ` ${hourglass_emoji}`;
            const archive_url = await this.latest_archive();
            console.log('Redirecting to ', archive_url);
            window.location = archive_url;
        }

        check_for_404() {
            const status = document.querySelector('meta[name="robots"][content="noindex"]');
            if (status) {
                this.redirect_to_archive();
            }
        }

        is_error_in_title() {
            const title = document.title;
            const possible_errors = [
                '404',
                //'Error', 
                'Not Found',
                'Page Not Found',
                '500',
                '503',
                '403',
            ];
            // These sites might give false positives because they *discuss* errors
            const whitelist_domains = [
                'google.com',
                'wikipedia.org',
                'github.com',
                'stackoverflow.com',
                'serverfault.com',
                'superuser.com',
                'youtube.com',
                'reddit.com',
            ];
            if (whitelist_domains.some(domain => window.location.href.includes(domain))) {
                return false;
            }
            return possible_errors.some(error => title.includes(error));
        }

        cloudflare_error() {
            const cf_error = document.querySelector('#cf-error-details');
            return cf_error != null;
        }

        is_blocked() {
            const title = document.title;
            const possible_titles = [
                "Internet Security by Zscaler"
            ];
            return possible_titles.some(error => title.includes(error));
        }

        is_bad_state() {
            const trigger =
                this.is_error_in_title() ||
                this.cloudflare_error() ||
                this.is_blocked();
            return trigger;
        }

        referrer_is_hugger() {
            const referrer = document.referrer;
            const huggers = [
                'news.ycombinator.com',
                'reddit.com',
            ];
            return huggers.some(hugger => referrer.includes(hugger));
        }

        get_always_redirect() {
            const value = localStorage.getItem('always_redirect');
            if (value == 'true') {
                return true;
            }
            if (value == 'false') {
                return false;
            }
            return value;
        }

        set_always_redirect(value = true) {
            localStorage.setItem('always_redirect', value);
        }

        run() {
            if (!this.is_bad_state()) {
                return;
            }
            this.latest_archive();
            if (this.get_always_redirect() == true) {
                console.log('"Always Redirect" is set');
                this.redirect_to_archive();
            }
            if (this.referrer_is_hugger()) {
                console.log(`Referrer ${document.referrer} is a known hugger`);
                this.redirect_to_archive();
            }
            // else, create two buttons
            const head = document.querySelector('head');
            const styles = document.createElement('style');
            styles.id = 'archive-redirect-styles';
            styles.innerHTML = `
                .archive-redirect-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    width: 100vw;
                }
                .archive-redirect-button {
                    padding: 1em;
                    margin: 1em;
                    border: none;
                    background-color: #f33; /* red */
                    color: white;
                    cursor: pointer;
                }
            `;
            head.appendChild(styles);

            const body = document.querySelector('body');
            const container = document.createElement('div');
            container.classList.add('archive-redirect-container');

            const redirect_button = document.createElement('button');
            redirect_button.innerText = 'Redirect to Archive';
            redirect_button.classList.add('archive-redirect-button');
            redirect_button.addEventListener('click', () => this.redirect_to_archive());
            this.redirect_button = redirect_button;

            const always_button = document.createElement('button');
            always_button.innerText = 'Always Redirect to Archive';
            always_button.classList.add('archive-redirect-button');
            always_button.addEventListener('click', () => {
                this.set_always_redirect();
                this.redirect_to_archive();
            });
            this.always_button = always_button;

            container.appendChild(redirect_button);
            container.appendChild(always_button);
            body.appendChild(container);
        }
    }

    const archiveRedirect = new ArchiveRedirect();
    window.archive_redirect_extension = archiveRedirect;
})();