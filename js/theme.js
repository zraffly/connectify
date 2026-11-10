// Apply the saved theme before the first paint. Light is the default.
try {
  const theme = localStorage.getItem('connectify-artur:theme');
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
} catch { document.documentElement.dataset.theme = 'light'; }
