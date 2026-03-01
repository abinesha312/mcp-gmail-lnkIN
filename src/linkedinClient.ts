import { Client } from 'linkedin-private-api';
import { getCredential } from './credentialStore.js';

let clientInstance: any = null;

async function getClient(forceReauth: boolean = false): Promise<any> {
    if (clientInstance && !forceReauth) return clientInstance;

    const email = getCredential("linkedin", "email");
    const password = getCredential("linkedin", "password");

    if (!email || !password) {
        throw new Error(
            'LinkedIn not configured. Open the dashboard → LinkedIn → Configure and add your email and password.'
        );
    }

    try {
        const client = new Client();
        await client.login.userPass({ username: email, password: password });
        clientInstance = client;
        return clientInstance;
    } catch (error: any) {
        clientInstance = null; // Clear cached instance on auth failure
        const errorMsg = error.message || error.toString() || '';
        
        // Provide specific error messages based on the error type
        if (errorMsg.includes('401') || errorMsg.includes('unauthorized') || errorMsg.includes('authentication')) {
            throw new Error(
                'LinkedIn authentication failed. Possible causes:\n' +
                '1. Incorrect email or password - verify in dashboard\n' +
                '2. Two-Factor Authentication (2FA) is enabled - disable 2FA temporarily or use app password\n' +
                '3. LinkedIn blocked the login - check LinkedIn for security alerts\n' +
                '4. Account verification required - complete any pending verification steps\n\n' +
                'Solution: Go to dashboard → LinkedIn → Update credentials, or disable 2FA temporarily.'
            );
        }
        
        if (errorMsg.includes('challenge') || errorMsg.includes('verification') || errorMsg.includes('captcha')) {
            throw new Error(
                'LinkedIn requires additional verification (CAPTCHA/challenge). ' +
                'Please log into LinkedIn in a browser first to complete verification, then try again.'
            );
        }
        
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many') || errorMsg.includes('429')) {
            throw new Error(
                'LinkedIn rate limit exceeded during login. Please wait 5-10 minutes before trying again.'
            );
        }
        
        throw new Error(`LinkedIn login failed: ${errorMsg}`);
    }
}

