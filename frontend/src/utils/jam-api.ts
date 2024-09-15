import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
}

export interface ICollection {
    id: string;
    collection_name: string;
    companies: ICompany[];
    total: number;
}

export interface ICompanyBatchResponse {
    companies: ICompany[];
}

export interface AddCollectionToCollectionResponse {
    message: string;
    task_id: string;
}

export interface TaskInProgressResponse {
    task_id: string | null;
}

export interface LikeCompanyResponse {
    success: boolean;
    message: string;
}

export interface UnlikeCompanyResponse {
    success: boolean;
    message: string;
}

const BASE_URL = 'http://localhost:8000';

export async function getCompanies(offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/companies`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsById(id: string, offset?: number, limit?: number): Promise<ICollection> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${id}`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections`);
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function addCompaniesToCollection(companyIds: number[], collectionId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/user_actions/add-companies-to-collection`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_ids: companyIds,
            collection_id: collectionId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to add companies to collection');
    }
}

export async function removeCompaniesFromCollection(companyIds: number[], collectionId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/user_actions/remove-companies-from-collection`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_ids: companyIds,
            collection_id: collectionId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to remove companies from collection');
    }
}

export async function addCollectionToCollection(sourceCollectionId: string, targetCollectionId: string): Promise<AddCollectionToCollectionResponse> {
    const response = await fetch(`${BASE_URL}/user_actions/add-collection-to-collection`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source_collection_id: sourceCollectionId,
            target_collection_id: targetCollectionId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to add collection to collection');
    }
    const data: { message: string; task_id: string } = await response.json();
    return data;
}

export async function checkTaskInProgress(): Promise<TaskInProgressResponse> {
    const response = await fetch(`${BASE_URL}/user_actions/task_in_progress`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to check task in progress');
    }

    const data: TaskInProgressResponse = await response.json();
    return data;
}

export async function likeCompany(companyId: number): Promise<LikeCompanyResponse> {
    const response = await fetch(`${BASE_URL}/user_actions/like-company`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to like company');
    }
    const data: LikeCompanyResponse = await response.json();
    return data;
}

export async function unlikeCompany(companyId: number): Promise<UnlikeCompanyResponse> {
    const response = await fetch(`${BASE_URL}/user_actions/unlike-company`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to unlike company');
    }
    const data: UnlikeCompanyResponse = await response.json();
    return data;
}

