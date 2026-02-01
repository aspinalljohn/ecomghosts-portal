// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================

const SUPABASE_URL = 'https://yeygsgawigxbuomnzhdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlleWdzZ2F3aWd4YnVvbW56aGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MjA1MTksImV4cCI6MjA4NTQ5NjUxOX0.EWjksbhzn0BcU1ViHAlvXH_hTpGUmbRbTtC0889HEt4';

// Initialize Supabase client
// The CDN exposes the library at window.supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

async function signUp(email, password, fullName, role = 'user') {
    try {
        // Create auth user
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        // Create user record in users table
        const { error: userError } = await supabaseClient
            .from('users')
            .insert([{
                id: authData.user.id,
                email: email,
                full_name: fullName,
                role: role
            }]);

        if (userError) throw userError;

        return { success: true, user: authData.user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Get user details from users table
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (userError) throw userError;

        return { success: true, user: data.user, userData: userData };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

async function getCurrentUser() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        // Get user details from users table
        const { data: userData, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        return { ...user, ...userData };
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
}

// ============================================================================
// USER MANAGEMENT HELPERS
// ============================================================================

async function getAllUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, users: data };
    } catch (error) {
        console.error('Get all users error:', error);
        return { success: false, error: error.message };
    }
}

async function updateUser(userId, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, user: data };
    } catch (error) {
        console.error('Update user error:', error);
        return { success: false, error: error.message };
    }
}

async function deleteUser(userId) {
    try {
        const { error } = await supabaseClient
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete user error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CLIENT HELPERS
// ============================================================================

async function createClient(name, startDate = null) {
    try {
        const { data, error } = await supabaseClient
            .from('clients')
            .insert([{
                name: name,
                start_date: startDate
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, client: data };
    } catch (error) {
        console.error('Create client error:', error);
        return { success: false, error: error.message };
    }
}

async function getAllClients() {
    try {
        const { data, error } = await supabaseClient
            .from('clients')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, clients: data };
    } catch (error) {
        console.error('Get all clients error:', error);
        return { success: false, error: error.message };
    }
}

async function getClientById(clientId) {
    try {
        const { data, error } = await supabaseClient
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (error) throw error;
        return { success: true, client: data };
    } catch (error) {
        console.error('Get client error:', error);
        return { success: false, error: error.message };
    }
}

async function updateClient(clientId, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('clients')
            .update(updates)
            .eq('id', clientId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, client: data };
    } catch (error) {
        console.error('Update client error:', error);
        return { success: false, error: error.message };
    }
}

async function deleteClient(clientId) {
    try {
        const { error } = await supabaseClient
            .from('clients')
            .delete()
            .eq('id', clientId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete client error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// CLIENT ACCESS HELPERS
// ============================================================================

async function assignClientToUser(userId, clientId) {
    try {
        const { data, error } = await supabaseClient
            .from('user_client_access')
            .insert([{
                user_id: userId,
                client_id: clientId
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Assign client error:', error);
        return { success: false, error: error.message };
    }
}

async function removeClientFromUser(userId, clientId) {
    try {
        const { error } = await supabaseClient
            .from('user_client_access')
            .delete()
            .eq('user_id', userId)
            .eq('client_id', clientId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Remove client access error:', error);
        return { success: false, error: error.message };
    }
}

async function getUserClients(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('user_client_access')
            .select('client_id, clients(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, clients: data.map(item => item.clients) };
    } catch (error) {
        console.error('Get user clients error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// DATA HELPERS
// ============================================================================

async function saveEngagementData(clientId, engagementArray) {
    try {
        const records = engagementArray.map(item => ({
            client_id: clientId,
            date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date,
            impressions: item.impressions || 0,
            engagements: item.engagements || 0
        }));

        const { error } = await supabaseClient
            .from('engagement_data')
            .upsert(records, { onConflict: 'client_id,date' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Save engagement data error:', error);
        return { success: false, error: error.message };
    }
}

async function getEngagementData(clientId) {
    try {
        const { data, error } = await supabaseClient
            .from('engagement_data')
            .select('*')
            .eq('client_id', clientId)
            .order('date', { ascending: true });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Get engagement data error:', error);
        return { success: false, error: error.message };
    }
}

async function saveFollowersData(clientId, followersArray) {
    try {
        const records = followersArray.map(item => ({
            client_id: clientId,
            date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date,
            new_followers: item.newFollowers || 0
        }));

        const { error } = await supabaseClient
            .from('followers_data')
            .upsert(records, { onConflict: 'client_id,date' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Save followers data error:', error);
        return { success: false, error: error.message };
    }
}

async function getFollowersData(clientId) {
    try {
        const { data, error } = await supabaseClient
            .from('followers_data')
            .select('*')
            .eq('client_id', clientId)
            .order('date', { ascending: true });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Get followers data error:', error);
        return { success: false, error: error.message };
    }
}

async function saveTopPosts(clientId, postsArray) {
    try {
        // Delete existing posts for this client
        await supabaseClient
            .from('top_posts')
            .delete()
            .eq('client_id', clientId);

        // Insert new posts
        const records = postsArray.map(post => ({
            client_id: clientId,
            url: post.url,
            post_date: post.date instanceof Date ? post.date.toISOString().split('T')[0] : post.date,
            engagements: post.engagements || 0,
            impressions: post.impressions || 0
        }));

        const { error } = await supabaseClient
            .from('top_posts')
            .insert(records);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Save top posts error:', error);
        return { success: false, error: error.message };
    }
}

async function getTopPosts(clientId) {
    try {
        const { data, error } = await supabaseClient
            .from('top_posts')
            .select('*')
            .eq('client_id', clientId)
            .order('engagements', { ascending: false });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Get top posts error:', error);
        return { success: false, error: error.message };
    }
}

async function saveDemographicsData(clientId, demographicsArray) {
    try {
        // Delete existing demographics for this client
        await supabaseClient
            .from('demographics_data')
            .delete()
            .eq('client_id', clientId);

        // Insert new demographics
        const records = demographicsArray.map(item => ({
            client_id: clientId,
            job_title: item.jobTitle,
            percentage: item.percentage
        }));

        const { error } = await supabaseClient
            .from('demographics_data')
            .insert(records);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Save demographics data error:', error);
        return { success: false, error: error.message };
    }
}

async function getDemographicsData(clientId) {
    try {
        const { data, error } = await supabaseClient
            .from('demographics_data')
            .select('*')
            .eq('client_id', clientId)
            .order('percentage', { ascending: false });

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Get demographics data error:', error);
        return { success: false, error: error.message };
    }
}
