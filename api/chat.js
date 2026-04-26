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
    systemPrompt = `You are a lead qualification specialist for FM AI, a custom AI agent development company. Based on the lead info provided, write ONE short personalized sentence (max 30 words) that acknowledges their specific challenge and tells them what to expect next. Be warm, direct, and specific. No generic lines.`;
    const { role, challenge, email, phone } = leadData || {};
    const challengeMap = {
      leads: 'not getting enough leads',
      followup: 'missing calls and slow follow-up',
      automation: 'spending too much time on manual tasks',
      scaling: 'struggling to scale their operations',
    };
    userMessages = [{
      role: 'user',
      content: `Lead info — Role: ${role}, Challenge: ${challengeMap[challenge] || challenge}, Email: ${email || 'not provided'}, Phone: ${phone || 'not provided'}. Write the personalized message now.`
    }];
  } else if (type === 'contact-reply') {
    systemPrompt = `You are writing a warm, personalized confirmation message for FM AI, a custom AI agent development company based in South Carolina. Based on the contact form submission, write exactly 2 sentences acknowledging their specific situation and expressing genuine excitement about helping them automate and grow their business. Be warm, professional, and specific to their business type or problem. No generic lines.`;
    const { name, business, message } = contactData || {};
    userMessages = [{
      role: 'user',
      content: `Name: ${name}, Business: ${business || 'not provided'}, Message: "${message || 'no message'}". Write the personalized confirmation now.`
    }];
  } else {
    systemPrompt = `You are a helpful AI assistant for FM AI (fmmarketingsc.com), a custom AI agent development and consulting company based in South Carolina. We help businesses of ALL types and industries deploy AI agents that work 24/7 to handle their leads, customer service, bookings, and automation needs.

Our services:
- AI Chat Agents: Custom-trained chatbots for websites that qualify leads, answer questions, and book appointments 24/7 — trained on your specific business
- AI Voice Agents: Answer every inbound call 24/7, qualify callers, schedule appointments, send call transcripts automatically
- AI Consulting & Strategy: Full workflow audits, AI roadmaps, implementation guidance, and ROI-focused strategy for any business adopting AI
- Website + AI System: Custom-coded websites (no templates) with AI agents built in from day one — live in 48 hours

We work with businesses in ANY industry: real estate, healthcare, legal, e-commerce, financial services, restaurants, home services, fitness, education, insurance, tech & SaaS, logistics, and more. If a business talks to customers, we can automate it.

Pricing tiers:
- Plain Website (no AI): $150 setup + $30/month
- Starter (AI Chat Agent): Starting at $450 setup, retainer quoted on call
- Growth (Chat + Voice Bundle): Custom-quoted based on business needs
- Full AI System: Custom-quoted based on business needs

Contact: 843-327-0032 | fabianomatos@fmmarketingsc.com | Instagram: @fmmarketingsc
Location: South Carolina (but we serve clients nationwide)

Keep responses helpful, confident, and concise (2-4 sentences max). If someone asks about pricing details, invite them to book a free 15-minute strategy call at the Contact page or call 843-327-0032. If you cannot answer something specific, offer to connect them with Fabiano directly. Never make up specific case study numbers you don't know.`;
    userMessages = messages || [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fmmarketingsc.com',
        'X-Title': 'FM AI',
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
