import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { record } = await req.json();

        // Only send if status actually changed to completed
        if (record.status !== 'completed') {
            return new Response(JSON.stringify({ message: 'Not completed' }), { status: 200 });
        }

        // Fetch question details, votes, and group name
        const { data: question, error: qError } = await supabase
            .from('questions')
            .select('*, groups(name), votes(vote, user_id)')
            .eq('id', record.id)
            .single();

        if (qError || !question) throw qError || new Error('Question not found');

        // Fetch member emails
        const { data: members, error: mError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', question.group_id);

        if (mError) throw mError;

        // In a real scenario, we'd fetch emails from auth.users (requires service role)
        // For this demo, let's assume we have a list of emails or use the member IDs
        const emails = ['lucasvanhoutven@gmail.com']; // Placeholder or implementation for fetching emails

        const voteSummary = question.votes.reduce((acc: any, v: any) => {
            acc[v.vote] = (acc[v.vote] || 0) + 1;
            return acc;
        }, { yes: 0, no: 0, abstain: 0 });

        const emailContent = `
      <h1>Resultaat Stemming: ${question.title}</h1>
      <p>De stemming voor <strong>${question.groups.name}</strong> is voltooid.</p>
      <hr />
      <ul>
        <li>Akkoord: ${voteSummary.yes}</li>
        <li>Niet Akkoord: ${voteSummary.no}</li>
        <li>Onthouding: ${voteSummary.abstain}</li>
      </ul>
      <p>Details: ${question.description}</p>
    `;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Karthuizer Voting <notifications@resend.dev>',
                to: emails,
                subject: `Resultaat: ${question.title}`,
                html: emailContent,
            }),
        });

        return new Response(JSON.stringify({ status: 'sent', res: await res.json() }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
