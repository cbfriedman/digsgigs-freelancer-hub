GOOGLE SEARCH CONSOLE VERIFICATION FILE LOCATION
==================================================

This folder is where you should place your Google Search Console 
verification HTML file.

INSTRUCTIONS:
-------------
1. Go to https://search.google.com/search-console
2. Add your property (website domain)
3. Choose "HTML file upload" verification method
4. Download the verification HTML file from Google
5. Place that file in THIS folder (public/)
6. Deploy to production
7. Verify in Google Search Console

FILE FORMAT:
-----------
The file will be named something like:
- google1234567890.html
- google-site-verification.html

IMPORTANT:
----------
- Keep the EXACT filename as provided by Google
- Don't modify the file content
- File must be in public/ folder (not src/)
- Deploy before verifying

ACCESS:
-------
Once deployed, the file will be accessible at:
https://yourdomain.com/google1234567890.html

For detailed instructions, see:
- GOOGLE_SEARCH_CONSOLE_QUICK_START.md (project root)
- public/GOOGLE_SEARCH_CONSOLE_SETUP.md
