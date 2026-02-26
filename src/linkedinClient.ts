import { Client } from 'linkedin-private-api';

let clientInstance: any = null;

async function getClient(): Promise<any> {
    if (clientInstance) return clientInstance;

    const email = process.env.LINKEDIN_EMAIL;
    const password = process.env.LINKEDIN_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables are required. ' +
            'Set them in your MCP server configuration.'
        );
    }

    const client = new Client();
    await client.login.userPass({ username: email, password: password });
    clientInstance = client;

    return clientInstance;
}

export async function getFeedPosts(limit: number = 10, offset: number = 0): Promise<string> {
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
        return `Error retrieving feed posts: ${error.message}`;
    }
}

export async function searchJobs(
    keywords: string,
    limit: number = 3,
    offset: number = 0,
    location: string = ''
): Promise<string> {
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
        return `Error searching jobs: ${error.message}`;
    }
}
