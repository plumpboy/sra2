// Apply Web Store updates as soon as they are downloaded instead of waiting for the browser to go idle
chrome.runtime.onUpdateAvailable.addListener(() => chrome.runtime.reload());

chrome.runtime.onStartup.addListener(() => chrome.runtime.requestUpdateCheck());
chrome.runtime.onInstalled.addListener(() => chrome.runtime.requestUpdateCheck());
