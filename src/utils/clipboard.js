import clipboard from 'clipboardy';

export async function copyToClipboard(text) {
  try {
    await clipboard.write(text);
    // silent success
  } catch (err) {
    // silent fail - clipboard is nice-to-have
  }
}