export function getTextFromHtml(html) {
    return html.replace(/<[^>]*>/g, '');
}