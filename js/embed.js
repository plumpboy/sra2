// Runs before the page renders: when shown inside another popup (SRA++), mark the page so the embedded
// styles apply from the first paint instead of after load
if (window.top !== window) document.documentElement.classList.add('embedded');
