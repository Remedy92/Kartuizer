import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Edge Function to delete a user from auth.users.
 * This requires service role permissions, so it must be done server-side.
 * Only admins can call this function.
 */
Deno.serve(async (req) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Geen autorisatie header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's JWT to verify they're an admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the caller is authenticated
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Niet geauthenticeerd' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profiel niet gevonden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Geen beheerder rechten' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID to delete from the request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is verplicht' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Je kunt jezelf niet verwijderen' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role to delete the user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete the user from auth.users (this cascades to user_profiles due to FK constraint)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message || 'Gebruiker verwijderen mislukt' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error in delete-user:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Onverwachte fout' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
