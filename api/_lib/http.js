export function json(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '))
  json(res, 405, { message: 'Metodo no permitido.' })
}

export function nodeHeaders(req) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers || {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry))
    } else if (value != null) {
      headers.set(key, value)
    }
  }

  return headers
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string') {
    return req.body ? JSON.parse(req.body) : {}
  }

  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}
