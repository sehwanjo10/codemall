# Coupang Partners Modal Rule
**CRITICAL RULE**: Do not ever modify, break, or remove the Coupang Partners popup (modal) logic when editing files in this repository. 
The current structure works as follows and MUST be preserved at all times:
1. When a user first visits the site and clicks any link, the Coupang Partners modal opens, and a session storage flag (`coupang_visited`) is set to true.
2. Clicking the support button redirects the user to the Coupang affiliate link in a new tab, and then navigates them to their intended link.
3. While browsing the site within the same session (where `coupang_visited` is true), the popup is bypassed.
4. If the user leaves the page entirely (clearing the session storage) and returns, the popup will trigger again upon the first click.

Whenever making changes to `index.html`, `style.css`, or `script.js` (especially regarding `.intercepted-link`, `app-card`, or `.social-btn`), ensure that this logic remains fully intact and functional.
