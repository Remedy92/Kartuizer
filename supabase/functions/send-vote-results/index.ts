import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface Vote {
    vote: string | null;
    user_id: string;
    poll_option_id: string | null;
}

interface PollOption {
    id: string;
    label: string;
    sort_order: number;
}

interface VoteComment {
    comment: string;
    user_id: string;
    created_at: string;
    user_profiles?: { display_name: string | null; email: string } | null;
}

interface Question {
    id: string;
    title: string;
    description: string | null;
    question_type: 'standard' | 'poll';
    winning_option_id: string | null;
    group_id: string;
    completion_method: 'all_votes' | 'threshold' | 'manual' | null;
    groups: { name: string; required_votes?: number };
    votes: Vote[];
    poll_options: PollOption[];
    vote_comments?: VoteComment[];
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatResultText(question: Question): string {
    if (question.question_type === 'poll') {
        const voteCounts = new Map<string, number>();
        for (const vote of question.votes ?? []) {
            if (vote.poll_option_id) {
                voteCounts.set(vote.poll_option_id, (voteCounts.get(vote.poll_option_id) || 0) + 1);
            }
        }

        const sorted = [...(question.poll_options ?? [])]
            .map((o) => ({ ...o, votes: voteCounts.get(o.id) || 0 }))
            .sort((a, b) => b.votes - a.votes);

        const winner = sorted[0];
        return winner && winner.votes > 0 ? `🏆 ${winner.label}` : 'Poll Afgerond';
    }

    const summary = (question.votes ?? []).reduce((acc: Record<string, number>, v) => {
        if (v.vote === 'yes' || v.vote === 'no' || v.vote === 'abstain') {
            acc[v.vote] = (acc[v.vote] || 0) + 1;
        }
        return acc;
    }, { yes: 0, no: 0, abstain: 0 });

    const totalVotes = summary.yes + summary.no + summary.abstain;
    const requiredVotes = question.groups?.required_votes;
    if (
        typeof requiredVotes === 'number' &&
        requiredVotes > 0 &&
        totalVotes < requiredVotes &&
        question.completion_method !== 'threshold'
    ) {
        return '⚖️ Onbeslist (te weinig stemmen)';
    }

    if (summary.yes > summary.no) return '✅ Goedgekeurd';
    if (summary.no > summary.yes) return '❌ Afgewezen';
    return 'Geen meerderheid';
}

function renderComments(comments?: VoteComment[]): string {
    const cleaned = (comments ?? [])
        .filter((c) => Boolean(c?.comment?.trim()))
        .map((c) => ({
            name: c.user_profiles?.display_name || c.user_profiles?.email || c.user_id,
            created_at: c.created_at,
            comment: c.comment.trim(),
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (cleaned.length === 0) return '';

    const items = cleaned.map((c) => {
        return `
          <div style="padding: 12px 14px; border: 1px solid #e7e5e4; border-radius: 10px; background: #fafaf9;">
            <div style="font-weight: 600; color: #292524; margin-bottom: 6px;">${escapeHtml(c.name)}</div>
            <div style="white-space: pre-wrap; color: #44403c; line-height: 1.6;">${escapeHtml(c.comment)}</div>
          </div>
        `;
    }).join('');

    return `
      <h3 style="margin: 28px 0 12px; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #78716c;">Commentaar</h3>
      <div style="display: grid; gap: 10px;">
        ${items}
      </div>
    `;
}

function renderStandardResults(question: Question): string {
    const summary = (question.votes ?? []).reduce((acc: Record<string, number>, v) => {
        if (v.vote === 'yes' || v.vote === 'no' || v.vote === 'abstain') {
            acc[v.vote] = (acc[v.vote] || 0) + 1;
        }
        return acc;
    }, { yes: 0, no: 0, abstain: 0 });

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; background: #fafaf9;">
        <tr>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e7e5e4;">
            <div style="font-size: 14px; font-weight: 700; color: #292524;">Stemverdeling</div>
          </td>
        </tr>
        <tr><td style="padding: 14px 16px;"><b>Akkoord:</b> ${summary.yes}</td></tr>
        <tr><td style="padding: 0 16px 14px;"><b>Niet akkoord:</b> ${summary.no}</td></tr>
        <tr><td style="padding: 0 16px 14px;"><b>Onthouding:</b> ${summary.abstain}</td></tr>
      </table>
    `;
}

function renderPollResults(question: Question): string {
    const voteCounts = new Map<string, number>();
    const uniqueVoters = new Set<string>();

    for (const vote of question.votes ?? []) {
        if (vote.poll_option_id) {
            voteCounts.set(vote.poll_option_id, (voteCounts.get(vote.poll_option_id) || 0) + 1);
            uniqueVoters.add(vote.user_id);
        }
    }

    const totalVotes = (question.votes ?? []).filter((v) => v.poll_option_id).length;
    const sortedOptions = [...(question.poll_options ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((opt) => {
            const votes = voteCounts.get(opt.id) || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            return { ...opt, votes, percentage };
        })
        .sort((a, b) => b.votes - a.votes);

    const rows = sortedOptions.map((o) => {
        const bar = o.percentage > 0 ? `<div style="height: 8px; background: #e7e5e4; border-radius: 999px; overflow: hidden;"><div style="width: ${o.percentage}%; height: 100%; background: #78716c;"></div></div>` : '';
        return `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e7e5e4;">
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <div style="font-weight: 600; color: #292524;">${escapeHtml(o.label)}</div>
                <div style="color: #78716c;">${o.votes} · ${o.percentage}%</div>
              </div>
              <div style="margin-top: 8px;">${bar}</div>
            </td>
          </tr>
        `;
    }).join('');

    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; background: #fafaf9;">
        <tr>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e7e5e4;">
            <div style="font-size: 14px; font-weight: 700; color: #292524;">Resultaten</div>
          </td>
        </tr>
        ${rows || `<tr><td style="padding: 14px 16px;">Geen stemmen.</td></tr>`}
      </table>
      <div style="margin-top: 10px; font-size: 13px; color: #78716c; text-align: center;">
        ${uniqueVoters.size} ${uniqueVoters.size === 1 ? 'persoon heeft' : 'personen hebben'} gestemd
      </div>
    `;
}

function renderEmail(question: Question, resultText: string): string {
    const title = escapeHtml(question.title ?? '');
    const groupName = escapeHtml(question.groups?.name ?? '');
    const description = escapeHtml(question.description ?? 'Geen beschrijving opgegeven.');

    const results =
        question.question_type === 'poll'
            ? renderPollResults(question)
            : renderStandardResults(question);

    const comments = renderComments(question.vote_comments);

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stemming afgerond</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f4; font-family: ui-serif, Georgia, 'Times New Roman', serif;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
      <div style="background:#ffffff; border:1px solid #e7e5e4; border-radius: 16px; overflow:hidden;">
        <div style="padding: 22px 20px; background:#292524; color:#ffffff;">
          <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color:#d6d3d1;">${groupName}</div>
          <div style="margin-top: 8px; font-size: 22px; font-weight: 700; line-height: 1.25;">${title}</div>
          <div style="margin-top: 10px; display:inline-block; padding: 8px 12px; border-radius: 999px; background:#44403c; font-size: 14px;">
            ${escapeHtml(resultText)}
          </div>
        </div>

        <div style="padding: 22px 20px;">
          <div style="color:#44403c; line-height: 1.7; white-space: pre-wrap;">${description}</div>
          <div style="margin-top: 18px;">${results}</div>
          ${comments}
        </div>

        <div style="padding: 18px 20px; background:#fafaf9; border-top:1px solid #e7e5e4; color:#78716c; font-size: 12px; text-align:center;">
          Dit is een automatisch bericht van het Karthuizer Voting Platform.
        </div>
      </div>
    </div>
  </body>
</html>
    `;
}

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const record = payload?.record;

        if (!record || record.status !== 'completed') {
            return new Response(JSON.stringify({ message: 'Not completed' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
        if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');

        const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
        if (!supabaseKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY');

        const canReadComments = Boolean(SUPABASE_SERVICE_ROLE_KEY);
        const supabase = createClient(SUPABASE_URL, supabaseKey);

        const baseSelect = 'id, title, description, question_type, winning_option_id, group_id, completion_method, groups(name, required_votes), votes(vote, user_id, poll_option_id), poll_options!question_id(id, label, sort_order)';
        const select = canReadComments
            ? `${baseSelect}, vote_comments!question_id(comment, user_id, created_at, user_profiles(display_name, email))`
            : baseSelect;

        const { data: question, error: qError } = await supabase
            .from('questions')
            .select(select)
            .eq('id', record.id)
            .single();

        if (qError || !question) throw qError || new Error('Question not found');
        const q = question as Question;

        const { data: members, error: mError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', q.group_id);
        if (mError) throw mError;

        const memberIds = members?.map(m => m.user_id) || [];
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('email')
            .in('id', memberIds);
        const emails = profiles?.map(p => p.email).filter(Boolean) || [];

        const resultText = formatResultText(q);
        const html = renderEmail(q, resultText);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Karthuizer Voting <onboarding@resend.dev>',
                // TODO: change to `emails` after verifying domain in Resend
                to: ['RaadKarthuizer@gmail.com'],
                subject: `${resultText} - ${q.title}`,
                html,
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Resend API error (${res.status}): ${errorText}`);
        }

        const resData = await res.json();
        return new Response(JSON.stringify({
            status: 'sent',
            canReadComments,
            emailsFound: emails.length,
            result: resultText,
            response: resData,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('Error sending vote results:', err);
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
