import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
    try {
        // Use service role key to access auth.users
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

        // Fetch member user IDs for this group
        const { data: members, error: mError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', question.group_id);

        if (mError) throw mError;

        // Fetch emails from auth.users using service role
        const memberIds = members?.map(m => m.user_id) || [];
        const emails: string[] = [];
        
        for (const userId of memberIds) {
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
            if (!userError && userData?.user?.email) {
                emails.push(userData.user.email);
            }
        }

        if (emails.length === 0) {
            return new Response(JSON.stringify({ message: 'No member emails found' }), { status: 200 });
        }

        const voteSummary = question.votes.reduce((acc: Record<string, number>, v: { vote: string }) => {
            if (v.vote === 'yes' || v.vote === 'no' || v.vote === 'abstain') {
                acc[v.vote] = (acc[v.vote] || 0) + 1;
            }
            return acc;
        }, { yes: 0, no: 0, abstain: 0 });

        // Determine result
        let resultText = 'Geen meerderheid';
        if (voteSummary.yes > voteSummary.no) {
            resultText = '✅ Goedgekeurd';
        } else if (voteSummary.no > voteSummary.yes) {
            resultText = '❌ Afgewezen';
        }

        const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1c1917; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #5e4339; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
        .content { background: #fafaf9; padding: 24px; border: 1px solid #e7e5e4; border-top: none; border-radius: 0 0 8px 8px; }
        .result { font-size: 24px; font-weight: bold; margin: 16px 0; }
        .votes { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; }
        .vote-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e7e5e4; }
        .vote-row:last-child { border-bottom: none; }
        .footer { text-align: center; color: #78716c; font-size: 12px; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">Stemming Afgerond</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">${question.groups.name}</p>
        </div>
        <div class="content">
            <h2 style="margin-top: 0;">${question.title}</h2>
            <p>${question.description || 'Geen beschrijving'}</p>
            
            <div class="result">${resultText}</div>
            
            <div class="votes">
                <div class="vote-row">
                    <span>✅ Akkoord</span>
                    <strong>${voteSummary.yes}</strong>
                </div>
                <div class="vote-row">
                    <span>❌ Niet Akkoord</span>
                    <strong>${voteSummary.no}</strong>
                </div>
                <div class="vote-row">
                    <span>➖ Onthouding</span>
                    <strong>${voteSummary.abstain}</strong>
                </div>
            </div>
            
            <div class="footer">
                <p>Dit is een automatisch bericht van het Karthuizer Voting Platform.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Karthuizer Voting <johanvanhoutven@gmail.com>',
                to: emails,
                subject: `${resultText} - ${question.title}`,
                html: emailContent,
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Resend API error (${res.status}): ${errorText}`);
        }

        const resData = await res.json();
        
        return new Response(JSON.stringify({ 
            status: 'sent', 
            emailsSentTo: emails.length,
            result: resultText,
            response: resData 
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('Error sending vote results:', err);
        return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
    }
});
