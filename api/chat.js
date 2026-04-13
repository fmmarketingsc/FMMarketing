module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { type, messages, leadData, contactData } = req.body || {};

  let systemPrompt = '';
  let userMessages = [];

  if (type === 'qualify') {
    systemPrompt = `You are a lead qualification specialist for FMMarketing, an AI-powered lead generation agency for local service businesses in South Carolina. Based on the lead info provided, write ONE short personalized sentence (max 30 words) that acknowledges their specific challenge and tells them what to expect next. Be warm, direct, and specific. No generic lines.`;
    const { role, challenge, email, phone } = leadData || {};
    const challengeMap = {
      leads: 'not getting enough leads',
      followup: 'missing calls and slow follow-up',
      website: 'no website or an outdated site',
      scaling: 'struggling to scale their business',
    };
    userMessages = [{
      role: 'user',
      content: `Lead info — Role: ${role}, Challenge: ${challengeMap[challenge] || challenge}, Email: ${email || 'not provided'}, Phone: ${phone || 'not provided'}. Write the personalized message now.`
    }];
  } else if (type === 'contact-reply') {
    systemPrompt = `You are writing a warm, personalized confirmation message for FMMarketing, an AI-powered lead generation agency. Based on the contact form submission, write exactly 2 sentences acknowledging their specific situation and expressing genuine excitement about helping them grow. Be warm, professional, and specific to their business or message. No generic lines.`;
    const { name, business, message } = contactData || {};
    userMessages = [{
      role: 'user',
      content: `Name: ${name}, Business: ${business || 'not provided'}, Message: "${message || 'no message'}". Write the personalized confirmation now.`
    }];
  } else {
    systemPrompt = `You are a helpful AI assistant for FMMarketing, an AI-powered lead generation agency based in South Carolina. We help local service businesses (contractors, plumbers, electricians, landscapers, roofers, etc.) get more leads through:
- AI-Powered Websites: Custom-built, conversion-optimized, live in 48 hours
- Lead Capture & Follow-up: Automated SMS/email response within 60 seconds of a lead
- AI Chat Agent: 24/7 website chatbot that qualifies and captures leads
- AI Voice Agent: Answers calls, qualifies leads, and books appointments automatically

Contact: 843-327-0032 | fabianovelloso1234@gmail.com | Instagram: @fmmarketingsc

Keep responses helpful, confident, and concise (2-4 sentences max). If someone asks about pricing, invite them to fill out the contact form or call 843-327-0032. If you cannot answer something specific, offer to connect them with a human. Never make up specific pricing numbers.`;
    userMessages = messages || [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fmmarketingsc.com',
        'X-Title': 'FMMarketing',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...userMessages],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