// Helper to handle 401 errors and retry with re-authentication, and 429 rate limit errors
async function handleLinkedInRequest<T>(requestFn: () => Promise<T>, retries: number = 1): Promise<T> {
    try {
        return await requestFn();
    } catch (error: any) {
        const errorMessage = error.message || error.toString() || '';
        // Check status code from multiple possible locations (including nested errors)
        const statusCode = error.response?.status || 
                          error.status || 
                          error.statusCode ||
                          error.originalError?.response?.status ||
                          error.originalError?.status ||
                          (errorMessage.match(/status code (\d+)/i)?.[1] ? parseInt(errorMessage.match(/status code (\d+)/i)?.[1]!) : null);
        
        // Check for 429 Rate Limit errors (check multiple patterns)
        const isRateLimit = statusCode === 429 || 
                           errorMessage.includes('429') || 
                           errorMessage.includes('rate limit') || 
                           errorMessage.includes('too many requests') ||
                           errorMessage.includes('Rate limit') ||
                           errorMessage.toLowerCase().includes('throttle');
        
        if (isRateLimit) {
            if (retries > 0) {
                // Wait with exponential backoff: 5s, 10s, 20s
                const waitTime = Math.min(5000 * Math.pow(2, retries - 1), 20000);
                console.log(`[LinkedIn] Rate limit hit (429), waiting ${waitTime/1000}s before retry (${retries} retries remaining)...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return handleLinkedInRequest(requestFn, retries - 1);
            }
            throw new Error(
                'LinkedIn rate limit exceeded (429). LinkedIn has temporarily blocked requests due to too many API calls.\n\n' +
                'Solutions:\n' +
                '1. Wait 5-10 minutes before trying again\n' +
                '2. Reduce the frequency of requests\n' +
                '3. Use smaller limit values (e.g., limit: 3 instead of 10)\n' +
                '4. Spread out requests over time\n' +
                '5. The app will automatically retry once with a delay'
            );
        }
        
        // Check for 401 Unauthorized errors
        if (statusCode === 401 || errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
            // Clear cached client and try to re-authenticate
            clientInstance = null;
            try {
                await getClient(true); // Force re-authentication
                // Retry the request once
                return await requestFn();
            } catch (reauthError: any) {
                throw new Error(
                    `LinkedIn session expired and re-authentication failed: ${reauthError.message}. ` +
                    'Please verify your LinkedIn credentials in the dashboard and try again.'
                );
            }
        }
        throw error;
    }
}

export async function getFeedPosts(limit: number = 10, offset: number = 0): Promise<string> {
    return handleLinkedInRequest(async () => {
        try {
            const client = await getClient();

            let allPosts: any[] = [];

            if (typeof client.feed?.newsFeed === 'function') {
                const feedScroller = client.feed.newsFeed();
                let scrollCount = 0;
                const targetCount = limit + offset;

                while (allPosts.length < targetCount && scrollCount < 10) {
                    const batch = await feedScroller.scrollNext();
                    if (!batch || batch.length === 0) break;
                    allPosts.push(...batch);
                    scrollCount++;
                }
            } else if (typeof client.request?.get === 'function') {
                const response = await client.request.get('feed/updatesV2', {
                    searchParams: {
                        count: limit,
                        start: offset,
                    },
                });
                allPosts = response?.elements || response?.data?.elements || [];
            } else {
                return 'Error: LinkedIn feed API not available. Please check your linkedin-private-api version.';
            }

            const posts = allPosts.slice(offset, offset + limit);

            if (posts.length === 0) return 'No feed posts found.';

            let result = '';
            for (const post of posts) {
                const authorName =
                    post.actorName ||
                    post.actor?.name?.text ||
                    post.actor?.description?.text ||
                    'Unknown';
                const content =
                    post.commentary?.text?.text ||
                    post.commentary ||
                    post.text ||
                    'No content';
                result += `Post by ${authorName}: ${content}\n`;
            }

            return result;
        } catch (error: any) {
            // Preserve original error for rate limit detection
            const newError: any = new Error(`Error retrieving feed posts: ${error.message}`);
            newError.originalError = error;
            newError.response = error.response;
            newError.status = error.status || error.response?.status;
            throw newError;
        }
    });
}

export async function searchJobs(
    keywords: string,
    limit: number = 3,
    offset: number = 0,
    location: string = ''
): Promise<string> {
    return handleLinkedInRequest(async () => {
        try {
            const client = await getClient();

            let allJobs: any[] = [];

            const searchParams: any = {
                keywords,
                limit,
                skip: offset,
            };

            if (location) {
                searchParams.location = location;
            }

            if (typeof client.search?.searchJobs === 'function') {
                const jobScroller = client.search.searchJobs(searchParams);
                let scrollCount = 0;
                const targetCount = limit + offset;

                while (allJobs.length < targetCount && scrollCount < 5) {
                    const batch = await jobScroller.scrollNext();
                    if (!batch || batch.length === 0) break;
                    allJobs.push(...batch);
                    scrollCount++;
                }
            } else if (typeof client.request?.get === 'function') {
                const reqParams: any = {
                    keywords,
                    count: limit,
                    start: offset,
                    q: 'jobs',
                };
                if (location) reqParams.locationName = location;

                const response = await client.request.get('search/hits', {
                    searchParams: reqParams,
                });
                allJobs = response?.elements || response?.data?.elements || [];
            } else {
                return 'Error: LinkedIn jobs API not available. Please check your linkedin-private-api version.';
            }

            const jobs = allJobs.slice(offset, offset + limit);

            if (jobs.length === 0) return 'No jobs found.';

            let jobResults = '';
            for (const job of jobs) {
                const jobTitle = job.title || 'Unknown Title';
                const companyName = job.companyName || job.company?.name || 'Unknown Company';
                const jobLocation = job.formattedLocation || location || 'Unknown Location';
                const jobDescription = job.description?.text || job.description || 'No description available';

                jobResults += `Job: ${jobTitle} at ${companyName} in ${jobLocation}: ${jobDescription}\n\n`;
            }

            return jobResults;
        } catch (error: any) {
            // Preserve original error for rate limit detection
            const newError: any = new Error(`Error searching jobs: ${error.message}`);
            newError.originalError = error;
            newError.response = error.response;
            newError.status = error.status || error.response?.status;
            throw newError;
        }
    });
}

export async function searchPeople(
    keywords: string,
    limit: number = 3,
    offset: number = 0
): Promise<string> {
    return handleLinkedInRequest(async () => {
        try {
            const client = await getClient();

            let allPeople: any[] = [];

            const searchParams: any = {
                keywords,
                limit,
                skip: offset,
            };

            if (typeof client.search?.searchPeople === 'function') {
                const peopleScroller = client.search.searchPeople(searchParams);
                let scrollCount = 0;
                const targetCount = limit + offset;

                while (allPeople.length < targetCount && scrollCount < 5) {
                    const batch = await peopleScroller.scrollNext();
                    if (!batch || batch.length === 0) break;
                    allPeople.push(...batch);
                    scrollCount++;
                }
            } else if (typeof client.request?.get === 'function') {
                const reqParams: any = {
                    keywords,
                    count: limit,
                    start: offset,
                    q: 'people',
                };

                const response = await client.request.get('search/hits', {
                    searchParams: reqParams,
                });
                allPeople = response?.elements || response?.data?.elements || [];
            } else {
                return 'Error: LinkedIn people search API not available. Please check your linkedin-private-api version.';
            }

            const people = allPeople.slice(offset, offset + limit);

            if (people.length === 0) return 'No people found.';

            let peopleResults = '';
            for (const person of people) {
                const name = person.name || person.firstName + ' ' + person.lastName || 'Unknown Name';
                const headline = person.headline || person.professionalHeadline || 'No headline';
                const location = person.location || person.geoLocationName || 'Unknown Location';
                const profileUrl = person.profileUrl || person.publicIdentifier || 'No profile URL';

                peopleResults += `${name} - ${headline} (${location}): ${profileUrl}\n\n`;
            }

            return peopleResults;
        } catch (error: any) {
            // Preserve original error for rate limit detection
            const newError: any = new Error(`Error searching people: ${error.message}`);
            newError.originalError = error;
            newError.response = error.response;
            newError.status = error.status || error.response?.status;
            throw newError;
        }
    });
}

export async function getProfile(args?: { publicId?: string }): Promise<any> {
    return handleLinkedInRequest(async () => {
        try {
            const client = await getClient();

            if (args?.publicId) {
                // Get a specific profile by public ID
                if (typeof client.profile?.getProfile === 'function') {
                    const profile = await client.profile.getProfile({ publicId: args.publicId });
                    return {
                        name: profile.firstName + ' ' + profile.lastName,
                        headline: profile.headline,
                        location: profile.location,
                        summary: profile.summary,
                        experience: profile.experiences,
                        education: profile.educations,
                        skills: profile.skills,
                        profileUrl: profile.profileUrl,
                    };
                } else if (typeof client.request?.get === 'function') {
                    const response = await client.request.get(`identity/profiles/${args.publicId}/profileView`, {});
                    const profile = response?.data || response;
                    return {
                        name: profile.firstName + ' ' + profile.lastName,
                        headline: profile.headline,
                        location: profile.location,
                        summary: profile.summary,
                        profileUrl: profile.profileUrl,
                    };
                } else {
                    throw new Error('LinkedIn profile API not available');
                }
            } else {
                // Get own profile
                if (typeof client.profile?.getOwnProfile === 'function') {
                    const profile = await client.profile.getOwnProfile();
                    return {
                        name: profile.firstName + ' ' + profile.lastName,
                        headline: profile.headline,
                        location: profile.location,
                        summary: profile.summary,
                        experience: profile.experiences,
                        education: profile.educations,
                        skills: profile.skills,
                        profileUrl: profile.profileUrl,
                    };
                } else if (typeof client.profile?.getProfile === 'function') {
                    // Try to get own profile using the client's user ID
                    const profile = await client.profile.getProfile({ publicId: 'me' });
                    return {
                        name: profile.firstName + ' ' + profile.lastName,
                        headline: profile.headline,
                        location: profile.location,
                        summary: profile.summary,
                        experience: profile.experiences,
                        education: profile.educations,
                        skills: profile.skills,
                        profileUrl: profile.profileUrl,
                    };
                } else if (typeof client.request?.get === 'function') {
                    const response = await client.request.get('identity/profiles/me/profileView', {});
                    const profile = response?.data || response;
                    return {
                        name: profile.firstName + ' ' + profile.lastName,
                        headline: profile.headline,
                        location: profile.location,
                        summary: profile.summary,
                        profileUrl: profile.profileUrl,
                    };
                } else {
                    // Fallback: return basic info from the client
                    return {
                        message: 'Profile API not fully available. Please check your linkedin-private-api version.',
                        note: 'Try using searchPeople to find profiles instead.',
                    };
                }
            }
        } catch (error: any) {
            // Preserve original error for rate limit detection
            const newError: any = new Error(`Error getting profile: ${error.message}`);
            newError.originalError = error;
            newError.response = error.response;
            newError.status = error.status || error.response?.status;
            throw newError;
        }
    });
}