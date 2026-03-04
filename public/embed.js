/**
 * Digs & Gigs Embeddable Widget
 * 
 * Usage:
 * <div id="digs-gigs-widget" data-ref="YOUR_REFERRAL_CODE"></div>
 * <script src="https://digsandgigs.net/embed.js"></script>
 */
(function() {
  var container = document.getElementById('digs-gigs-widget');
  if (!container) {
    console.warn('Digs & Gigs: #digs-gigs-widget element not found');
    return;
  }

  var ref = container.getAttribute('data-ref') || '';
  var baseUrl = 'https://digsandgigs.net';
  var src = baseUrl + '/embed-widget' + (ref ? '?ref=' + encodeURIComponent(ref) : '');

  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.width = '100%';
  iframe.style.minHeight = '800px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('title', 'Post a Project on Digs & Gigs');
  iframe.setAttribute('loading', 'lazy');

  // Auto-resize iframe based on content
  window.addEventListener('message', function(event) {
    if (event.origin !== baseUrl) return;
    if (event.data && event.data.type === 'digs-gigs-resize') {
      iframe.style.height = event.data.height + 'px';
    }
  });

  container.appendChild(iframe);
})();
