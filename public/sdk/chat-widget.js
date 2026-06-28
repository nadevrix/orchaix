(function() {
  // Prevent duplicate initialization
  if (window.__OrchaixWidgetLoaded__) return;
  window.__OrchaixWidgetLoaded__ = true;
 
  // 1. Find the script tag and extract parameters
  const script = document.currentScript || document.querySelector('script[data-agent-id]') || document.querySelector('script[data-project-id]');
  if (!script) {
    console.error('Orchaix Widget Error: Script tag not found.');
    return;
  }
 
  const agentId = script.getAttribute('data-agent-id') || script.getAttribute('data-project-id');
  if (!agentId) {
    console.error('Orchaix Widget Error: data-agent-id attribute is missing.');
    return;
  }
 
  // Auto-detect base URL from script src
  const scriptSrc = new URL(script.src);
  const baseUrl = scriptSrc.origin;
 
  // 2. Inject CSS Styles
  const style = document.createElement('style');
  style.textContent = `
    #orchaix-widget-wrapper {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    #orchaix-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background-color: #6366f1;
      border: none;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    
    #orchaix-widget-button:hover {
      transform: scale(1.08);
      background-color: #4f46e5;
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }
    
    #orchaix-widget-button:active {
      transform: scale(0.95);
    }
    
    #orchaix-widget-button svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.3s ease;
    }
    
    #orchaix-widget-container {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 580px;
      max-height: calc(100vh - 120px);
      background: transparent;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    
    #orchaix-widget-container.active {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: auto;
    }
    
    #orchaix-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 16px;
      background: #18181b;
    }
    
    /* Responsive adjustment for small devices */
    @media (max-width: 450px) {
      #orchaix-widget-wrapper {
        bottom: 16px;
        right: 16px;
      }
      #orchaix-widget-container {
        right: 16px;
        left: 16px;
        width: auto;
        bottom: 84px;
        height: calc(100vh - 110px);
      }
    }
  `;
  document.head.appendChild(style);
 
  // 3. Build HTML elements
  const wrapper = document.createElement('div');
  wrapper.id = 'orchaix-widget-wrapper';
 
  const container = document.createElement('div');
  container.id = 'orchaix-widget-container';
 
  const iframe = document.createElement('iframe');
  iframe.id = 'orchaix-widget-iframe';
  iframe.src = `${baseUrl}/widget?agentId=${agentId}`;
  iframe.title = 'Orchaix Assistant';
  iframe.allow = 'clipboard-read; clipboard-write';
 
  const button = document.createElement('button');
  button.id = 'orchaix-widget-button';
  button.setAttribute('aria-label', 'Open chatbot');
  
  // Bot/Chat SVG Icon
  button.innerHTML = `
    <svg viewBox="0 0 24 24" id="orchaix-icon-open">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <svg viewBox="0 0 24 24" id="orchaix-icon-close" style="display:none; transform: rotate(90deg);">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
 
  // Assemble elements
  container.appendChild(iframe);
  wrapper.appendChild(container);
  wrapper.appendChild(button);
  document.body.appendChild(wrapper);
 
  // 4. Toggle Event Listeners
  let isOpen = false;
  const iconOpen = button.querySelector('#orchaix-icon-open');
  const iconClose = button.querySelector('#orchaix-icon-close');
 
  button.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.add('active');
      iconOpen.style.display = 'none';
      iconClose.style.display = 'block';
    } else {
      container.classList.remove('active');
      iconOpen.style.display = 'block';
      iconClose.style.display = 'none';
    }
  });
})();
