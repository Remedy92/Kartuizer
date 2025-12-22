import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
    try {
        // Use anon key - emails are stored in user_profiles table
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

        // Fetch emails from user_profiles table
        const memberIds = members?.map(m => m.user_id) || [];
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('email')
            .in('id', memberIds);
        const emails = profiles?.map(p => p.email).filter(Boolean) || [];

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

        // Determine colors based on result
        const resultBgColor = voteSummary.yes > voteSummary.no ? '#f0fdf4' : voteSummary.no > voteSummary.yes ? '#fef2f2' : '#fefce8';
        const resultBorderColor = voteSummary.yes > voteSummary.no ? '#86efac' : voteSummary.no > voteSummary.yes ? '#fecaca' : '#fde047';
        const resultTextColor = voteSummary.yes > voteSummary.no ? '#166534' : voteSummary.no > voteSummary.yes ? '#991b1b' : '#854d0e';

        const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Stemming Afgerond</title>
    <!--[if mso]>
    <style type="text/css">
        table { border-collapse: collapse; }
        .fallback-font { font-family: Georgia, serif !important; }
    </style>
    <![endif]-->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3f0; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f3f0;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; margin: 0 auto;">
                    <!-- Decorative top border -->
                    <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, #5e4339 0%, #8b6f61 50%, #5e4339 100%);"></td>
                    </tr>
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #5e4339; padding: 48px 40px; text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <div style="font-size: 24px; letter-spacing: 8px; color: #c4a98a; margin-bottom: 16px;">✦ ✦ ✦</div>
                                        <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 600; color: #ffffff; letter-spacing: 1px;">Stemming Afgerond</h1>
                                        <div style="width: 60px; height: 2px; background-color: #c4a98a; margin: 20px auto;"></div>
                                        <p style="margin: 0; font-family: Georgia, serif; font-size: 16px; color: #d4c4b5; font-style: italic;">${question.groups.name}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Main content -->
                    <tr>
                        <td style="background-color: #fffdf9; padding: 48px 40px;">
                            <h2 style="margin: 0 0 16px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 600; color: #3d2c24; line-height: 1.3;">${question.title}</h2>
                            <p style="margin: 0 0 32px 0; font-family: Georgia, serif; font-size: 16px; color: #6b5c52; line-height: 1.7;">${question.description || 'Geen beschrijving opgegeven.'}</p>
                            <!-- Result banner -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                                <tr>
                                    <td style="background-color: ${resultBgColor}; border: 2px solid ${resultBorderColor}; border-radius: 8px; padding: 24px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #78716c;">Uitslag</p>
                                        <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: ${resultTextColor};">${resultText}</p>
                                    </td>
                                </tr>
                            </table>
                            <!-- Vote breakdown -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fafaf7; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 20px 24px; border-bottom: 1px solid #e8e4de;">
                                        <p style="margin: 0; font-family: Georgia, serif; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #78716c;">Stemverdeling</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 24px; border-bottom: 1px solid #e8e4de;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-family: Georgia, serif; font-size: 16px; color: #3d2c24;">
                                                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #dcfce7; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-size: 14px;">✓</span>
                                                    Akkoord
                                                </td>
                                                <td style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #166534; text-align: right;">${voteSummary.yes}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 24px; border-bottom: 1px solid #e8e4de;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-family: Georgia, serif; font-size: 16px; color: #3d2c24;">
                                                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #fee2e2; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-size: 14px;">✗</span>
                                                    Niet Akkoord
                                                </td>
                                                <td style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #991b1b; text-align: right;">${voteSummary.no}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 24px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="font-family: Georgia, serif; font-size: 16px; color: #3d2c24;">
                                                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #f5f5f4; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-size: 14px;">–</span>
                                                    Onthouding
                                                </td>
                                                <td style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; color: #78716c; text-align: right;">${voteSummary.abstain}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #3d2c24; padding: 32px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #c4a98a; letter-spacing: 1px;">Karthuizer</p>
                            <p style="margin: 0; font-family: Georgia, serif; font-size: 13px; color: #a39080; line-height: 1.6;">Dit is een automatisch bericht van het<br>Karthuizer Voting Platform.</p>
                        </td>
                    </tr>
                    <!-- Decorative bottom border -->
                    <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, #5e4339 0%, #8b6f61 50%, #5e4339 100%);"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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
                from: 'Karthuizer Voting <onboarding@resend.dev>',
                to: ['johanvh@gmail.com'], // TODO: change to 'emails' after verifying domain in Resend
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
