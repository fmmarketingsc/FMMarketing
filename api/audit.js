module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Fetch the site HTML (8s timeout so the serverless fn doesn't hang)
  let siteHtml = '';
  let fetchNote = '';
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const siteRes = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMMarketing-Audit/1.0; +https://fmmarketingsc.com)' },
      redirect: 'follow',
    });
    clearTimeout(t);
    const text = await siteRes.text();
    siteHtml = text.slice(0, 12000); // stay within token budget
  } catch (e) {
    fetchNote = `Could not fetch the page (${e.message}). Analyze based on the URL only.`;
  }

  const systemPrompt = `You are a no-BS website auditor for FMMarketing, a Summerville SC agency that builds websites and AI tools for contractors (HVAC, roofing, plumbing, electrical, pest control, landscaping, painting).

Your job: give a fast, honest, specific audit a contractor can act on TODAY.

Respond in EXACTLY this structure (use the bold headers verbatim):

**3 Issues Costing You Jobs:**
• [Specific issue — explain the business impact in one line]
• [Specific issue — explain the business impact in one line]
• [Specific issue — explain the business impact in one line]

**What's Already Working:**
• [One genuine positive]
• [One genuine positive]

**Biggest Opportunity:**
[1–2 sentences. Name the single highest-ROI fix. Be direct and specific.]

Rules:
- Reference actual page content (title, headlines, CTAs, phone number visibility, etc.) when available
- If you couldn't fetch the site, say so briefly and audit based on the URL/domain
- Never say "consider" or "you might want to" — just say what to do
- Keep each bullet under 20 words`;

  const userContent = fetchNote
    ? `URL: ${url}\n\n${fetchNote}`
    : `URL: ${url}\n\nPage HTML (truncated):\n${siteHtml}`;

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fmmarketingsc.com',
        'X-Title': 'FMMarketing Site Audit',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });

    if (!aiRes.ok) return res.status(500).json({ error: 'AI service unavailable' });

    const data = await aiRes.json();
    const audit = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ audit, live: !fetchNote });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
