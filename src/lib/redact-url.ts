/**
 * Drop the query string and fragment of every http(s) URL in a piece of
 * text, keeping scheme://host/path. Errors that sensors report often quote
 * signed download URLs (GitHub release assets, S3, GCS) whose query string
 * carries a token; this keeps them readable without showing the token.
 *
 *   redactUrlQueries('Get "https://h.example/a/b?sig=secret&se=1": EOF')
 *   // 'Get "https://h.example/a/b?…": EOF'
 */
export function redactUrlQueries(text: string): string
export function redactUrlQueries(text: string | null | undefined): string | null | undefined
export function redactUrlQueries(text: string | null | undefined): string | null | undefined {
  if (!text) return text
  return text.replace(/\bhttps?:\/\/[^\s"'<>]+/gi, (url) => {
    const cut = url.search(/[?#]/)
    return cut === -1 ? url : `${url.slice(0, cut)}?…`
  })
}
