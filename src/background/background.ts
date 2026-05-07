chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'convert-text') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'CONVERT_TEXT' });
      } catch {
        // Content script not available on this tab (chrome:// pages, etc.)
      }
    }
  }
});
